# Claude Code LSP marketplace

This user-global marketplace provides LSP plugins for Claude Code. Enabled plugins in `~/.claude/settings.json` apply by file extension across projects. The marketplace uses a `directory` source. Install each server on `PATH` by following its README.

## Scope

Serena is the primary user-scope LSP and supports about 70 languages through `solidlsp`. It installs servers at first use. This marketplace covers `solidlsp` gaps.

- Marketplace plugins: XML and Prolog.
- Relevant Serena languages: HTML, JSON, Markdown, Python, YAML, TOML, and Lean 4.

## Add a plugin

1. Confirm that `solidlsp` has a coverage gap.
2. Install the server on `PATH`.
3. Record the installation command in the plugin README.
4. Add an `lspServers` entry to `.claude-plugin/marketplace.json`. Include the command and `extensionToLanguage` mapping.
5. Add `plugins/<name>-lsp/<machine>/README.md` with the installation and upgrade procedure.
6. Keep platform steps in the machine README. Keep the shared `lspServers` entry in the marketplace manifest.
7. Enable the plugin in `enabledPlugins` within each machine's `settings.opus.json` and `settings.fable.json`.
8. Record the plugin in `installed_plugins.json`.
9. Add the server to `upgrade-servers`. Include the upstream version resolver, installation procedure, and successful `initialize` response.

The platform upgrade entry points call `upgrade-servers`:

- Aeon: `~/agents/container/aeon/upgrade`
- CachyOS: `~/Projects/agents/host/cachyos/upgrade`

## Upgrades

`./upgrade-servers` resolves each current upstream version at run time. It installs the candidate and performs an LSP client handshake. A candidate becomes active after a successful response. If validation fails, the script restores the previous installation. State markers next to each server contain the installed versions.

- `prolog-lsp` tracks the default branch because the newest tag fails UTF-16 `initialize`. The UTF-16 initialization fix is on the default branch.
- `xml-lsp` resolves the Eclipse Maven repository `<release>` value. GitHub releases lag this artifact.

Exit codes:

- `0`: The server is current or upgraded.
- `1`: The upgrade failed and the script restored the previous installation.
- `2`: The check was incomplete.
