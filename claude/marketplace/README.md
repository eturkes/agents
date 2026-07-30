# global

User-global Claude Code LSP marketplace. Plugins enabled in
`~/.claude/settings.json` match extensions across projects. `directory`
marketplace; install each server on `PATH` per its README.

## Scope

Serena (user-scope MCP) = primary global LSP: ~70 languages via
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
6. Add the server to `upgrade-servers`: how to resolve its latest version, how
   to install it, and what a good `initialize` response looks like.
7. Upkeep is then automatic — aeon → `~/agents/container/aeon/upgrade`; cachyos
   → `~/Projects/agents/host/cachyos/upgrade`. Both call `upgrade-servers`.

## Upgrades

No versions are recorded anywhere in this tree — hand-maintained pins drift.
`./upgrade-servers` resolves each server's current release from upstream at
run time, installs it, handshakes it as a real LSP client, and **rolls back**
on failure; a server goes live only after answering correctly ("latest" alone
can break `initialize`). Installed versions live in state markers next to each
server.

- prolog-lsp tracks the **default branch**, not tags: the newest tag breaks
  utf-16 `initialize` and the fix is untagged — "latest release" resolves
  backwards into the bug.
- xml-lsp resolves from the Eclipse Maven repo's `<release>`, not GitHub
  releases, which report an ancient version.

Exit codes: 0 current/upgraded, 1 an upgrade failed and was rolled back,
2 a check could not complete.
