"""Runtime selection preserves frozen paths and rejects unpinned live releases."""
import importlib.util
import contextlib
import hashlib
import io
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest import mock

spec = importlib.util.spec_from_file_location('workspace_runtime', Path(__file__).with_name('update-workspace.py'))
operator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(operator)

class RuntimeLocationTests(unittest.TestCase):
    def test_legacy_and_immutable_package_locations(self):
        release = 'a' * 64
        for tenant, prefix in operator.PACKAGES.items():
            with self.subTest(tenant=tenant):
                root, package, controller = operator.runtime_location(tenant, None)
                self.assertEqual(root, Path('/usr/local/libexec') / (prefix + '-dashboard'))
                self.assertEqual(package, prefix + '_dashboard')
                self.assertEqual(controller, root / package / 'orchestrator.py')
                root, package, controller = operator.runtime_location(tenant, release)
                self.assertEqual(root, Path('/usr/local/lib/promptvm/releases') / release)
                self.assertEqual(package, 'promptvm.deployment.' + tenant)
                self.assertEqual(controller, root / 'promptvm/deployment' / tenant / 'orchestrator.py')

    def test_invalid_release_cannot_select_an_outside_runtime(self):
        for release in ('', 'A' * 64, '../current', '/tmp/runtime', 'a' * 63, 'g' * 64):
            with self.subTest(release=release), self.assertRaises(operator.UpdateError):
                operator.runtime_location('naoto', release)

    def test_cli_verifies_the_selected_distribution_before_native_transition(self):
        release = 'a' * 64
        root = Path('/usr/local/lib/promptvm/releases') / release
        payload = b'approved synthetic controller'
        calls = []
        def verify_release(*, root, release):
            calls.append((root, release))
            return {'sha256': release}
        verifier = SimpleNamespace(verify_release=verify_release)
        controller = SimpleNamespace(__file__=str(root / 'promptvm/deployment/naoto/orchestrator.py'))
        def import_module(name):
            return verifier if name == 'promptvm.release' else controller
        argv = ['update-workspace.py', 'naoto', '--instructions', '/var/tmp/policy.md',
                '--sha256', 'b' * 64, '--controller-sha256', hashlib.sha256(payload).hexdigest(),
                '--summary', 'Update tool policy', '--release', release]
        with (mock.patch.object(operator.sys, 'argv', argv),
              mock.patch.object(operator.sys, 'flags', SimpleNamespace(isolated=True)),
              mock.patch.object(operator.sys, 'path', list(operator.sys.path)),
              mock.patch.object(operator, 'read_file', return_value=payload),
              mock.patch.object(operator.importlib, 'import_module', side_effect=import_module),
              mock.patch.object(operator, 'update', return_value={'changed': False}) as update,
              contextlib.redirect_stdout(io.StringIO())):
            self.assertEqual(operator.main(), 0)
        self.assertEqual(calls, [(Path('/usr/local/lib/promptvm'), release)])
        update.assert_called_once_with(controller, 'naoto', Path('/var/tmp/policy.md'),
                                       'b' * 64, 'Update tool policy')
