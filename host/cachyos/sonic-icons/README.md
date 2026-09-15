# Silver icon repair

User Silver manifests override installed theme metadata. Missing directory declarations or obsolete inheritance can hide installed icons.
The repair combines installed metadata with local-only size directories. Rerun it when the installed Silver manifest changes.

## Commands

From the repository root, run:

```sh
cd host/cachyos/sonic-icons
```

| Purpose | Command |
| --- | --- |
| Preview changes | `./repair` |
| Apply changes | `./repair --apply` |
| Check isolated repair cases | `./check-repair -q` |
| Run the native icon gate | `./check` |
| Inspect all icon lookups | `./inspect` |

The native tools require `g++`, `pkg-config`, and Qt6 development files.
Pass icon names to `inspect` for a narrower diagnostic.
To exclude these user overlays, set `XDG_DATA_HOME` to an empty temporary directory for `inspect`.

## Results

The native gate checks exact-name lookup and non-null pixmaps at 16, 32, and 64 pixels.
It stops checking an icon after that icon first fails.
`inspect` reports null-pixmap counts independently. Its exit status reports execution success, not a passing gate.
Exact-name fallback failures remain failures, even when Qt renders an icon.

## Reload live icons

After applying a repair, run:

```sh
dbus-send --session --type=signal /KIconLoader org.kde.KIconLoader.iconChanged int32:0
```

If images remain stale, restart only the shell service:

```sh
systemctl --user restart plasma-plasmashell.service
```

Inspect the closed panel and launcher at native screenshot resolution.
With `--no-respawn`, `refreshCurrentShell()` can exit without restarting the shell service.
