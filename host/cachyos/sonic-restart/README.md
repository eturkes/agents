# Closed-lid restart

Scope = SonicDE X11 + VNC + zero active RandR monitors.
Qt exposes `0×0` geometry → logout greeter skips window creation → focus timeout leaves an invisible D-Bus owner.

`launch` selects `QT_XCB_NO_XRANDR=1` + `QSG_NO_VSYNC=1` + `QSG_RENDER_LOOP=basic` only when `xrandr --listactivemonitors` reports zero monitors.
Qt then uses the existing X root framebuffer. Active-monitor launches retain RandR; the physical panel stays disabled.
The render overrides also restore drawing + countdown updates when no monitor supplies display refresh.
The wrapper preserves the packaged greeter, theme, confirmation countdown and shutdown backend.

```bash
host/cachyos/sonic-restart/deploy apply
host/cachyos/sonic-restart/deploy check
host/cachyos/sonic-restart/check
host/cachyos/sonic-restart/preview
for script in host/cachyos/sonic-restart/{launch,deploy,check,preview}; do bash -n "$script" || exit; done
shellcheck host/cachyos/sonic-restart/{launch,deploy,check,preview}
```

Deployment = user D-Bus service + `~/.local/libexec/sonic-logout-greeter` symlink; no package-file changes.
An existing stuck greeter must stop before activation can select the wrapper. Stop its exact transient unit, never the desktop session.

GUI check = real greeter on the live X display; activation-free private session bus + disconnected system bus + upstream `PLASMA_SESSION_GUI_TEST` backend.
The test bus has no service directories: private portal instances would otherwise displace the live document portal's FUSE mount.
Assertions = visible/focused nonzero window → targeted Return → `reboot` test-backend output + clean exit.
Optional arguments = executable path, screenshot path. The check never requests a host power action.
Baseline command = `check /usr/lib/ksmserver-logout-greeter` with lid closed and zero active monitors.
Real reboot + next-login persistence require separate validation; the GUI check covers neither.
`preview` captures the actual fullscreen restart dialog after three seconds; inspect its PNG for rendered controls.
Both tools retain the live session; no VNC client connection is opened.

## Review

Fixed set = 5 rows; 5 adjudicated by source inspection. Runtime checks remain the commands above.

| Check | Ruling | Evidence / boundary |
|---|---|---|
| Headless dispatch | Pass | Exact zero-monitor condition; child-only overrides; packaged executable + arguments retained. |
| Active monitors | Pass | Nonzero-monitor branch leaves renderer settings unchanged; physical multi-monitor runtime not exercised. |
| Deployment ownership | Pass | Existing foreign definitions + service symlinks rejected; repeat apply produces identical bytes. |
| Preview isolation + cleanup | Pass | Unconditional activation-free private bus; child PID owns prompt; disconnected system bus; bounded TERM → KILL cleanup. |
| Claim limits | Pass | Mapped/focused test + separate rendered preview; real reboot + next-login validation excluded. |

Sources:

- [Greeter screen admission + timeout](https://github.com/Sonic-DE/sonic-workspace/blob/ddf0e9f8029f496923379f15f5f262a413d01f04/logout-greeter/greeter.cpp)
- [Qt monitor initializer + root-size fallback](https://github.com/qt/qtbase/blob/v6.11.2/src/plugins/platforms/xcb/qxcbscreen.cpp)
- [Qt RandR environment switch](https://github.com/qt/qtbase/blob/v6.11.2/src/plugins/platforms/xcb/qxcbconnection_basic.cpp)
- [Qt Quick rendering controls](https://doc.qt.io/qt-6/qtquick-visualcanvas-scenegraph.html)
- [Upstream test backend selection](https://github.com/Sonic-DE/sonic-workspace/blob/ddf0e9f8029f496923379f15f5f262a413d01f04/libkworkspace/sessionmanagementbackend.cpp)
- [D-Bus user service precedence](https://dbus.freedesktop.org/doc/dbus-daemon.1.html)
