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
Busy uv cache → skip pruning (`UV_LOCK_TIMEOUT=0`), preserve active processes; other errors → stop cleanup.
`paccache.timer` owns weekly system archives; native KDE Trash policy owns age cleanup on KIO Trash operations.

## Postflight

```bash
pacman -Dk
dkms status
sudo -n host/cachyos/kernel-recovery check
systemctl --failed --no-pager
systemctl --user --failed --no-pager
host/cachyos/agent-crash-policy check
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

### Agent crash diagnostics

- `host/cachyos/agent-crash-policy apply` masks all installed DrKonqi user units + its system processor template, stops loaded instances and clears their failures.
- `sonicde-meta` requires `sonic-dr-robotnik`; retain that dormant package to preserve desktop dependencies.
- `KCRASH_DUMP_ONLY=1` + `KCRASH_NO_METADATA=1` persist in `~/.config/environment.d/90-agent-crash.conf`; activation environments receive the same values.
- Future user-manager/D-Bus launches inherit dump-only mode; existing processes + direct descendants retain their environment. Unit masks act immediately. Preserve existing crash data.
- Native `systemd-coredump`, `coredumpctl`, journal + GDB remain available; use these agent diagnostics instead of interactive crash reporting.
- `agent-crash-policy check` checks masks, inactive/clear service state, persistent/live settings, native collector routing + diagnostic executables.
- Static checks = `bash -n host/cachyos/agent-crash-policy` + `shellcheck host/cachyos/agent-crash-policy`; repeat apply must preserve mask targets + configuration bytes.
- Pickup timeout cause = journal end leaves its watcher active; no report → `RuntimeMaxSec=30 minutes` expires. [Processor](https://github.com/Sonic-DE/sonic-dr-robotnik/blob/6.7.5/src/coredump/processor/main.cpp), [watcher](https://github.com/Sonic-DE/sonic-dr-robotnik/blob/6.7.5/src/coredump/coredumpwatcher.cpp).
- KCrash switches → [KF6](https://github.com/KDE/kcrash/blob/v6.30.0/src/kcrash.cpp), [KF5](https://github.com/KDE/kcrash/blob/v5.116.0/src/kcrash.cpp).

### Closed-lid operation

- `host/cachyos/lid-policy apply` installs `logind-lid.conf` as `/etc/systemd/logind.conf.d/80-lid-ignore.conf` and reloads logind.
- `host/cachyos/lid-policy check` checks installed bytes + live lid actions; `bash -n host/cachyos/lid-policy` + `shellcheck host/cachyos/lid-policy` check the recipe.
- logind ignores the lid on battery, external power and docks, including startup + KDE teardown. PowerDevil releases its lid inhibitor during logout.
- KDE policy remains in `powerdevilrc`: `LidAction=0` for `AC`, `Battery`, `LowBattery`. Manual sleep + critical-battery actions remain independent.
- Closed-lid reboot validation is separate; the recipe preserves the active session.
- Policy semantics → [systemd logind.conf](https://github.com/systemd/systemd/blob/v261/man/logind.conf.xml).

### NVIDIA desktop rendering

T480 = MX150 `PCI:1:0:0` renders the X screen; Intel `PCI:0:2:0` sends HDMI.
`nvidia-prime-policy apply` installs explicit NVIDIA-primary Xorg configuration + an SDDM display hook.
The hook retains packaged `Xsetup`, links Intel's output sink, activates connected HDMI and disables eDP.
No HDMI → normal connected-output activation. KDE owns the subsequent session layout.

```bash
bash -n host/cachyos/nvidia-prime-policy host/cachyos/nvidia-prime-display
shellcheck host/cachyos/nvidia-prime-policy host/cachyos/nvidia-prime-display
nvidia-xconfig --tree --xconfig host/cachyos/nvidia-prime-xorg.conf
host/cachyos/nvidia-prime-policy apply
host/cachyos/nvidia-prime-policy check
stat -c '%a %U:%G %n' /usr/local/libexec/nvidia-prime-display /etc/X11/xorg.conf.d/90-nvidia-prime.conf /etc/sddm.conf.d/90-nvidia-prime.conf
```

Activation = `sudo -n systemctl restart sddm.service`; ends the desktop session. Keep an independent terminal available.
`host/cachyos/nvidia-prime-policy live` checks default GLX rendering, active SonicWin rendering, PRIME providers and active HDMI.
It refreshes only the four desktop environment keys from the user manager and removes per-process GPU selection overrides.
Desktop terminal: `xrandr --prop` shows HDMI `PRIME Synchronization`; `nvidia-smi` shows graphics clients.
`check` = installed bytes only; metadata = root:root, hook `755`, configuration `644`.
`live` requires the HDMI-connected desktop and does not certify future boots or disconnected layouts.
NVIDIA rendering applies to the whole X screen, including the internal panel when used; HDMI scanout remains Intel.

Rollback = `host/cachyos/nvidia-prime-policy rollback`, then restart SDDM.
Apply/rollback reject different existing files; rollback removes only the recipe's three deployment paths.
No package-owned configuration changes; no render-offload environment variables required.
Driver contract → `/usr/share/doc/nvidia/README`, “Offloading Graphics Display with RandR 1.4”.

Fixed review = 6 rows, 6 adjudicated. Runtime checks remain the commands above.

| Check | Ruling | Evidence / boundary |
|---|---|---|
| GPU roles | Pass | NVIDIA primary screen + Intel modesetting sink; explicit T480 PCI IDs. |
| Display startup | Pass | SDDM invokes the owned executable; packaged setup precedes provider linking. |
| Layout | Pass | HDMI preferred mode = requested 1080p60; hook disables eDP. KDE can subsequently change layout; no-HDMI fallback remains unexercised. |
| Ownership + rollback | Pass | Conflict/symlink preflight; root-owned installation; matching-file-only removal. Byte checks + separate metadata inspection; live rollback remains unexercised. |
| Renderer evidence | Pass | Default GLX + active compositor + output providers; per-process offload cannot satisfy the gate alone. |
| Failure + claim scope | Pass | Errors propagate. Exact layout + synchronization require separate `xrandr --prop` inspection; disconnected state is outside `live`. |

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
