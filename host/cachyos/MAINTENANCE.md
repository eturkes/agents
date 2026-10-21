# CachyOS maintenance

- Cadence = weekly + security-relevant updates; active agent, foreground PTY, cwd=repo root.
- Scope = package/tool updates, config merges, cache pruning + local kernel retention. Keep backup/restore drills, access restrictions, monitoring/isolation + reboot/watchdog operations outside this workflow.
- Package ownership + grading rules → [AGENTS.md](./AGENTS.md).

## Execute

1. Review Arch/CachyOS notices, AUR diffs and local changes in repositories the updater pulls.
2. Verify external connections. Record kernel/package versions and `df -h / /boot`.
3. Run `host/cachyos/upgrade` in an interactive terminal (`exec_command`: `tty=true`). Resolve native prompts from upstream evidence.
4. Follow the reported actions. Merge configuration files with `sudo pacdiff`; preserve local settings.

Preflight = failed-unit baselines + recovery-kernel check before package work.
Crashpad gate = nonzero handler + successful `--help`; preserve both checks.
After updater stages, `cache-retention` runs offline uv pruning + two-version system/AUR archive retention.
Busy uv cache → skip pruning (`UV_LOCK_TIMEOUT=0`), preserve active processes; other errors → stop cleanup.
`paccache.timer` owns weekly system archives; native KDE Trash policy owns age cleanup on KIO Trash operations.

## Postflight

`upgrade` runs postflight after successful or failed update stages; later update stages stop on failure.
`upgrade --check` runs the same read-only checks from any directory, without updates or cleanup.

- Coverage = stock `pacman -Dk`, bcachefs + NVIDIA DKMS for every installed kernel, recovery checkpoint, system/user failed units, crash policy, NVIDIA access, Codex, Codexify, BrowserOS Neo, CLIProxyAPI patch, configuration files + project snapshot storage.
- Status = `PASS` check succeeded; `REVIEW` manual decision; `FAIL` action required. Exit = `0` clear, `1` failure, `2` review, `64` usage/PTY.
- Failed units → compare with the pre-update baseline; standalone checks label current failures without attributing them to updates.
- `CACHY_UPDATE_NOTICE` alone → review until its notice ID is acknowledged (`upgrade --acknowledge-notice` after reading the notice pacman printed → `~/.local/state/agent-upgrade/cachy-notice`), then pass until the ID changes; other package-record errors → failure. Preserve the marker and stock check.
- Snapshot retention = manual; the report shows storage without deleting snapshots. Reviewed hook errors → `project-snapshots clear-errors` (archive = `errors-cleared.jsonl`).
- Retain the running kernel until authorized reboot. Check affected services; after browser changes, inspect a real headless capture.

Verification = `bash -n host/cachyos/upgrade`, `shellcheck host/cachyos/upgrade`, `ruff check host/cachyos/check-upgrade`, `python -B host/cachyos/check-upgrade -q`.

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

### Desktop recovery

- Apps = BrowserOS Neo + ChatGPT; shared restart policy = `desktop-recovery.conf`.
- Replay from repo root; reload preserves running apps:

```bash
set -euo pipefail
install -Dm644 host/cachyos/browseros-neo.service "$HOME/.config/systemd/user/browseros-neo.service"
units=(browseros-neo.service app-chatgpt@autostart.service)
for unit in "${units[@]}"; do
  install -Dm644 host/cachyos/desktop-recovery.conf "$HOME/.config/systemd/user/$unit.d/recovery.conf"
done
rm -f "$HOME/.config/autostart/browseros-neo.desktop"
systemctl --user enable --no-reload "$HOME/.config/systemd/user/browseros-neo.service"
systemctl --user daemon-reload
for unit in "${units[@]}"; do
  cmp host/cachyos/desktop-recovery.conf "$HOME/.config/systemd/user/$unit.d/recovery.conf"
  systemd-analyze --user verify "$(systemctl --user show "$unit" -p FragmentPath --value)"
  systemctl --user show "$unit" -p MainPID -p Restart -p RestartUSec -p ExitType -p DropInPaths
done
```

- Before app/profile maintenance → `systemctl --user stop <owning-unit>`; unit stays stopped. Resume → `systemctl --user start <owning-unit>` or login autostart.

### CLIProxyAPI patch

- Claude Code GPT teammates reach Codex through `cli-proxy-api-bin`. Stock CLIProxyAPI declares each tool ToolSearch discovers in the top-level Codex `tools`, rendered ahead of the input ⇒ the next request reads nothing from the prompt cache. `cli-proxy-api-patch.patch` declares it in an `additional_tools` item after the referencing tool result; upstream [#1894](https://github.com/router-for-me/CLIProxyAPI/issues/1894) closed without that fix.
- `host/cachyos/cli-proxy-api-patch apply`: installed package version → tag `v<version>` in `~/.cache/cli-proxy-api-patch/src` (full clone, ~50 MB). The patch's tests pass on the unpatched tag ⇒ upstream has the fix, override retired. Else 3-way apply, patch tests, build → `~/.local/lib/cli-proxy-api-patch/cli-proxy-api` + `cli-proxy-api-patch.conf` → `~/.config/systemd/user/cli-proxy-api.service.d/`. Build stamp = version + patch SHA-256 ⇒ an unchanged rerun skips the build. `Falling back to direct application...` = one per new test file (no 3-way preimage); expected. The retire probe counts only when the patch's own test is listed (`go test -list`).
- Patch no longer applies, or its tests or build fail → override removed, packaged binary kept, exit 2. Rebase in the clone (`git am -3`), re-export with `git format-patch -1 --full-index --stdout`, commit, rerun `apply`.
- `upgrade` runs `apply` after `paru -Syu`; exit 2 → review, later stages continue. Postflight runs read-only `check`: override bytes, build stamp, unit `ExecStart`, running binary by inode.
- No command restarts the service, matching paru: activation = `systemctl --user restart cli-proxy-api.service`; requests in flight fail once and Claude Code retries them. `rollback` = override removed; packaged binary from the next restart.
- Toolchain = pacman `go`; module + build caches = Go defaults.

Checks = `bash -n host/cachyos/cli-proxy-api-patch`, `shellcheck host/cachyos/cli-proxy-api-patch`, `ruff check host/cachyos/check-cli-proxy-api-patch`, `python -B host/cachyos/check-cli-proxy-api-patch -q`, `host/cachyos/cli-proxy-api-patch check`.

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

### Intel graphics + NVIDIA compute

`intel-graphics-policy` owns Intel-only Xorg + SDDM output setup; NVIDIA remains available for compute.
Desktop/browser rendering = Intel. HDMI connected → active primary + eDP off; closed-lid headless → VNC framebuffer.
`agent-desktop apply` disables desktop idle sleep + dimming/display-off; `lid-policy` covers login/logout and startup.
`ac-loss-policy` owns the independent AC-loss grace; retain emergency critical-battery protection.

Activation, rollback timer, checks + boot/snapshot boundaries → [REMOTE-REBOOT.md](REMOTE-REBOOT.md).
Legacy `nvidia-prime-*` sources remain exclusively as the configuration rollback target.

### X11 responsiveness

`xdg-desktop-portal-sonicde` 6.7.5 performs full RandR hardware detection every second.
On the T480 HDMI path, Intel connector probing blocks Xorg for roughly 650 ms per scan.
Fixed release = 6.7.5.1; cached RandR queries + output-change events replace periodic output scans.
[Upstream fix](https://github.com/Sonic-DE/xdg-desktop-portal-sonicde/commit/631816b754eefdfe13c2f283865fd5c364c396f6).

Upgrade the signed portal package through the configured SonicDE repository.
Before activation, inspect `busctl --user tree org.freedesktop.portal.Desktop` for active request/session objects.
When no portal requests or sessions are active, restart only `plasma-xdg-desktop-portal-kde.service`.
Preserve GPU routing, compositing, PRIME synchronization and the desktop session.

```bash
systemctl --user restart plasma-xdg-desktop-portal-kde.service
host/cachyos/check-x11-latency
ruff check host/cachyos/check-x11-latency
```

`check-x11-latency` = live X11 `XSync` round trips, 10-second sampling window, 5 ms sample spacing; any round trip >100 ms fails.
An outstanding X request can extend the sampling window; automated callers can bound execution with `timeout 20s`.
The probe imports only the four desktop environment keys and never changes the display.
Scope = X-server stalls; physical panel latency, rendered-frame timing, hotplug and active screencast latency require separate checks.
On-demand capture can still query hardware; this fix removes the unconditional polling path.

### VNC input responsiveness

`x11vnc.service` shares the X11 console through loopback TCP 5900; clients forward it through SSH.
Keep `-localhost -nopw` together and preserve the SSH-only access path.
`-threads` separates client input from framebuffer output. A blocked update must not prevent pointer input.
Without threads, LibVNCServer processes client messages and writes updates on the same event loop.
[Threaded and synchronous event loops](https://github.com/LibVNC/libvncserver/blob/LibVNCServer-0.9.15/src/libvncserver/main.c),
[blocking socket writes](https://github.com/LibVNC/libvncserver/blob/LibVNCServer-0.9.15/src/libvncserver/sockets.c).

Replay from the repository root when no VNC clients are connected; only the VNC server restarts:

```bash
set -euo pipefail
if [[ -n $(ss -Htn state established '( sport = :5900 )') ]]; then
  echo 'Disconnect VNC clients before restarting x11vnc.' >&2
  exit 1
fi
install -Dm644 host/cachyos/x11vnc.service "$HOME/.config/systemd/user/x11vnc.service"
systemctl --user daemon-reload
systemd-analyze --user verify "$HOME/.config/systemd/user/x11vnc.service"
systemctl --user restart x11vnc.service
cmp host/cachyos/x11vnc.service "$HOME/.config/systemd/user/x11vnc.service"
systemctl --user is-active x11vnc.service
```

`host/cachyos/check-vnc-input` follows the managed unit's threading mode.
It starts an isolated loopback server with a synthetic 1920×1080 raw framebuffer and routes input to a temporary file.
An idle pointer event proves the observer works. An 8 MB raw update fills the socket buffers while the client stops reading.
A second pointer event must arrive within 250 ms without draining the update; the output remains blocked for up to 2 seconds.
`--nothreads` measures the baseline and must fail: the event arrives only after the reader resumes.
The probe leaves the desktop and active VNC connections untouched and removes its server processes and temporary files.

Checks = `ruff check host/cachyos/check-vnc-input`, Python syntax, `host/cachyos/check-vnc-input`,
`host/cachyos/check-x11-latency`, deployed unit byte equality + `systemd-analyze --user verify`.
Scope = input delivery under output backpressure; viewer rendering, SSH/WAN queueing and long-session latency require a real client session.
x11vnc's speed/latency estimate sees the loopback SSH endpoint, not the remote viewer.
Preserve GPU routing, compositor and encoding defaults; change those only with separate evidence.

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
