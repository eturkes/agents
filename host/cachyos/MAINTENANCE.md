# CachyOS maintenance

- Cadence = weekly + security-relevant updates; active agent, foreground PTY, cwd=repo root.
- Scope = package/tool updates, config merges, cache pruning + local kernel retention. Keep backup/restore drills, access restrictions, monitoring/isolation + reboot/watchdog operations outside this workflow.
- Package ownership + grading rules → [AGENTS.md](AGENTS.md).

## Execute

1. Review Arch/CachyOS notices, AUR diffs and local changes in repositories the updater pulls.
2. Verify external connections. Record kernel/package versions, `df -h / /boot` and failed-unit baselines.
3. Run `sudo -n host/cachyos/kernel-recovery check` before kernel/DKMS updates.
4. Run `host/cachyos/upgrade` through `exec_command` with `tty=true`. Resolve native prompts from upstream evidence in that session.
5. List `.pacnew`/`.pacsave` files with `sudo pacdiff -o`. Merge changes that preserve local policy.

Crashpad gate = nonzero handler + successful `--help`.
After updater stages, `cache-retention` runs offline uv pruning + two-version system/AUR archive retention.
It uses `UV_LOCK_TIMEOUT=0` to skip a busy uv cache without interrupting its users; other errors stop cleanup.
`paccache.timer` owns weekly system archives; native KDE Trash policy owns age cleanup on KIO Trash operations.

## Postflight

```bash
pacman -Dk
dkms status
sudo -n host/cachyos/kernel-recovery check
systemctl --failed --no-pager
systemctl --user --failed --no-pager
nvidia-smi --query-gpu=name,driver_version,memory.used,display_active --format=csv
codex --version
codexify doctor
browseros-call tabs '{"action":"list"}'
sudo pacdiff -o
```

- Require bcachefs + NVIDIA DKMS modules for the installed kernel; retain the running kernel until authorized reboot.
- Check affected services. After browser changes, inspect a real headless capture.
- Attribute new failures against the baseline; record commands, return codes, changed versions + unresolved checks.
- If `pacman -Dk` flags `CACHY_UPDATE_NOTICE`, report the acknowledgement marker separately from package-record failures. Preserve the marker and stock check.

## Kernel checkpoint

`kernel-recovery capture` pins the running release once; reruns verify it. Replacement requires review after the replacement kernel boots.
Layout = `/boot/agent-recovery/<release>/` + `/var/lib/agent-kernel-recovery/`.
The entry preserves source command line, BLAKE2b image hashes and existing boot selections.
Cached modules exclude headers, `source`, `pkgbase` and duplicate `vmlinuz` to stay outside initramfs discovery.

`95-agent-kernel-recovery.hook` restores runtime modules after kernel/DKMS transactions.
`pkgbase` present → verify existing files; a mismatch requires compatibility review.
This guard depends on the marker. When it is unexpectedly missing, verify package records before restoration.
After an interrupted transaction, verify package state, run `kernel-recovery restore-modules`, then `kernel-recovery check` before reboot.

Integrity checks cover checkpoint files and metadata. Bootability requires a separate boot validation.
The checkpoint shares the current root filesystem and user-space packages; review bcachefs-format and driver compatibility before rollout.

## Helper checks

### Closed-lid operation

- `host/cachyos/lid-policy apply` installs `logind-lid.conf` as `/etc/systemd/logind.conf.d/80-lid-ignore.conf` and reloads logind.
- `host/cachyos/lid-policy check` checks installed bytes + live lid actions; `bash -n host/cachyos/lid-policy` + `shellcheck host/cachyos/lid-policy` check the recipe.
- logind ignores the lid on battery, external power and docks, including startup + KDE teardown. PowerDevil releases its lid inhibitor during logout.
- KDE policy remains in `powerdevilrc`: `LidAction=0` for `AC`, `Battery`, `LowBattery`. Manual sleep + critical-battery actions remain independent.
- Closed-lid reboot validation is separate; the recipe preserves the active session.
- Policy semantics → [systemd logind.conf](https://github.com/systemd/systemd/blob/v261/man/logind.conf.xml).

### Kernel recovery

Use `sudo -n host/cachyos/kernel-recovery check --capture-prefix` for initial-capture validation.
After package updates, use the general `check`; current-kernel images and menu entries may change.

```bash
bash -n host/cachyos/upgrade
shellcheck host/cachyos/upgrade
python -c 'import ast,pathlib; ast.parse(pathlib.Path("host/cachyos/kernel-recovery").read_text())'
python host/cachyos/check-kernel-recovery
python host/cachyos/check-kernel-recovery-regressions
```

PTY preflight uses a substituted package executable; filesystem regression cases use temporary trees:

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

References: [Limine configuration](https://github.com/Limine-Bootloader/Limine/blob/trunk/CONFIG.md), [package hooks](https://man.archlinux.org/man/alpm-hooks.5.en).
