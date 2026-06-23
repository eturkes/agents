# turtle-lsp

Turtle/RDF LSP via Stardog `turtle-language-server`.

Install: added to the shared lsp-node pnpm workspace so the container upgrade
script keeps it current (`pnpm -C ~/.local/share/lsp-node update --latest`):

    pnpm -C ~/.local/share/lsp-node add turtle-language-server

Then a `turtle-language-server` wrapper in `~/.local/bin/` execs
`node .../lsp-node/node_modules/turtle-language-server/dist/cli.js "$@"`; this
plugin passes `--stdio`.

Tested: turtle-language-server 3.5.0 on Node 20.
