#!/usr/bin/env python3
"""Materialize policy-only controller deltas + pinned guest transactions locally."""

import argparse
import ast
import base64
import hashlib
import io
import json
from pathlib import Path
import sys
import tokenize


ROOT = Path(__file__).resolve().parent
ENGINE = ROOT.parents[2] / "eturkes.com/ops/prompt-history-agent-update.py"
ENGINE_SHA256 = "a3d204e5d0be0139fa75004db63747d6a30edeff1a442ced4448c0449c0b6b19"
VMS = ("nanoha", "naoto", "rehab")


def digest(value):
    return hashlib.sha256(value).hexdigest()


def json_bytes(value):
    return (json.dumps(value, sort_keys=True, indent=2) + "\n").encode()


def names(vm):
    if vm not in VMS:
        raise ValueError(f"unknown VM: {vm}")
    return {
        "CHAT_PROJECT_INSTRUCTIONS",
        "WORKSPACE_INSTRUCTIONS_SHA256" if vm == "rehab" else "PROJECT_INSTRUCTIONS",
    }


def parse_controller(source):
    encoding, _ = tokenize.detect_encoding(io.BytesIO(source).readline)
    if encoding not in ("utf-8", "utf-8-sig"):
        raise ValueError("controller source must use UTF-8")
    return ast.parse(source)


def bindings(tree, allowed):
    found = {}
    for node in tree.body:
        if isinstance(node, ast.Assign):
            targets = node.targets
        elif isinstance(node, ast.AnnAssign):
            targets = [node.target]
        else:
            continue
        for target in targets:
            if not isinstance(target, ast.Name) or target.id not in allowed:
                continue
            if len(targets) != 1 or target.id in found:
                raise ValueError(f"ambiguous policy assignment: {target.id}")
            if not isinstance(node.value, ast.Constant) or not isinstance(node.value.value, str):
                raise ValueError(f"policy assignment must be a literal string: {target.id}")
            found[target.id] = node
    if set(found) != allowed:
        raise ValueError(f"missing policy assignments: {sorted(allowed - found.keys())}")
    return found


def validate_delta(vm, before, after):
    trees = [parse_controller(source) for source in (before, after)]
    for tree in trees:
        for node in bindings(tree, names(vm)).values():
            node.value = ast.Constant(value=None)
    if ast.dump(trees[0]) != ast.dump(trees[1]):
        raise ValueError("controller changed outside policy assignment values")
    compile(after, "controller.py", "exec")


def patch_controller(vm, source, project, chat):
    project_text, chat_text = project.decode("utf-8"), chat.decode("utf-8")
    values = {"CHAT_PROJECT_INSTRUCTIONS": chat_text}
    values["WORKSPACE_INSTRUCTIONS_SHA256" if vm == "rehab" else "PROJECT_INSTRUCTIONS"] = (
        digest(project) if vm == "rehab" else project_text
    )
    assignments = bindings(parse_controller(source), names(vm))
    offsets = [0]
    for line in source.splitlines(keepends=True):
        offsets.append(offsets[-1] + len(line))
    edits = []
    for name, node in assignments.items():
        value = node.value
        bom = 3 if source.startswith(b"\xef\xbb\xbf") else 0
        start = offsets[value.lineno - 1] + value.col_offset + (bom if value.lineno == 1 else 0)
        end = offsets[value.end_lineno - 1] + value.end_col_offset + (bom if value.end_lineno == 1 else 0)
        edits.append((start, end, repr(values[name]).encode("utf-8")))
    candidate = source
    for start, end, replacement in sorted(edits, reverse=True):
        candidate = candidate[:start] + replacement + candidate[end:]
    validate_delta(vm, source, candidate)
    actual = bindings(parse_controller(candidate), names(vm))
    if {name: node.value.value for name, node in actual.items()} != values:
        raise ValueError("materialized policy string differs")
    return candidate


def build_stage(vm, controller, project, chat, engine, workspace=None):
    names(vm)
    if digest(engine) != ENGINE_SHA256:
        raise ValueError("legacy transaction engine digest differs")
    if (vm == "rehab") != (workspace is not None):
        raise ValueError("Rehab alone requires a baseline workspace policy")
    before = {"orchestrator": controller}
    after = {"orchestrator": patch_controller(vm, controller, project, chat)}
    artifacts = {"controller.py": after["orchestrator"]}
    if vm == "rehab":
        before["workspace-instructions"] = workspace
        after["workspace-instructions"] = project
        artifacts["workspace-AGENTS.md"] = project
    if before == after:
        raise ValueError("transaction has no changed files")

    tree = ast.parse(engine)
    targets = next(node.value for node in tree.body if isinstance(node, ast.AnnAssign)
                   and isinstance(node.target, ast.Name) and node.target.id == "TARGETS")
    target = next(value for key, value in zip(targets.keys, targets.values)
                  if ast.literal_eval(key) == vm)
    file_nodes = next(item.value.elts for item in target.keywords if item.arg == "files")
    files = [{field.arg: ast.literal_eval(field.value) for field in node.keywords} for node in file_nodes]
    if {item["label"] for item in files} != set(before):
        raise ValueError("legacy managed-file inventory differs")
    for item in files:
        item.update(preimage=digest(before[item["label"]]), postimage=digest(after[item["label"]]))
    manifest = {"schema": 1, "target": vm, "engine_sha256": ENGINE_SHA256, "files": files}
    transaction_id = "agent-policy-" + digest(json_bytes(manifest))
    hashes = {item["label"]: (item["preimage"], item["postimage"]) for item in files}
    payload = base64.b64encode(json_bytes({
        "target": vm,
        "files": {label: base64.b64encode(value).decode("ascii") for label, value in after.items()},
    })).decode("ascii")

    # Replace only the legacy main guard; every engine definition stays byte-identical.
    guard = tree.body[-1]
    prefix = b"".join(engine.splitlines(keepends=True)[:guard.lineno - 1])
    wrapper = f'''TRANSACTION_ID = {transaction_id!r}
EMBEDDED_PAYLOAD_B64 = {payload!r}
_POLICY_HASHES = {hashes!r}
TARGETS = {{{vm!r}: dataclasses.replace(
    TARGETS[{vm!r}], files=tuple(dataclasses.replace(
        item, preimage=_POLICY_HASHES[item.label][0], postimage=_POLICY_HASHES[item.label][1]
    ) for item in TARGETS[{vm!r}].files)
)}}

if __name__ == "__main__":
    if (len(sys.argv) != 3 or sys.argv[2] != {vm!r}
            or sys.argv[1] not in ("--guest-check", "--guest-install", "--guest-recover")):
        raise SystemExit("usage: guest-update.py --guest-{{check,install,recover}} {vm}")
    try:
        guest_main(sys.argv[1], TARGETS[{vm!r}])
    except (OSError, ValueError, subprocess.SubprocessError, UpdateError) as error:
        print(f"runtime-policy: {{error}}", file=sys.stderr)
        raise SystemExit(1)
'''
    artifacts["guest-update.py"] = prefix + wrapper.encode("utf-8")
    compile(artifacts["guest-update.py"], "guest-update.py", "exec")
    manifest.update(transaction_id=transaction_id,
                    artifacts={name: digest(value) for name, value in artifacts.items()})
    artifacts["manifest.json"] = json_bytes(manifest)
    return artifacts


def read_verified(path, expected):
    value = path.read_bytes()
    if expected is not None and digest(value) != expected:
        raise ValueError(f"baseline digest differs: {path}")
    return value


def write_outputs(output, artifacts):
    if output.is_symlink():
        raise ValueError(f"staging directory is a symlink: {output}")
    output.mkdir(mode=0o700, parents=True, exist_ok=True)
    for name, value in artifacts.items():
        path = output / name
        if path.is_symlink() or (path.exists() and (not path.is_file() or path.read_bytes() != value)):
            raise ValueError(f"staged output differs: {path}")
    for name, value in artifacts.items():
        path = output / name
        if not path.exists():
            with path.open("xb") as stream:
                stream.write(value)


def main(arguments=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("stage", "source", "check-source"))
    parser.add_argument("vm", choices=VMS)
    parser.add_argument("--controller", required=True, type=Path)
    parser.add_argument("--before-sha256")
    parser.add_argument("--workspace", type=Path)
    parser.add_argument("--workspace-before-sha256")
    parser.add_argument("--policies", type=Path, default=ROOT)
    parser.add_argument("--engine", type=Path, default=ENGINE)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args(arguments)
    if args.mode != "check-source" and args.output is None:
        parser.error("stage/source require --output (a staging directory)")
    if args.mode == "stage" and args.before_sha256 is None:
        parser.error("stage requires --before-sha256")
    if args.vm == "rehab" and args.mode in ("stage", "check-source") and args.workspace is None:
        parser.error("Rehab stage/check-source require --workspace")
    if args.vm == "rehab" and args.mode == "stage" and args.workspace_before_sha256 is None:
        parser.error("Rehab stage requires --workspace-before-sha256")
    if args.vm != "rehab" and (args.workspace is not None or args.workspace_before_sha256 is not None):
        parser.error("workspace options apply to Rehab")
    try:
        controller = read_verified(args.controller, args.before_sha256)
        project = (args.policies / args.vm / "AGENTS.md").read_bytes()
        chat = (args.policies / "AGENTS.chat.md").read_bytes()
        workspace = read_verified(args.workspace, args.workspace_before_sha256) if args.workspace else None
        if args.mode == "stage":
            artifacts = build_stage(args.vm, controller, project, chat, args.engine.read_bytes(), workspace)
        else:
            candidate = patch_controller(args.vm, controller, project, chat)
            if args.mode == "check-source":
                if candidate != controller or (args.vm == "rehab" and workspace != project):
                    raise ValueError(f"{args.vm}: source differs from canonical policies")
                print(f"runtime-policy: {args.vm}: source matches")
                return 0
            artifacts = {"controller.py": candidate}
            if args.vm == "rehab":
                artifacts["workspace-AGENTS.md"] = project
        write_outputs(args.output, artifacts)
        print(f"runtime-policy: {args.vm}: staged {len(artifacts)} artifacts")
        return 0
    except (OSError, ValueError, SyntaxError) as error:
        print(f"runtime-policy: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
