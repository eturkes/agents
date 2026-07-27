# prolog-lsp

SWI-Prolog LSP via `jamesnvc/lsp_server`.

Tracks the default branch, not tags. `../../../upgrade-servers` installs
upstream HEAD, verifies a utf-16 `initialize` handshake, and rolls back on
failure. It runs from `container/aeon/upgrade`, so there is nothing to do by
hand and no version recorded here.

Prerequisites:
1. `sudo apt-get install -y swi-prolog-nox swi-prolog-core-packages`
2. `~/.local/bin/prolog-lsp`: runs swipl over stdio, asserting
   `/usr/lib/swi-prolog/library/ext/http/http` onto
   `file_search_path(library, ...)` so `library(json)` resolves, then
   `lsp_server:main` with `-- stdio`.

Notes:
- Branch, not tags, on purpose: the newest tag (v3.17.0) binds `Capabilities`
  inside its utf-32 branch, so utf-16 clients — which is what Claude Code is —
  leave it unbound and `get_dict(textDocument, Capabilities, _)` throws
  `instantiation_error` (JSON-RPC -32001). The fix (`f67ded3a`, functional
  `Params.get(capabilities/...)` lookups) is on the branch and untagged, so
  "latest release" resolves *backwards* into the bug. The handshake gate is what
  makes tracking a branch safe: a regression is rejected, not installed.
- Install is from a local checkout because swipl's resolver ignored
  `commit()`/branch selection through a git URL on cachyos (swipl 10.0.2), and a
  bare pack name silently pulls the broken tag. A `file://` install sidesteps
  the resolver.
- `pack.pl` on the branch still declares `version('3.17.0')`, so the pack list
  reports 3.17.0 while running fixed code. The commit is the real identity.

Status: verified here. The utf-16 regression was reproduced against v3.17.0:
utf-16 `initialize` errors; utf-32 control succeeds.
