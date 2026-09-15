# Silver icon overlay migration

SonicDE renamed Breeze's base icons to Silver and removed Silver's separate icon generator.
Old user-generated `silver` and `silver-dark` manifests can shadow the installed base manifests.
Their obsolete inheritance hides action, application, device, and status icons.

## Repair

Run `host/cachyos/sonic-icons/repair` to inspect the required changes.
Run `host/cachyos/sonic-icons/repair --apply` to merge the installed metadata into both user overlays.
The script retains local icon assets and local-only size directories.
The installed theme supplies inheritance and shared directory metadata.
Repeat the repair after a Silver base-theme upgrade changes its manifest.

Run `host/cachyos/sonic-icons/check` to check the active native Qt icon theme.
The check requires `g++`, `pkg-config`, and the installed Qt6 development files.
It enumerates the installed theme's icon names and renders each at 16, 32, and 64 pixels.
An absent-icon control checks fallback behavior.
The check changes no desktop settings and uses an offscreen Qt platform.

[Upstream generator removal](https://github.com/Sonic-DE/sonic-silver/commit/216531f44d7af852d3b1a2c3ba8a59fb73a6aa7d).

## Diagnose a failed check

Run `host/cachyos/sonic-icons/inspect` to distinguish exact-name fallbacks from null pixmaps across the same installed inventory.
Optional icon-name arguments restrict this diagnostic to those names.
Its exit status reports execution, not a passing grade; `check` remains the unchanged grading command.

For stock-theme comparison, set `XDG_DATA_HOME` to a temporary empty directory when running `inspect`.
This excludes user icon overlays without changing the desktop.

After the repair, send the standard `org.kde.KIconLoader.iconChanged(int32:0)` session-bus signal to reload live icons.
If the shell retains stale images, restart only `plasma-plasmashell.service` and inspect the closed tray at native screenshot resolution.
`refreshCurrentShell()` exits this build's `--no-respawn` shell and does not reliably restart its service.
