# global

User-global Claude Code LSP marketplace. Plugins enabled in
`~/.claude/settings.json` match extensions across projects. `directory`
marketplace; install each server on `PATH` per its README.

## Scope

Serena (Headroom's user-scope MCP) = primary global LSP: ~70 languages via
`solidlsp`, servers installed on first use. This marketplace = confirmed
`solidlsp` gaps.

Marketplace: `xml`, `prolog`. Serena: html, json, markdown, python, yaml, toml,
lean4.

## Add a plugin

1. Confirm a `solidlsp` coverage gap.
2. Install the server on PATH; record the command in the plugin README.
3. `lspServers` entry (command + `extensionToLanguage`) in
   `.claude-plugin/marketplace.json`.
4. `plugins/<name>-lsp/<machine>/README.md` with install + upgrade recipe
   (`aeon`, `cachyos`, …) — install steps are per-machine, the `lspServers`
   entry above is shared.
5. Enable: `enabledPlugins` (`settings.json`) + record in
   `installed_plugins.json`.
6. Upkeep: aeon → `~/agents/container/aeon/upgrade` (pinned binary); cachyos →
   repo/AUR via `paru -Syu`; plugin README → manual jars/pins.
7. Smoke-test the `initialize` handshake.
