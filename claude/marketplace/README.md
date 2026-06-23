# global

User-global Claude Code LSP marketplace — plugins enabled in
`~/.claude/settings.json`, matched by file extension in every project, no
project-level config. `directory` marketplace; server binaries must be on PATH
(install per plugin README).

## Gap-fill only

Serena (Headroom's user-scope MCP) is the primary, global LSP: ~70 mainstream
languages via `solidlsp`, servers installed on first use. A server can be added
to either layer at any time. This marketplace holds ONLY languages `solidlsp`
can't do — prefer Serena; add here only for a real gap.

Gaps (current): `xml`, `alloy`, `dolmen` (SMT-LIB/TPTP/DIMACS), `egglog`,
`turtle`, `prolog`, `souffle`. Covered by Serena (not here): html, json,
markdown, python, yaml, toml, lean4.

## Add a plugin

1. Confirm `solidlsp` lacks it (else use Serena).
2. Install the server on PATH; record the command in the plugin README.
3. `lspServers` entry (command + `extensionToLanguage`) in
   `.claude-plugin/marketplace.json`.
4. `plugins/<name>-lsp/README.md` with install + upgrade recipe.
5. Enable: `enabledPlugins` (`settings.json`) + record in
   `installed_plugins.json`.
6. Upkeep in `~/agents/container/upgrade` (pinned binary) or lsp-node (Node).
7. Smoke-test the `initialize` handshake.
