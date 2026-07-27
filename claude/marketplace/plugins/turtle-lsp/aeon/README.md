# turtle-lsp

Turtle/RDF LSP via Stardog `turtle-language-server`.

Install / upgrade:
1. Add it to the `lsp-node` pnpm workspace (currently its only dependency), so
   the container upgrade script keeps it current via
   `pnpm -C ~/.local/share/lsp-node update --latest`:
   `pnpm -C ~/.local/share/lsp-node add turtle-language-server`
2. Drop a `turtle-language-server` wrapper into `~/.local/bin/` that execs
   `node ~/.local/share/lsp-node/node_modules/turtle-language-server/dist/cli.js "$@"`.

Notes:
- This plugin passes `--stdio`.

Last verified: turtle-language-server 3.5.0 on Node 20, Debian 13 trixie.
