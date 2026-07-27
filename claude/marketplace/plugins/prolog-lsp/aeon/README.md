# prolog-lsp

SWI-Prolog LSP via `jamesnvc/lsp_server`, pinned v3.16.3.

Install / upgrade:
1. `sudo apt-get install -y swi-prolog-nox swi-prolog-core-packages`
2. Pin via release archive (`version()` resolves latest):
   `swipl -g "pack_install('https://github.com/jamesnvc/lsp_server/archive/refs/tags/v3.16.3.zip',[interactive(false),upgrade(true)])" -t halt`
3. Add `~/.local/bin/prolog-lsp`: run swipl over stdio; prepend
   `/usr/lib/swi-prolog/library/ext/http/http` so `library(json)` resolves.

Notes:
- Pin rationale: v3.17.0 binds `Capabilities` inside its utf-32 branch; default
  utf-16 clients leave it unbound, then `get_dict(textDocument, Capabilities,
  _)` throws `instantiation_error` (JSON-RPC -32001). v3.16.3 initializes
  utf-16 clients. Re-check upstream before bumping.

Verified: Debian 13 trixie, swi-prolog-nox 9.2.9, lsp_server 3.16.3. Pin
re-verified 2026-07-13 against v3.17.0: utf-16 `initialize` errors; utf-32
control succeeds.
