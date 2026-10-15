# Silver icon repair

User Silver manifests override installed theme metadata ⇒ missing directory declarations or obsolete inheritance can hide installed icons. Repair = installed metadata + local-only size directories; rerun once the installed Silver manifest changes.

## Commands

cwd = `host/cachyos/sonic-icons`:

| Purpose | Command |
| --- | --- |
| Preview changes | `./repair` |
| Apply changes | `./repair --apply` |
| Isolated repair cases | `./check-repair -q` |
| Native icon gate | `./check` |
| All icon lookups | `./inspect` |

- Native tools need `g++`, `pkg-config` + Qt6 dev files.
- `inspect <icon…>` narrows the diagnostic; `XDG_DATA_HOME` = an empty temp dir for `inspect` excludes these user overlays.

## Results

- Native gate = exact-name lookup + non-null pixmaps at 16, 32, 64 px; an icon's checks stop at its first failure.
- `inspect` counts null pixmaps independently; its exit status = execution success, never a gate pass.
- Exact-name fallback failures stay failures, even when Qt renders an icon.

## Reload live icons

After an applied repair:

```sh
dbus-send --session --type=signal /KIconLoader org.kde.KIconLoader.iconChanged int32:0
```

Images still stale → restart the shell service alone:

```sh
systemctl --user restart plasma-plasmashell.service
```

Inspect the closed panel + launcher at native screenshot resolution. `refreshCurrentShell()` with `--no-respawn` can exit without restarting the shell service.
