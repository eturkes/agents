# prolog-lsp

SWI-Prolog LSP via the `lsp_server` pack (jamesnvc/lsp_server), pinned to
v3.16.3.

Install / upgrade:
1. `sudo apt-get install -y swi-prolog-nox swi-prolog-core-packages`
2. Install the pack pinned to 3.16.3. The registry `version()` option is ignored
   (it installs latest), so install from the release archive:
   `swipl -g "pack_install('https://github.com/jamesnvc/lsp_server/archive/refs/tags/v3.16.3.zip',[interactive(false),upgrade(true)])" -t halt`
3. Drop a `prolog-lsp` wrapper into `~/.local/bin/` that runs swipl over stdio
   and prepends `/usr/lib/swi-prolog/library/ext/http/http` to the library
   search path, so the bare `library(json)` that lsp_server loads resolves
   (Debian ships it only under the http-namespaced ext dir).

Notes:
- Pinned to 3.16.3 deliberately: 3.17.0 regressed `initialize` — it binds the
  client `Capabilities` dict only inside a `general.positionEncodings` "utf-32"
  check, so a client advertising only utf-16 (the LSP default, including Claude
  Code) backtracks that conditional, leaves `Capabilities` unbound, and the next
  `get_dict(textDocument, Capabilities, _)` throws `instantiation_error`
  (JSON-RPC -32001 on initialize). 3.16.3 does no such introspection. Re-check
  upstream before bumping the pin.

Last verified: swi-prolog-nox 9.2.9 + lsp_server 3.16.3 on Debian 13 trixie. Pin
re-verified 2026-07-13 against v3.17.0 (still the latest tag): an `initialize`
from a utf-16-only client still throws `instantiation_error` (JSON-RPC -32001),
while a control client advertising utf-32 succeeds. Pin stays.
