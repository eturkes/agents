#!/usr/bin/env python3
"""Instruction-only child version; run as root with Python -I -B, services stopped.

Runtime-policy installation belongs to the caller. Existing controller gates own
validation + NILFS commits. Exit 3 => committed/uncertain; recover forward, never
restore an old pointer or runtime blindly. Historical records remain immutable.
"""
from __future__ import annotations

import argparse
import contextlib
import copy
import fcntl
import grp
import hashlib
import importlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys


PACKAGES = {"nanoha": "apex", "naoto": "tau", "rehab": "rehab"}


class UpdateError(RuntimeError):
    def __init__(self, message, *, committed=False):
        super().__init__(message)
        self.committed = committed


def read_file(path, *, trusted=False, maximum=4 * 1024 * 1024):
    descriptor = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        before = os.fstat(descriptor)
        if (not stat.S_ISREG(before.st_mode) or before.st_nlink != 1
                or before.st_size > maximum or (trusted and (
                    before.st_uid != os.geteuid() or before.st_mode & 0o022))):
            raise UpdateError(f"unsafe file: {path}")
        with os.fdopen(descriptor, "rb", closefd=False) as stream:
            value = stream.read(maximum + 1)
        after = os.fstat(descriptor)
        named = path.lstat()
        identity = lambda info: (info.st_dev, info.st_ino, info.st_size,
                                 info.st_mtime_ns, info.st_ctime_ns)
        if (len(value) != before.st_size or identity(before) != identity(after)
                or identity(after) != identity(named)):
            raise UpdateError(f"file changed while reading: {path}")
        return value
    finally:
        os.close(descriptor)


def digest(path):
    descriptor = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        before = os.fstat(descriptor)
        if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or before.st_size > 2 * 1024**3:
            raise UpdateError(f"unsafe digest input: {path}")
        value, remaining = hashlib.sha256(), before.st_size
        while remaining:
            chunk = os.read(descriptor, min(1024 * 1024, remaining))
            if not chunk:
                raise UpdateError(f"digest input shrank: {path}")
            value.update(chunk)
            remaining -= len(chunk)
        after, named = os.fstat(descriptor), path.lstat()
        identity = lambda info: (info.st_dev, info.st_ino, info.st_size,
                                 info.st_mtime_ns, info.st_ctime_ns)
        if (os.read(descriptor, 1) or identity(before) != identity(after)
                or identity(after) != identity(named)):
            raise UpdateError(f"digest input changed: {path}")
        return value.hexdigest()
    finally:
        os.close(descriptor)


def tree_identity(root):
    """Path/type/content identity; ignore root AGENTS only, never follow links."""
    result = {}
    for parent, directories, files in os.walk(root, followlinks=False):
        for name in sorted(directories + files):
            path = Path(parent) / name
            relative = path.relative_to(root).as_posix()
            if relative == "AGENTS.md":
                continue
            info = path.lstat()
            if stat.S_ISLNK(info.st_mode):
                result[relative] = ("link", os.readlink(path))
            elif stat.S_ISDIR(info.st_mode):
                result[relative] = ("directory", "")
            elif stat.S_ISREG(info.st_mode):
                result[relative] = ("file", digest(path))
            else:
                raise UpdateError(f"special project entry: {relative}")
    return result


def history_identity(module):
    return {path: digest(path)
            for root in (module.HISTORY_MANIFESTS, module.HISTORY_COMMITS)
            for path in root.iterdir()}


def runtime_identity(module, tenant):
    config = (module.CODEX_CONFIG_FILE if tenant == "rehab"
              else module.CODEX_HOME_ROOT / ".codex/config.toml")
    paths = {Path(module.__file__), config, module.CODEX,
             module.CODEX_CODE_MODE_HOST, module.BWRAP}
    if tenant == "rehab":
        paths.add(module.WORKSPACE_INSTRUCTIONS)
    return {path: digest(path) for path in paths}


def private_identity(module, controller, tenant):
    if tenant == "rehab":
        return controller._private_manifest_hash()
    source = module.PRIVATE_DATA
    if tenant == "nanoha":
        source /= "cleaned.csv"
    return controller._private_hash(source, installed=True)


def current_tree(controller, tenant):
    return (controller._current_release() if tenant == "rehab"
            else controller._current_worktree())


def head_id(module):
    value = json.loads(read_file(module.HISTORY_CURRENT))
    identity = value.get("id", value.get("version_id"))
    if value.get("schema") != 1 or not isinstance(identity, str) or not identity:
        raise UpdateError("saved head is invalid", committed=None)
    return identity


def require_policy(module, tenant, source, expected):
    payload = read_file(source, maximum=64 * 1024)
    if not payload or hashlib.sha256(payload).hexdigest() != expected:
        raise UpdateError("instruction input differs from approved SHA-256")
    text = payload.decode("utf-8")
    if tenant == "rehab":
        valid = (module.WORKSPACE_INSTRUCTIONS_SHA256 == expected
                 and digest(module.WORKSPACE_INSTRUCTIONS) == expected)
    else:
        valid = module.PROJECT_INSTRUCTIONS == text
    if not valid:
        raise UpdateError("install matching controller/workspace policy first")


def restore_operator_context(module, current, stage):
    # Model turns omit documentation/tests; this operator owns no such deletion.
    for name in module.MODEL_DISTRACTIONS:
        source, target = current / name, stage / name
        if not source.exists():
            continue
        if target.exists() or target.is_symlink():
            raise UpdateError("stripped model context unexpectedly remains")
        if source.is_dir():
            shutil.copytree(source, target, symlinks=False)
            entries = [target, *target.rglob("*")]
        else:
            shutil.copy2(source, target)
            entries = [target]
        group = grp.getgrnam("rehab-codex").gr_gid
        for path in entries:
            os.chown(path, 0, group)
            os.chmod(path, 0o1770 if path.is_dir() else 0o444)


def transition(module, controller, tenant, source, expected, summary):
    """Caller owns lifetime + operation locks and has reconciled an idle daemon."""
    require_policy(module, tenant, source, expected)
    current = current_tree(controller, tenant)
    previous = os.readlink(module.CURRENT)
    head = copy.deepcopy(controller._version(controller._control["current_version_id"]))
    if head_id(module) != head["id"]:
        raise UpdateError("saved head differs from controller state")
    if tenant == "rehab":
        if controller._tree_hash(current) != head["source_sha256"]:
            raise UpdateError("current source differs from saved head")
        if digest(current / "AGENTS.md") != head["instructions_sha256"]:
            raise UpdateError("current instructions differ from saved head")
    versions = copy.deepcopy(controller._versions)
    snapshots = controller._snapshot_numbers()
    records = history_identity(module)
    runtime = runtime_identity(module, tenant)
    identity = tree_identity(current)
    private = private_identity(module, controller, tenant)
    private_key = "private_manifest_sha256" if tenant == "rehab" else "private_sha256"
    if private != head[private_key]:
        raise UpdateError("private inputs differ from saved head")
    if digest(current / "AGENTS.md") == expected:
        if head["instructions_sha256"] != expected:
            raise UpdateError("current instructions differ from saved head")
        if tenant == "rehab":
            controller._health_gate()
        else:
            controller._validate_live_version(head)
        return {"changed": False, "version_id": head["id"]}

    stage = release = None
    committed = False
    try:
        controller._set_state(busy=True, stage="save")
        if tenant == "rehab":
            stage = controller._stage_current()
            restore_operator_context(module, current, stage)
            if tree_identity(stage) != identity:
                raise UpdateError("candidate changed non-instruction source")
            release = controller._promote_candidate(stage)
            stage = None
        else:
            stage = module.WORKTREES / module.random_id("w_")
            shutil.copytree(current, stage, symlinks=True, copy_function=shutil.copy2)
            if tenant == "naoto":
                controller._protect_copied_sources(stage)
            controller._replace_protected(stage, source)
            controller._freeze_project(stage)
            group = grp.getgrnam(f"{PACKAGES[tenant]}-dashboard").gr_gid
            controller._atomic_copy_regular(
                current / module.REPORT_RELATIVE, stage / module.REPORT_RELATIVE,
                mode=0o640, uid=0, gid=group, expected_sha256=head["report_sha256"])
            controller._validate_frozen_project(stage)
            release = stage

        if (tree_identity(release) != identity or tree_identity(current) != identity
                or digest(release / "AGENTS.md") != expected
                or private_identity(module, controller, tenant) != private
                or runtime_identity(module, tenant) != runtime):
            raise UpdateError("source/report/private/runtime preservation failed")
        require_policy(module, tenant, source, expected)
        if tenant == "rehab":
            controller._deploy_release(release, previous)
        else:
            controller._switch_current(release.name)
        kwargs = {"thread_id": None} if tenant == "nanoha" else {}
        item = controller._commit_version(summary, **kwargs)
        committed = True
        if tenant == "rehab":
            controller._accept_committed_version(item)
            controller._health_gate()
        else:
            controller._validate_live_version(item)
        checkpoint = str(item["checkpoint"] if tenant == "rehab" else item["cno"])
        if (item["parent_id"] != head["id"] or head_id(module) != item["id"]
                or controller._versions[:-1] != versions
                or len(controller._versions) != len(versions) + 1
                or controller._snapshot_numbers() != snapshots | {checkpoint}
                or checkpoint in snapshots or item["instructions_sha256"] != expected
                or tree_identity(current_tree(controller, tenant)) != identity
                or private_identity(module, controller, tenant) != private
                or runtime_identity(module, tenant) != runtime
                or any(digest(path) != value for path, value in records.items())):
            raise UpdateError("committed child preservation failed", committed=True)
        if getattr(controller, "_history_sync_failed", False) or controller._stop.is_set():
            raise UpdateError("committed child needs forward reconciliation", committed=True)
        controller._finish(True)
        return {"changed": True, "version_id": item["id"],
                "parent_id": head["id"], "checkpoint": checkpoint}
    except BaseException as error:
        # Observe the durable commit point even when a pointer/fsync helper raises
        # after installation. An unreadable head is never permission to roll back.
        try:
            committed = committed or head_id(module) != head["id"]
        except Exception as uncertain:
            raise UpdateError("head outcome uncertain; retain state for recovery",
                              committed=None) from uncertain
        if committed:
            raise UpdateError("child committed; retain policy and recover forward",
                              committed=True) from error
        try:
            if os.readlink(module.CURRENT) != previous:
                if tenant == "rehab":
                    controller._rollback_target(previous)
                elif not controller._rollback_current_pointer(previous, "instruction-update"):
                    raise UpdateError("pointer rollback failed", committed=None)
            pending = (module.HISTORY_CANDIDATE.exists()
                       or controller._snapshot_numbers() != snapshots)
            # A partial snapshot keeps its release + marker for native recovery.
            if not pending:
                for path in {stage, release} - {None}:
                    if path.exists() and path != current_tree(controller, tenant):
                        if tenant == "rehab":
                            cleanup = (controller._discard_candidate if path.parent == module.CANDIDATES
                                       else controller._discard_uncommitted_release)
                            cleanup(path)
                        else:
                            shutil.rmtree(path)
            controller._finish(False)
        except Exception as rollback:
            raise UpdateError("precommit failure; rollback/recovery incomplete",
                              committed=None) from rollback
        raise UpdateError("child not committed; previous pointer restored"
                          + ("; snapshot evidence retained" if pending else "")) from error


@contextlib.contextmanager
def exclusive(path, *, opener=None):
    if opener is not None:
        parent = path.parent.lstat()
        if (not stat.S_ISDIR(parent.st_mode)
                or parent.st_uid != os.geteuid() or parent.st_gid != os.getegid()
                or stat.S_IMODE(parent.st_mode) != 0o755):
            raise UpdateError("controller lock parent boundary differs")
        descriptor = opener(path)
    else:
        descriptor = os.open(path, os.O_RDWR | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        info = os.fstat(descriptor)
        if (not stat.S_ISREG(info.st_mode) or info.st_nlink != 1
                or info.st_uid != os.geteuid() or info.st_gid != os.getegid()
                or stat.S_IMODE(info.st_mode) != 0o600):
            raise UpdateError("controller lock boundary differs")
        try:
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise UpdateError("another controller/operation holds its lock") from error
        yield
    finally:
        os.close(descriptor)


def require_quiescent(module, tenant):
    prefix = PACKAGES[tenant]
    names = ("rehab-web", "rehab-orchestrator") if tenant == "rehab" else (
        f"{prefix}-dashboard-web", f"{prefix}-dashboard-orchestrator")
    for name in names:
        result = subprocess.run(["/usr/bin/sv", "status", f"/var/service/{name}"],
                                stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT, timeout=10, check=False)
        if result.returncode != 0 or not result.stdout.startswith(b"down:"):
            raise UpdateError(f"stop {name} before updating instructions")
    if module.SOCKET_PATH.exists() or module.SOCKET_PATH.is_symlink():
        raise UpdateError("controller socket remains")
    state = json.loads(read_file(module.STORE_PATH, trusted=True)).get("state", {})
    if state.get("busy") is not False or state.get("stage") not in {"ready", "error"}:
        raise UpdateError("controller is not idle")


def update(module, tenant, source, expected, summary):
    if os.geteuid() != 0:
        raise UpdateError("workspace update requires root")
    if (not source.is_absolute() or source.is_symlink()
            or not re.fullmatch(r"[0-9a-f]{64}", expected)
            or not summary or summary.strip() != summary or "\x00" in summary
            or len(summary.encode("utf-8")) > module.MAX_PROMPT_BYTES):
        raise UpdateError("invalid instruction input, SHA-256 or description")
    source = source.resolve(strict=True)
    if source.is_relative_to(module.PROJECTS.resolve(strict=True)):
        raise UpdateError("stage instructions outside Projects")
    read_file(source, trusted=True, maximum=64 * 1024)
    require_quiescent(module, tenant)
    opener = module.Orchestrator._open_root_lock if tenant == "rehab" else None
    with exclusive(module.SERVER_LOCK_PATH), exclusive(module.LOCK_PATH, opener=opener):
        require_quiescent(module, tenant)
        if module.HISTORY_CANDIDATE.exists() or module.HISTORY_CANDIDATE.is_symlink():
            raise UpdateError("existing history transaction needs native recovery")
        controller = module.Orchestrator()
        controller._startup_reconcile()
        return transition(module, controller, tenant, source, expected, summary)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tenant", choices=PACKAGES)
    parser.add_argument("--instructions", type=Path, required=True)
    parser.add_argument("--sha256", required=True)
    parser.add_argument("--controller-sha256", required=True)
    parser.add_argument("--summary", required=True)
    args = parser.parse_args()
    if not sys.flags.isolated or not sys.dont_write_bytecode:
        parser.error("invoke with python3 -I -B")
    package = f"{PACKAGES[args.tenant]}_dashboard"
    root = Path(f"/usr/local/libexec/{PACKAGES[args.tenant]}-dashboard")
    controller_path = root / package / "orchestrator.py"
    try:
        payload = read_file(controller_path, trusted=True)
        if hashlib.sha256(payload).hexdigest() != args.controller_sha256:
            raise UpdateError("installed controller differs from approved SHA-256")
        sys.path.insert(0, str(root))
        module = importlib.import_module(f"{package}.orchestrator")
        if Path(module.__file__).resolve() != controller_path:
            raise UpdateError("controller import escaped installed path")
        result = update(module, args.tenant, args.instructions, args.sha256, args.summary)
        print(json.dumps(result, sort_keys=True))
        return 0
    except UpdateError as error:
        print(json.dumps({"error": str(error), "committed": error.committed}), file=sys.stderr)
        return 3 if error.committed is not False else 1
    except Exception as error:
        print(json.dumps({"error": type(error).__name__, "committed": None}), file=sys.stderr)
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
