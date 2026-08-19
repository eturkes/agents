# Prolog language server on CachyOS

`jamesnvc/lsp_server` provides the SWI-Prolog language server.

`../../../upgrade-servers` installs default-branch HEAD and stages the candidate pack. It requires a successful UTF-16 `initialize` handshake before activation. If validation fails, it restores the previous pack. `host/cachyos/upgrade` runs the shared upgrader.

## Prerequisites

1. Run `sudo pacman -S --needed swi-prolog` to install SWI-Prolog and its core libraries.
2. Configure `~/.local/bin/prolog-lsp` to run `swipl` over standard input and output.
3. Add `/usr/lib/swipl/library/ext/json` to `file_search_path(library, ...)` so that `library(json)` resolves.
4. Call `lsp_server:main` with `-- stdio`.
5. Confirm the JSON library path with `pacman -Fl swi-prolog | grep '/json\.pl$'`.

## Upgrade constraints

- Use default-branch HEAD. Tagged code mishandles UTF-16 capabilities, while the branch contains the compatible implementation.
- Install the pack from a local checkout through `file://`. This route preserves branch contents when SWI-Prolog resolves the pack.
- Use the installed-commit state marker as the runtime identity. The branch manifest can retain a tagged version value.
- Run `sudo pacman -Syu` to update the packaged interpreter.
