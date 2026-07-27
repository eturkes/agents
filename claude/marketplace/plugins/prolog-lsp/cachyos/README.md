# prolog-lsp

SWI-Prolog LSP via the `lsp_server` pack (jamesnvc/lsp_server), pinned to
v3.16.3.

Install / upgrade:
1. `sudo pacman -S --needed swi-prolog` — Arch ships one package with the
   library bundles included, so there is no separate core-packages split to
   install (Debian's `swi-prolog-nox` + `swi-prolog-core-packages`).
2. Install the pack pinned to 3.16.3. The registry `version()` option is ignored
   (it installs latest), so install from the release archive:
   `swipl -g "pack_install('https://github.com/jamesnvc/lsp_server/archive/refs/tags/v3.16.3.zip',[interactive(false),upgrade(true)])" -t halt`
3. Drop a `prolog-lsp` wrapper into `~/.local/bin/` that runs swipl over stdio.
   Arch's library layout differs from Debian's: `library(json)` lives at
   `/usr/lib/swipl/library/ext/json` (Debian namespaces it under the http ext
   dir), so prepend that path — verify with
   `pacman -Fl swi-prolog | grep '/json\.pl$'` before writing the wrapper, since
   the bare `library(json)` that lsp_server loads must resolve.

Notes:
- Pinned to 3.16.3 deliberately: 3.17.0 regressed `initialize` — it binds the
  client `Capabilities` dict only inside a `general.positionEncodings` "utf-32"
  check, so a client advertising only utf-16 (the LSP default, including Claude
  Code) backtracks that conditional, leaves `Capabilities` unbound, and the next
  `get_dict(textDocument, Capabilities, _)` throws `instantiation_error`
  (JSON-RPC -32001 on initialize). 3.16.3 does no such introspection. Re-check
  upstream before bumping the pin.
- The interpreter is repo-packaged, so `pacman -Syu` keeps it current while the
  pack pin is managed separately via `pack_install`.

Not yet installed on this machine — recipe only. The pin regression was verified
on the Aeon profile against v3.17.0; re-verify before bumping here too.
