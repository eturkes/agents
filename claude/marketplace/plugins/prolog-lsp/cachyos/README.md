# prolog-lsp

SWI-Prolog LSP via `jamesnvc/lsp_server`, pinned v3.16.3.

Install / upgrade:
1. `sudo pacman -S --needed swi-prolog` (Arch bundles core libraries).
2. Pin via release archive (`version()` resolves latest):
   `swipl -g "pack_install('https://github.com/jamesnvc/lsp_server/archive/refs/tags/v3.16.3.zip',[interactive(false),upgrade(true)])" -t halt`
3. Add `~/.local/bin/prolog-lsp`: run swipl over stdio; prepend
   `/usr/lib/swipl/library/ext/json` so `library(json)` resolves. First verify:
   `pacman -Fl swi-prolog | grep '/json\.pl$'`.

Notes:
- Pin rationale: v3.17.0 binds `Capabilities` inside its utf-32 branch; default
  utf-16 clients leave it unbound, then `get_dict(textDocument, Capabilities,
  _)` throws `instantiation_error` (JSON-RPC -32001). v3.16.3 initializes
  utf-16 clients. Re-check upstream before bumping.
- The interpreter is repo-packaged, so `pacman -Syu` keeps it current while the
  pack pin is managed separately via `pack_install`.

Status: CachyOS installation pending; pin regression verified on Aeon against
v3.17.0. Re-verify here before bumping.
