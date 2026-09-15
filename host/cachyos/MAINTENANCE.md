# Agent-owned CachyOS maintenance

- Owner = active GPT agent; cadence = weekly review + security-relevant updates as needed.
- Execution = foreground agent-owned PTY. Keep the session until package prompts + postflight are resolved.
- Schedule = agent task, not an unattended upgrade service. Existing `paccache.timer` owns weekly archive retention.
- Scope = system/AUR + user-managed tools, reviewed config migrations, bounded cache cleanup, local kernel retention.
- Excluded = off-host backup/restore drills, access restriction changes, persistent monitoring, worker isolation, automatic reboot/watchdog changes.

## Preflight → execute

1. Reserve package-manager ownership. Wait for active package transactions; preserve other agents' processes and files.
2. Check current Arch/CachyOS notices + affected upstream release notes. Review AUR build changes and compatibility decisions.
3. Verify external connections before service actions. Review local changes in repositories that the updater pulls.
4. Run `sudo -n ~/.local/app/agents/host/cachyos/kernel-recovery check` before upgrading kernel/DKMS packages.
5. Review free space with `df -h / /boot`. Record the running kernel, package versions and baseline failed units.
6. Invoke `~/.local/app/agents/host/cachyos/upgrade` in `exec_command` with `tty=true`; poll that same session.
7. Resolve package/keyring/config prompts from upstream evidence. Use the PTY for decisions; preserve failures for diagnosis.
8. Review `.pacnew`/`.pacsave` files with `sudo pacdiff -o`. Merge applicable changes; preserve local behavior.

`upgrade` keeps its existing updater gates, including the Crashpad nonzero-size + successful-`--help` gate.
`cache-retention` runs after updater stages: native offline uv pruning + two-version package archive retention.
Native KDE Trash retention remains separate; cleanup occurs on later KIO Trash operations.

## Postflight — on demand

Run these checks after an upgrade; compare failures with the preflight baseline:

```bash
pacman -Dk
dkms status
sudo -n ~/.local/app/agents/host/cachyos/kernel-recovery check
systemctl --failed --no-pager
systemctl --user --failed --no-pager
nvidia-smi --query-gpu=name,driver_version,memory.used,display_active --format=csv
codex --version
codexify doctor
browseros-call tabs '{"action":"list"}'
sudo pacdiff -o
```

- Require bcachefs + NVIDIA DKMS modules for the newly installed kernel; retain the running kernel until a deliberate reboot.
- Confirm affected service/browser functionality. Run a headless capture after Chromium changes; inspect its real output.
- Attribute new failures before completing the rollout. Keep unchanged failing checks visible; preserve every existing gate.
- Record actual commands, return codes, version changes + unresolved checks. A completed update is not a successful reboot test.
- Reboot requires a separate authorized maintenance action; this workflow neither schedules nor triggers one.

`pacman -Dk` reports two errors for the existing `/var/lib/pacman/local/CACHY_UPDATE_NOTICE` acknowledgement file.
The installed CachyOS pacman writes this non-package marker inside its local package database.
Keep the check and marker visible; report this upstream issue separately from actual package-record failures.
[CachyOS notice implementation](https://github.com/CachyOS/PKGBUILDs/blob/9af4db1d74bed46f1b0386fbe9e111eda47ead39/pacman-git/0001-fix-update-message-notice.patch).

## Local kernel recovery

`kernel-recovery capture` pins the running release once; repeating it checks the same checkpoint without rotating it.
Artifacts = `/boot/agent-recovery/<release>/` + `/var/lib/agent-kernel-recovery/`.
The appended Limine entry retains the source command line and BLAKE2b image hashes; existing entries/defaults stay unchanged.
Runtime-module retention excludes headers, `pkgbase` and duplicate `vmlinuz` to keep retired kernels outside normal initramfs discovery.

`95-agent-kernel-recovery.hook` restores retained runtime modules after kernel/DKMS package transactions.
It never overwrites a still-managed release. Same-release DKMS divergence fails and requires compatibility review.
Post-transaction failure or interruption requires `kernel-recovery restore-modules` + `kernel-recovery check` before any reboot.
The helper pins one checkpoint; replacement needs a separately reviewed capture after the replacement kernel has actually booted.

Limits = kernel recovery, not OS rollback. The entry uses the current root filesystem and current user-space packages.
New bcachefs disk features or driver/user-space incompatibility can invalidate an older kernel; review those changes before rollout.
Captured boot images/modules are checked; recovery boot execution remains untested until an authorized boot succeeds.

### Reproducible checks

Initial capture: `sudo -n ./host/cachyos/kernel-recovery check --capture-prefix` checks hashes, original images/prefix, modules, hook + entry.
After legitimate package updates, omit `--capture-prefix`; the managed current-kernel entry may change.
Syntax: `bash -n host/cachyos/upgrade`; `shellcheck host/cachyos/upgrade`.
Python syntax: `python -c 'import ast,pathlib; ast.parse(pathlib.Path("host/cachyos/kernel-recovery").read_text())'`.
Isolated restoration/refusal checks: `python host/cachyos/check-kernel-recovery`; all writes stay inside a temporary directory.

The PTY check substitutes only the package executable and never performs an upgrade:

```bash
python - <<'PY'
from pathlib import Path
import os, subprocess, tempfile
with tempfile.TemporaryDirectory(prefix='upgrade-pty-check-') as directory:
    executable = Path(directory) / 'paru'
    executable.write_text('#!/bin/sh\nprintf "PACKAGE_OPERATION_REACHED\\n"\nexit 99\n')
    executable.chmod(0o755)
    environment = os.environ.copy()
    environment['PATH'] = directory + ':' + environment['PATH']
    result = subprocess.run(['bash', 'host/cachyos/upgrade'], env=environment,
                            stdin=subprocess.DEVNULL, capture_output=True, text=True)
    assert result.returncode == 64 and 'PACKAGE_OPERATION_REACHED' not in result.stdout, result
    print('upgrade_requires_pty=PASS')
PY
```

Reference: [Limine configuration](https://github.com/Limine-Bootloader/Limine/blob/trunk/CONFIG.md),
[package hook semantics](https://man.archlinux.org/man/alpm-hooks.5.en).
