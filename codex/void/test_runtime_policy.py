"""Policy fidelity + unchanged-engine transaction boundaries."""

import ast
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent
ENGINE = ROOT.parents[2] / "eturkes.com/ops/prompt-history-agent-update.py"
PROJECT = '# Project → policy\n\n- Preserve "quotes", \'quotes\', \\\\ + π.\n'.encode()
CHAT = b"# Read-only chat\n\n- Inspect relevant files.\n"


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def baseline(vm):
    policy = (
        'WORKSPACE_INSTRUCTIONS_SHA256 = "old-digest"'
        if vm == "rehab"
        else 'PROJECT_INSTRUCTIONS: str = "old project"'
    )
    return (
        '# π changes AST byte offsets\n'
        'LABEL = "λ"; ' + policy + '  # retained\n'
        'CHAT_PROJECT_INSTRUCTIONS = ("old " "chat")\n'
        'DEVICE = "@@FILESYSTEM_UUID@@"\n'
        'CODEX_SHA256 = "@@CODEX_SHA256@@"\n'
        'def decision(value):\n'
        '    PROJECT_INSTRUCTIONS = "local shadow"\n'
        '    return value > 2\n'
    ).encode()


def values(source):
    result = {}
    for node in ast.parse(source).body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1:
            target = node.targets[0]
        elif isinstance(node, ast.AnnAssign):
            target = node.target
        else:
            continue
        if isinstance(target, ast.Name):
            result[target.id] = ast.literal_eval(node.value)
    return result


class RuntimePolicyTest(unittest.TestCase):
    def setUp(self):
        self.policy = load(ROOT / "runtime-policy.py", "runtime_policy_test_subject")

    def test_full_string_fidelity_utf8_spans_and_repeat(self):
        for vm in ("nanoha", "naoto", "rehab"):
            with self.subTest(vm=vm):
                before = baseline(vm)
                after = self.policy.patch_controller(vm, before, PROJECT, CHAT)
                got = values(after)
                self.assertEqual(got["CHAT_PROJECT_INSTRUCTIONS"], CHAT.decode())
                if vm == "rehab":
                    self.assertEqual(got["WORKSPACE_INSTRUCTIONS_SHA256"], hashlib.sha256(PROJECT).hexdigest())
                else:
                    self.assertEqual(got["PROJECT_INSTRUCTIONS"], PROJECT.decode())
                self.assertEqual(got["DEVICE"], "@@FILESYSTEM_UUID@@")
                self.assertEqual(got["CODEX_SHA256"], "@@CODEX_SHA256@@")
                self.assertEqual(before.split(b"def decision", 1)[1], after.split(b"def decision", 1)[1])
                self.assertIn(b"  # retained\n", after)
                self.assertEqual(after, self.policy.patch_controller(vm, after, PROJECT, CHAT))

    def test_whitelist_rejects_logic_or_installation_changes(self):
        before = baseline("naoto")
        after = self.policy.patch_controller("naoto", before, PROJECT, CHAT)
        self.policy.validate_delta("naoto", before, after)
        for old, new in ((b"value > 2", b"value > 1"), (b"@@FILESYSTEM_UUID@@", b"other-device")):
            with self.subTest(old=old), self.assertRaises(ValueError):
                self.policy.validate_delta("naoto", before, after.replace(old, new))

    def test_source_encoding_fidelity(self):
        for prefix in (b"\xef\xbb\xbf", b"# coding: utf-8\n"):
            with self.subTest(prefix=prefix):
                before = prefix + b'PROJECT_INSTRUCTIONS = "old"\nCHAT_PROJECT_INSTRUCTIONS = "old"\n'
                after = self.policy.patch_controller("nanoha", before, PROJECT, CHAT)
                self.assertTrue(after.startswith(prefix))
                self.assertEqual(values(after)["PROJECT_INSTRUCTIONS"], PROJECT.decode())
        with self.assertRaises(ValueError):
            self.policy.patch_controller("nanoha", b"# coding: latin-1\n" + baseline("nanoha"), PROJECT, CHAT)

    def test_ambiguous_or_dynamic_assignments_fail(self):
        before = baseline("nanoha")
        invalid = (
            before + b'PROJECT_INSTRUCTIONS = "duplicate"\n',
            before.replace(b'PROJECT_INSTRUCTIONS: str = "old project"', b'PROJECT_INSTRUCTIONS = str("dynamic")'),
            before.replace(b'PROJECT_INSTRUCTIONS: str = "old project"', b'PROJECT_INSTRUCTIONS = OTHER = "alias"'),
            before.replace(b"PROJECT_INSTRUCTIONS: str", b"DIFFERENT: str"),
        )
        for source in invalid:
            with self.subTest(source=source), self.assertRaises(ValueError):
                self.policy.patch_controller("nanoha", source, PROJECT, CHAT)

    def test_stage_preserves_engine_functions_and_pins_payload(self):
        engine = ENGINE.read_bytes()
        for vm in ("nanoha", "naoto", "rehab"):
            with self.subTest(vm=vm), tempfile.TemporaryDirectory() as raw:
                before = baseline(vm)
                workspace = b"# Previous workspace\n" if vm == "rehab" else None
                artifacts = self.policy.build_stage(vm, before, PROJECT, CHAT, engine, workspace)
                self.assertEqual(artifacts, self.policy.build_stage(vm, before, PROJECT, CHAT, engine, workspace))
                source = artifacts["guest-update.py"]
                original = ast.parse(engine)
                generated = ast.parse(source)
                original_text = engine.decode()
                generated_text = source.decode()
                for node in original.body:
                    if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                        copied = next(item for item in generated.body if type(item) is type(node) and item.name == node.name)
                        self.assertEqual(ast.get_source_segment(original_text, node), ast.get_source_segment(generated_text, copied))
                guest = Path(raw) / "guest.py"
                guest.write_bytes(source)
                updater = load(guest, "generated_policy_test_guest")
                target = updater.TARGETS[vm]
                payload = updater.embedded_payload(target)
                self.assertEqual(payload["orchestrator"], artifacts["controller.py"])
                self.assertEqual(target.files[0].preimage, hashlib.sha256(before).hexdigest())
                self.assertEqual(target.files[0].postimage, hashlib.sha256(artifacts["controller.py"]).hexdigest())
                self.assertRegex(updater.TRANSACTION_ID, r"^agent-policy-[0-9a-f]{64}$")
                self.assertNotEqual(updater.TRANSACTION_ID, "fast-path-agent-20260903-v2")
                manifest = json.loads(artifacts["manifest.json"])
                self.assertEqual(manifest["transaction_id"], updater.TRANSACTION_ID)
                self.assertEqual(manifest["engine_sha256"], hashlib.sha256(engine).hexdigest())
                if vm == "rehab":
                    self.assertEqual(payload["workspace-instructions"], PROJECT)
                    self.assertEqual(target.files[1].preimage, hashlib.sha256(workspace).hexdigest())
                changed = self.policy.build_stage(vm, before, PROJECT + b"\n", CHAT, engine, workspace)
                self.assertNotEqual(changed["manifest.json"], artifacts["manifest.json"])

    def test_engine_drift_invalid_vm_and_noop_fail(self):
        engine = ENGINE.read_bytes()
        before = baseline("nanoha")
        for vm, controller, source, workspace in (
            ("nanoha", before, engine + b"\n", None),
            ("unknown", before, engine, None),
            ("rehab", baseline("rehab"), engine, None),
            ("nanoha", self.policy.patch_controller("nanoha", before, PROJECT, CHAT), engine, None),
        ):
            with self.subTest(vm=vm, workspace=workspace), self.assertRaises(ValueError):
                self.policy.build_stage(vm, controller, PROJECT, CHAT, source, workspace)

    def test_verified_input_and_output_reuse_reject_drift(self):
        with tempfile.TemporaryDirectory() as raw:
            path = Path(raw) / "baseline.py"
            path.write_bytes(b"baseline\n")
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(self.policy.read_verified(path, digest), b"baseline\n")
            path.write_bytes(b"drift\n")
            with self.assertRaises(ValueError):
                self.policy.read_verified(path, digest)
            output = Path(raw) / "stage"
            artifacts = {"controller.py": b"candidate\n", "manifest.json": b"{}\n"}
            self.policy.write_outputs(output, artifacts)
            self.policy.write_outputs(output, artifacts)
            with self.assertRaises(ValueError):
                self.policy.write_outputs(output, {"aaa-new": b"new", "controller.py": b"changed"})
            self.assertFalse((output / "aaa-new").exists())
            self.assertEqual((output / "controller.py").read_bytes(), b"candidate\n")


if __name__ == "__main__":
    unittest.main()
