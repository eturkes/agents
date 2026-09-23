# Remote workstation

T480 = Intel desktop/browser/video + NVIDIA CUDA/LLMs/scientific compute.
HDMI connected → primary output; internal panel off. No HDMI + closed lid → 1920×1080 X framebuffer for VNC, panel off.
No HDMI + open lid → normal connected outputs. KDE owns post-login/hotplug layout.
PowerDevil idle dimming/display-off + idle/lid suspend = disabled; X startup disables DPMS + screen blanking.
AC-loss grace → `ac-loss-policy`; emergency critical-battery shutdown remains independent.

## Automatic sleep

`ac-loss-policy apply` installs a system-level 15-second observer; suspend requires 900 seconds of observed continuous battery operation.
AC restoration, uncertain supply data or observation gaps over 45 seconds reset the grace period.
The monitor requires discharging-battery evidence and all external supplies offline. Lid and desktop idle time do not trigger it.
State lives in `/run`: reboot starts a new grace period; a suspension attempt stays latched until confirmed AC returns.
Uncertain suspend results keep the latch. Systemd inhibitors remain effective; a blocked request can leave the machine awake.
Power changes entirely between polls remain unobserved. Actual AC removal/suspend/resume require a separate physical test.

UPower's `90-remote-workstation.conf` selects `PowerOff` instead of its automatic `Sleep` action at critical battery.
KDE's existing critical-battery shutdown remains. Neither emergency threshold is changed.

```bash
python -B host/cachyos/check-ac-loss-suspend -q
python -B host/cachyos/check-ac-loss-regressions -q
host/cachyos/ac-loss-policy apply
host/cachyos/ac-loss-policy check
sudo -n /usr/local/libexec/ac-loss-suspend status
systemctl status ac-loss-suspend.timer --no-pager
```

`check` covers bytes/metadata, enabled active timer, effective units, successful monitor execution and UPower's live critical action.
`rollback` removes only matching deployed files, stops the observer, and restores UPower's previous configuration precedence.

## Graphics activation

`intel-graphics-policy apply` changes six owned configuration/hook paths; it preserves the running desktop.
NVIDIA kernel modules, CUDA libraries, boot command line, initramfs, filesystem and network remain unchanged.
`rollback` restores the retained NVIDIA-primary recipe; it does not restart the desktop.
Both directions reject foreign files/symlinks before writes.

```bash
host/cachyos/intel-graphics-policy apply
host/cachyos/intel-graphics-policy check
bash -n host/cachyos/intel-graphics-policy host/cachyos/intel-graphics-display
shellcheck host/cachyos/intel-graphics-policy host/cachyos/intel-graphics-display
nvidia-xconfig --tree --xconfig host/cachyos/intel-graphics-xorg.conf
```

Activation closes GUI applications and interrupts VNC. Keep an independent SSH session.
Use a system-level rollback timer before restarting SDDM; SSH loss must not cancel recovery.
The timer restores NVIDIA configuration and restarts only SDDM. It cannot recover a hung kernel or failed boot.
From this host's repository root:

```bash
sudo -n systemd-run --unit=intel-graphics-rollback --on-active=5m --timer-property=AccuracySec=1s \
  /usr/bin/bash -c '/home/eturkes/.local/app/agents/host/cachyos/intel-graphics-policy rollback && /usr/bin/systemctl restart sddm.service'
sudo -n systemctl is-active intel-graphics-rollback.timer
sudo -n systemctl restart sddm.service
```

BrowserOS restart must select the existing synced profile (`Profile 3`). An unqualified launch can stop at the native profile picker.
The picker is a CDP `browser_ui` target, not a normal tab; a healthy MCP socket can still report no browser window.
Preserve the private desktop entry's launch options; keep its credentials out of logs. Refresh only the four desktop environment keys.

```bash
python - <<'PY'
import configparser
import os
import shlex
import subprocess
from pathlib import Path

env = os.environ.copy()
for line in subprocess.check_output(['systemctl', '--user', 'show-environment'], text=True).splitlines():
    key, _, value = line.partition('=')
    if key in {'DISPLAY', 'XAUTHORITY', 'XDG_SESSION_TYPE', 'XDG_CURRENT_DESKTOP'}:
        env[key] = value
entry = configparser.ConfigParser(interpolation=None)
entry.read(Path.home() / '.local/share/applications/browseros.desktop')
args = [arg for arg in shlex.split(entry['Desktop Entry']['Exec']) if arg not in {'%U', '%u', '%F', '%f'}]
subprocess.Popen([*args, '--profile-directory=Profile 3', '--restore-last-session'], env=env,
                 stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                 start_new_session=True)
PY
```

After autologin, verify rendering, CUDA, HDMI, VNC and a real browser WebGL renderer before cancelling the timer:

```bash
host/cachyos/intel-graphics-policy live
host/cachyos/check-cuda-compute
systemctl --user is-active x11vnc.service
systemctl is-active sshd.service NetworkManager.service tailscaled.service
# Desktop terminal: xrandr --current; xset q; browser WebGL renderer = Intel.
sudo -n systemctl stop intel-graphics-rollback.timer
```

`live` checks default GLX, active compositor, a single modesetting provider and zero NVIDIA graphics clients.
It also checks HDMI/panel state, usable framebuffer and disabled DPMS/blanking after KDE applies its layout.
It permits NVIDIA compute clients. CUDA check executes PTX arithmetic and compares 64 results with CPU arithmetic.
Browser inspection uses an ephemeral `about:blank` tab + `WEBGL_debug_renderer_info`; close the tab afterwards.
The returned renderer must identify Intel, not NVIDIA or software rendering. Re-list stale MCP page IDs before cleanup.
No reboot or physical HDMI/lid manipulation forms part of these checks.

## Reboot preflight

```bash
sudo -n /usr/bin/sshd -t
systemctl is-active sshd tailscaled NetworkManager ethernet-wifi-switch.timer
systemctl is-enabled sshd tailscaled NetworkManager ethernet-wifi-switch.timer
host/cachyos/lid-policy check
host/cachyos/agent-desktop check
host/cachyos/ac-loss-policy check
sudo -n host/cachyos/kernel-recovery check
dkms status
df -h / /boot
systemctl --failed --no-pager
systemctl --user --failed --no-pager
```

- Primary access = SSH TCP 9995; Xorg/SDDM/HDMI independent. VNC = loopback TCP 5900 through SSH, graphical-session dependent.
- NetworkManager wired/Wi-Fi profiles autoconnect before login; system Ethernet/Wi-Fi fallback timer owns reconciliation.
- Tailscale service starts at boot; a remote client must independently verify reachability/authentication.
- SDDM X11 autologin + user linger restore desktop/user services. Actual next-boot behavior requires a separate reboot check.
- Current kernel must have matching image, initramfs, bcachefs + NVIDIA modules. Inspect Limine image hashes after updates.
- `kernel-recovery check` = pinned image/module/entry integrity, not proof that the recovery entry boots.

## Recovery boundary

Limine reports no boot-counting support. The retained kernel shares root/user-space; automatic failed-boot rollback is absent.
Network access requires firmware → kernel → filesystem → network startup. A failure before networking needs independent console/power access.
Keep boot selections, root layout, degraded-mount policy and watchdog resets unchanged while physical recovery is unavailable.

bcachefs root spans two devices with single-copy data. Either device can lose unique data; snapshots are not disk-failure protection.
Native snapshots recover files/subvolumes; the separate FAT `/boot` and nested subvolumes need separate coverage.
Snapper's bcachefs backend does not implement default-root switching; Limine-Snapper-Sync targets Btrfs.
Defer snapshot boot integration until a recoverable boot/restore drill is possible. Configuration backups are sufficient for this graphics change.

Sources: [bcachefs snapshots](https://bcachefs.org/Snapshots/),
[Snapper bcachefs backend](https://github.com/openSUSE/snapper/blob/master/snapper/Bcachefs.h),
[default-root operation](https://github.com/openSUSE/snapper/blob/master/snapper/Filesystem.cc),
[Limine-Snapper-Sync](https://gitlab.com/Zesko/limine-snapper-sync/-/blob/master/README.md).

## Fixed graphics review

6 rows adjudicated; source-level rulings. Runtime and physical-test boundaries remain explicit above.

| Check | Ruling | Evidence / boundary |
|---|---|---|
| GPU roles | Pass | Intel PCI screen; GPU auto-attachment disabled; NVIDIA modules/libraries retained. |
| HDMI layout | Pass | HDMI activation succeeds before eDP disable. KDE post-login layout checked separately. |
| Headless/open-lid fallback | Pass, static | Closed lid retains framebuffer without eDP; open lid uses connected outputs. Physical transitions untested. |
| Deployment + rollback | Pass | Six owned paths; foreign/symlink preflight; root metadata; no implicit session restart. |
| Live claim soundness | Pass, corrected | Output/lid/framebuffer/DPMS checks; unavailable or unknown NVIDIA accounting fails. |
| Persistent display policy | Pass | PowerDevil no idle dim/off/suspend; X startup disables DPMS/blanking. |

## Fixed power review

5 rows adjudicated; 23 original tests unchanged + 7 failure regressions. Live suspend is outside this review.

| Check | Ruling | Evidence / boundary |
|---|---|---|
| Grace + interruption | Pass, corrected | Failed reset writes discard stale grace; timestamps follow observations; stale reads reset. |
| Supply evidence | Pass, corrected | Dual-battery/USB handling; malformed or unknown scope prevents suspension. |
| Request boundary | Pass, corrected | Durable latch precedes request; uncertain/nonzero results retain it; prior latch survives write errors. |
| System service | Pass | Per-boot state; desktop/network independent; inhibitor checks; emergency action = PowerOff. |
| Deployment evidence | Pass, corrected | Byte/metadata + effective-unit checks; coherent inactive/successful execution with matching exit timestamp. |
