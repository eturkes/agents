# Claude Code LSP marketplace

This user-global marketplace provides LSP plugins for Claude Code. Enabled plugins in `~/.claude/settings.json` apply by file extension across projects. The marketplace uses a `directory` source. Install each server on `PATH` as its README describes. Then run `claude plugin install <name>@global --scope user`.

## Scope

Claude Code's built-in `LSP` tool and passive diagnostics drive every plugin here and in the official marketplace. This marketplace covers languages that the official marketplace omits.

- Official plugins in use: `pyright-lsp`, `typescript-lsp`, `rust-analyzer-lsp`.
- Marketplace plugins: Markdown (Marksman), R (`languageserver`), Bash (`bash-language-server`), XML (LemMinX), and Prolog (`lsp_server`).

## Add a plugin

1. Confirm that the official marketplace has no plugin for the language.
2. Install the server on `PATH`.
3. Record the installation command in the plugin README.
4. Add an `lspServers` entry to `.claude-plugin/marketplace.json`. Include the command and `extensionToLanguage` mapping.
5. Add `plugins/<name>-lsp/<machine>/README.md` with the installation and upgrade procedure.
6. Keep platform steps in the machine README. Keep the shared `lspServers` entry in the marketplace manifest.
7. Stage the new files with `git add`. Then run `./stamp-versions` to set the plugin version.
8. Enable the plugin in `enabledPlugins` within each machine's `settings.json`.
9. Record the plugin in `installed_plugins.json`.
10. Add the server to `upgrade-servers`. Include the upstream version resolver, installation procedure, and successful `initialize` response.

The platform upgrade entry points call `upgrade-servers`:

- aeon: `~/.local/app/agents/container/aeon/upgrade`
- CachyOS: `~/.local/app/agents/host/cachyos/upgrade`

## Plugin versions

Claude Code updates an installed plugin only when its `version` string changes. Thus `./stamp-versions` derives each version from the plugin content: `1.0.0+` and a 12-digit hash of the marketplace entry and the plugin files that git tracks.

After you change a plugin folder or its marketplace entry, stage new files with `git add`. Then run `./stamp-versions` and commit the manifest together with the change. `./stamp-versions --check` changes no files. It exits with `1` and names each plugin that has a stale version.

You update the installed plugins manually. After a pull that changes a version, run this command from this folder:

```sh
for p in $(jq -r '.plugins[].name' .claude-plugin/marketplace.json); do claude plugin update "$p@global" --scope user; done
```

A plugin without a change reports that it is already at the latest version. To use the new versions, restart Claude Code or send `/reload-plugins`. For the official plugins, first refresh their catalog with `claude plugin marketplace update claude-plugins-official`. Then run `claude plugin update <name>@claude-plugins-official --scope user` for each official plugin.

## Upgrades

Servers outside `./upgrade-servers` (`marksman`, `bash-language-server`, `pyright`, `typescript-language-server`, R `languageserver`) upgrade through their installer. Each plugin README names that method for its machine. `./upgrade-servers` covers the hand-installed servers: it resolves each current upstream version at run time, installs the candidate, and performs an LSP client handshake. The script installs each candidate before validation. If validation fails and a previous installation exists, the script restores it. State markers next to each server contain the installed versions.

- `prolog-lsp` tracks the default branch because the newest tag fails UTF-16 `initialize`. The UTF-16 initialization fix is on the default branch.
- `xml-lsp` resolves the Eclipse Maven repository `<release>` value. GitHub releases lag this artifact.

Exit codes:

- `0`: The server is current or upgraded.
- `1`: The upgrade failed. The script restored the previous installation where one existed.
- `2`: The check was incomplete.
