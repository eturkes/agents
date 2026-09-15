"""Operator contracts; synthetic trees/controllers, no VMs or model calls."""
import contextlib
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import tempfile
import types
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location(
    "update_workspace", Path(__file__).with_name("update-workspace.py")
)
operator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(operator)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class Controller:
    def __init__(self, module, tenant):
        self.m, self.tenant = module, tenant
        self.events, self.failure = [], None
        self.snapshots = {"1"}
        self._versions = [{"id": "v_old", "parent_id": None,
                           "source_sha256": self._tree_hash(self.current()),
                           "instructions_sha256": sha(self.current() / "AGENTS.md"),
                           "private_sha256": "private", "private_manifest_sha256": "private",
                           "report_sha256": sha(self.current() / module.REPORT_RELATIVE)}]
        self._control = {"current_version_id": "v_old"}
        self._state = {"busy": False, "stage": "ready"}
        self._history_sync_failed = False
        self._stop = types.SimpleNamespace(is_set=lambda: False)

    def current(self):
        return self.m.CURRENT.resolve()

    def _current_worktree(self):
        return self.current()

    _current_release = _current_worktree

    def _version(self, identity):
        return next(v for v in self._versions if v["id"] == identity)

    def _snapshot_numbers(self):
        return set(self.snapshots)

    def _tree_hash(self, root):
        records = [(p.relative_to(root).as_posix(), p.stat().st_mode,
                    sha(p) if p.is_file() else None) for p in sorted(root.rglob("*"))]
        return hashlib.sha256(json.dumps(records).encode()).hexdigest()

    def _private_hash(self, *args, **kwargs):
        return "private"

    def _private_manifest_hash(self):
        return "private"

    def _startup_reconcile(self):
        self.events.append("reconcile")

    def _protect_copied_sources(self, stage):
        self.events.append("protect")

    def _replace_protected(self, stage, source):
        self.events.append("instructions")
        shutil.copyfile(source, stage / "AGENTS.md")
        shutil.rmtree(stage / "site")
        (stage / self.m.REPORT_RELATIVE).parent.mkdir(parents=True)

    def _freeze_project(self, stage):
        self.events.append("freeze")

    def _atomic_copy_regular(self, source, target, **kwargs):
        self.events.append("report")
        if sha(source) != kwargs["expected_sha256"]:
            raise RuntimeError("report identity")
        shutil.copyfile(source, target)
        if self.failure == "source":
            (target.parents[2] / "code.py").write_text("unrequested change")

    def _validate_frozen_project(self, stage):
        self.events.append("validate")

    def _stage_current(self):
        self.events.append("stage")
        stage = self.m.CANDIDATES / "c_new"
        shutil.copytree(self.current(), stage)
        shutil.copyfile(self.m.WORKSPACE_INSTRUCTIONS, stage / "AGENTS.md")
        for name in self.m.MODEL_DISTRACTIONS:
            path = stage / name
            if path.is_dir():
                shutil.rmtree(path)
            elif path.exists():
                path.unlink()
        if self.failure == "source":
            (stage / "code.py").unlink()
        return stage

    def _promote_candidate(self, stage):
        self.events.append("lock-check")
        if self.failure == "lock":
            raise RuntimeError("lock check failed")
        release = self.m.RELEASES / "w_new"
        stage.rename(release)
        return release

    def _switch_current(self, name):
        self.events.append("switch")
        self.m.CURRENT.unlink()
        self.m.CURRENT.symlink_to(self.m.WORKTREES / name)
        if self.failure == "pointer":
            raise RuntimeError("pointer installed, fsync failed")

    def _deploy_release(self, release, previous):
        self._switch_current(release.name)
        self.events.append("health")
        if self.failure == "health":
            self._rollback_target(previous)
            raise RuntimeError("health failed")

    def _rollback_current_pointer(self, target, reason):
        self.events.append("rollback")
        self.m.CURRENT.unlink()
        self.m.CURRENT.symlink_to(target)
        return True

    def _rollback_target(self, target):
        return self._rollback_current_pointer(target, "rollback")

    def _discard_candidate(self, path):
        self.events.append("discard")
        shutil.rmtree(path)

    _discard_uncommitted_release = _discard_candidate

    def _commit_version(self, summary, **kwargs):
        self.events.append("commit")
        if self.failure == "commit":
            raise RuntimeError("before head")
        if self.failure == "pending":
            self.m.HISTORY_CANDIDATE.write_text("pending snapshot")
            self.snapshots.add("2")
            raise RuntimeError("snapshot needs recovery")
        item = dict(self._versions[-1], id="v_new", parent_id="v_old",
                    source_sha256=self._tree_hash(self.current()),
                    instructions_sha256=sha(self.current() / "AGENTS.md"),
                    checkpoint="2", cno="2")
        self.snapshots.add("2")
        self.m.HISTORY_CURRENT.write_text(json.dumps({"schema": 1, "id": "v_new"}
            if self.tenant == "rehab" else {"schema": 1, "version_id": "v_new"}))
        (self.m.HISTORY_COMMITS / "v_new.json").write_text(json.dumps(item))
        if self.failure == "postcommit":
            raise RuntimeError("head installed, bookkeeping failed")
        if self.tenant != "rehab":
            self._versions.append(item)
            self._control["current_version_id"] = "v_new"
        return item

    def _accept_committed_version(self, item):
        self.events.append("accept")
        self._versions.append(item)
        self._control["current_version_id"] = item["id"]

    def _build_manifest(self, identity, summary):
        return dict(self._versions[-1], id=identity,
                    instructions_sha256=sha(self.current() / "AGENTS.md"))

    def _health_gate(self):
        self.events.append("health-final")

    def _validate_live_version(self, item):
        self.events.append("validate-live")

    def _finish(self, success):
        self.events.append("finish" if success else "failed")

    def _set_state(self, **kwargs):
        self._state.update(kwargs)


class OperatorTests(unittest.TestCase):
    def fixture(self, tenant):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        root = Path(temporary.name)
        projects = root / "projects"
        work = projects / "work"
        current = work / "old"
        (current / "site/report").mkdir(parents=True)
        (current / "AGENTS.md").write_text("old instructions\n")
        (current / "code.py").write_text("unchanged source\n")
        (current / "site/report/report.html").write_text("<html>unchanged report</html>\n")
        source = root / "new-AGENTS.md"
        source.write_text("new instructions\n")
        config = root / "config.toml"
        config.write_text("runtime = 'fixed'\n")
        module_file = root / "orchestrator.py"
        module_file.write_text("# installed controller\n")
        candidates = projects / "candidates"
        candidates.mkdir()
        history = projects / "history"
        (history / "commits").mkdir(parents=True)
        (history / "manifests").mkdir()
        (history / "manifests/v_old.json").write_text("immutable previous manifest\n")
        (history / "commits/v_old.json").write_text("immutable previous commit\n")
        head = history / "current.json"
        head.write_text(json.dumps({"schema": 1, "id": "v_old"} if tenant == "rehab"
                                  else {"schema": 1, "version_id": "v_old"}))
        link = projects / "current"
        link.symlink_to(current)
        m = types.SimpleNamespace(
            __file__=str(module_file), CURRENT=link, PROJECTS=projects,
            WORKTREES=work, RELEASES=work, CANDIDATES=candidates,
            REPORT_RELATIVE=Path("site/report/report.html"),
            PRIVATE_DATA=root / "private", CODEX_CONFIG_FILE=config,
            CODEX_HOME_ROOT=root, WORKSPACE_INSTRUCTIONS=source,
            WORKSPACE_INSTRUCTIONS_SHA256=sha(source), PROJECT_INSTRUCTIONS=source.read_text(),
            HISTORY_CURRENT=head, HISTORY_COMMITS=history / "commits",
            HISTORY_MANIFESTS=history / "manifests", HISTORY_CANDIDATE=history / "pending",
            CODEX=module_file, CODEX_CODE_MODE_HOST=module_file, BWRAP=module_file,
            random_id=lambda prefix: prefix + "new", MAX_PROMPT_BYTES=8192,
            MODEL_DISTRACTIONS=("README.md", "test", "tests"),
        )
        (root / ".codex").mkdir()
        shutil.copyfile(config, root / ".codex/config.toml")
        return m, Controller(m, tenant), source

    def invoke(self, tenant, failure=None):
        m, c, source = self.fixture(tenant)
        c.failure = failure
        with patch.object(operator.grp, "getgrnam", return_value=types.SimpleNamespace(gr_gid=os.getgid())):
            return operator.transition(m, c, tenant, source, sha(source), "Align instructions"), m, c

    def test_one_child_preserves_source_report_and_history(self):
        for tenant in ("nanoha", "naoto", "rehab"):
            with self.subTest(tenant=tenant):
                result, m, c = self.invoke(tenant)
                self.assertTrue(result["changed"])
                self.assertEqual(c._versions[-1]["parent_id"], "v_old")
                self.assertEqual(c.snapshots, {"1", "2"})
                self.assertEqual((c.current() / "code.py").read_text(), "unchanged source\n")
                self.assertEqual((m.HISTORY_MANIFESTS / "v_old.json").read_text(), "immutable previous manifest\n")
                self.assertLess(c.events.index("switch"), c.events.index("commit"))
                if tenant == "rehab":
                    self.assertLess(c.events.index("lock-check"), c.events.index("health"))
                    self.assertLess(c.events.index("health"), c.events.index("commit"))
                else:
                    self.assertLess(c.events.index("report"), c.events.index("commit"))

    def test_identical_current_is_noop(self):
        for tenant in ("naoto", "rehab"):
            m, c, source = self.fixture(tenant)
            shutil.copyfile(source, c.current() / "AGENTS.md")
            c._versions[-1]["instructions_sha256"] = sha(source)
            c._versions[-1]["source_sha256"] = c._tree_hash(c.current())
            result = operator.transition(m, c, tenant, source, sha(source), "Align instructions")
            self.assertFalse(result["changed"])
            self.assertEqual(c.snapshots, {"1"})
            self.assertNotIn("commit", c.events)

    def test_rehab_rejects_source_drift_before_noop_or_staging(self):
        for already_current in (False, True):
            for drift in ("content", "mode"):
                with self.subTest(already_current=already_current, drift=drift):
                    m, c, source = self.fixture("rehab")
                    if already_current:
                        shutil.copyfile(source, c.current() / "AGENTS.md")
                        c._versions[-1]["instructions_sha256"] = sha(source)
                        c._versions[-1]["source_sha256"] = c._tree_hash(c.current())
                    code = c.current() / "code.py"
                    if drift == "content":
                        code.write_text("unsaved source change\n")
                    else:
                        code.chmod(code.stat().st_mode ^ 0o100)
                    with self.assertRaisesRegex(operator.UpdateError, "source.*saved head"):
                        operator.transition(m, c, "rehab", source, sha(source), "Align instructions")
                    self.assertEqual(c.current().name, "old")
                    self.assertEqual(c.snapshots, {"1"})
                    self.assertEqual(c.events, [])

    def test_rehab_rejects_instruction_digest_outside_saved_head(self):
        m, c, source = self.fixture("rehab")
        c._versions[-1]["instructions_sha256"] = sha(source)
        with self.assertRaisesRegex(operator.UpdateError, "instructions.*saved head"):
            operator.transition(m, c, "rehab", source, sha(source), "Align instructions")
        self.assertEqual(c.current().name, "old")
        self.assertEqual(c.snapshots, {"1"})
        self.assertEqual(c.events, [])

    def test_source_drift_aborts_before_switch(self):
        for tenant in ("naoto", "rehab"):
            m, c, source = self.fixture(tenant)
            c.failure = "source"
            with patch.object(operator.grp, "getgrnam", return_value=types.SimpleNamespace(gr_gid=os.getgid())):
                with self.assertRaises(operator.UpdateError):
                    operator.transition(m, c, tenant, source, sha(source), "Align instructions")
            self.assertNotIn("switch", c.events)
            self.assertNotIn("commit", c.events)

    def test_rehab_operator_preserves_context_stripped_from_model_turns(self):
        m, c, source = self.fixture("rehab")
        (c.current() / "README.md").write_text("existing instructions for humans\n")
        (c.current() / "tests").mkdir()
        (c.current() / "tests/test_existing.py").write_text("existing regression\n")
        c._versions[-1]["source_sha256"] = c._tree_hash(c.current())
        with patch.object(operator.grp, "getgrnam", return_value=types.SimpleNamespace(gr_gid=os.getgid())), patch.object(operator.os, "chown"):
            result = operator.transition(m, c, "rehab", source, sha(source), "Align instructions")
        self.assertTrue(result["changed"])
        self.assertEqual((c.current() / "README.md").read_text(), "existing instructions for humans\n")
        self.assertEqual((c.current() / "tests/test_existing.py").read_text(), "existing regression\n")

    def test_precommit_pointer_and_commit_failures_rollback(self):
        for tenant in ("naoto", "rehab"):
            for failure in ("pointer", "commit"):
                with self.subTest(tenant=tenant, failure=failure):
                    m, c, source = self.fixture(tenant)
                    c.failure = failure
                    with patch.object(operator.grp, "getgrnam", return_value=types.SimpleNamespace(gr_gid=os.getgid())):
                        with self.assertRaises(operator.UpdateError) as caught:
                            operator.transition(m, c, tenant, source, sha(source), "Align instructions")
                    self.assertFalse(caught.exception.committed)
                    self.assertEqual(c.current().name, "old")
                    self.assertIn("rollback", c.events)

    def test_postcommit_error_never_rolls_back_or_discards_release(self):
        for tenant in ("naoto", "rehab"):
            m, c, source = self.fixture(tenant)
            c.failure = "postcommit"
            with patch.object(operator.grp, "getgrnam", return_value=types.SimpleNamespace(gr_gid=os.getgid())):
                with self.assertRaises(operator.UpdateError) as caught:
                    operator.transition(m, c, tenant, source, sha(source), "Align instructions")
            self.assertTrue(caught.exception.committed)
            self.assertNotIn("rollback", c.events)
            self.assertNotIn("discard", c.events)
            self.assertNotEqual(c.current().name, "old")

    def test_pending_snapshot_keeps_recovery_evidence(self):
        m, c, source = self.fixture("rehab")
        c.failure = "pending"
        with self.assertRaises(operator.UpdateError):
            operator.transition(m, c, "rehab", source, sha(source), "Align instructions")
        self.assertTrue(m.HISTORY_CANDIDATE.exists())
        self.assertTrue((m.RELEASES / "w_new").exists())
        self.assertEqual(c.current().name, "old")

    def test_original_rehab_lock_and_health_failures_prevent_commit(self):
        for failure in ("lock", "health"):
            m, c, source = self.fixture("rehab")
            c.failure = failure
            with self.assertRaises(operator.UpdateError):
                operator.transition(m, c, "rehab", source, sha(source), "Align instructions")
            self.assertNotIn("commit", c.events)
            self.assertEqual(c.current().name, "old")

    def test_lock_exclusion(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "lock"
            path.touch(mode=0o600)
            os.chown(path, -1, os.getegid())
            with operator.exclusive(path):
                with self.assertRaises(operator.UpdateError):
                    with operator.exclusive(path):
                        self.fail("second lifetime lock admitted")

    def test_absent_native_operation_lock_is_created_and_excluded(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            root.chmod(0o755)
            os.chown(root, -1, os.getegid())
            path = root / "operations.lock"
            native_open = lambda p: os.open(
                p, os.O_RDWR | os.O_CREAT | os.O_CLOEXEC | os.O_NOFOLLOW, 0o600)
            with operator.exclusive(path, opener=native_open):
                info = path.lstat()
                self.assertEqual(info.st_mode & 0o7777, 0o600)
                self.assertEqual((info.st_uid, info.st_gid, info.st_nlink),
                                 (os.geteuid(), os.getegid(), 1))
                with self.assertRaisesRegex(operator.UpdateError, "holds its lock"):
                    with operator.exclusive(path, opener=native_open):
                        self.fail("second operation lock admitted")
            with operator.exclusive(path, opener=native_open):
                self.assertEqual(path.stat().st_ino, info.st_ino)

    def test_native_operation_lock_rejects_unsafe_parent_before_open(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            owned = root / "owned"
            owned.mkdir(mode=0o755)
            os.chown(owned, -1, os.getegid())
            linked = root / "linked"
            linked.symlink_to(owned, target_is_directory=True)
            unsafe = root / "writable"
            unsafe.mkdir(mode=0o777)
            unsafe.chmod(0o777)
            for parent in (linked, unsafe):
                with self.subTest(parent=parent.name), patch.object(operator.os, "open") as opened:
                    with self.assertRaisesRegex(operator.UpdateError, "parent"):
                        with operator.exclusive(parent / "operations.lock", opener=opened):
                            self.fail("unsafe runtime parent admitted")
                    opened.assert_not_called()

    def test_native_operation_lock_keeps_file_boundaries(self):
        for kind in ("symlink", "mode", "hardlink"):
            with self.subTest(kind=kind), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                root.chmod(0o755)
                os.chown(root, -1, os.getegid())
                retained = root / "retained"
                retained.write_text("preserve existing bytes\n")
                retained.chmod(0o600)
                path = root / "operations.lock"
                if kind == "symlink":
                    path.symlink_to(retained)
                elif kind == "hardlink":
                    os.link(retained, path)
                else:
                    path.write_text("existing lock\n")
                    path.chmod(0o644)
                native_open = lambda p: os.open(
                    p, os.O_RDWR | os.O_CREAT | os.O_CLOEXEC | os.O_NOFOLLOW, 0o600)
                with self.assertRaises((operator.UpdateError, OSError)):
                    with operator.exclusive(path, opener=native_open):
                        self.fail("unsafe operation lock admitted")
                self.assertEqual(retained.read_text(), "preserve existing bytes\n")

    def test_quiescence_rejects_running_daemon_or_busy_store(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            m = types.SimpleNamespace(STORE_PATH=root / "store", SOCKET_PATH=root / "socket")
            m.STORE_PATH.write_text('{"state":{"busy":false,"stage":"ready"}}')
            m.STORE_PATH.chmod(0o600)
            with patch.object(operator.subprocess, "run", return_value=types.SimpleNamespace(returncode=0, stdout=b"run: service: (pid 1) 10s\n")):
                with self.assertRaises(operator.UpdateError):
                    operator.require_quiescent(m, "naoto")
            m.STORE_PATH.write_text('{"state":{"busy":true,"stage":"render"}}')
            with patch.object(operator.subprocess, "run", return_value=types.SimpleNamespace(returncode=0, stdout=b"down: service: 10s\n")):
                with self.assertRaises(operator.UpdateError):
                    operator.require_quiescent(m, "naoto")


if __name__ == "__main__":
    unittest.main()
