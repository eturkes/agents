# egglog-lsp

egglog LSP via hatoo/egglog-language-server.

Install / upgrade:
1. `cargo install egglog` (places the `egglog` binary on PATH).
2. Build the LSP from source:
   ```
   git clone https://github.com/hatoo/egglog-language-server.git
   cd egglog-language-server
   cargo build --release -p egglog-language-server
   install -m 755 target/release/egglog-language-server ~/.local/bin/egglog-lsp
   ```

Notes:
- The upstream extension assumes auto-build via VSCode; we rename the binary to
  `egglog-lsp` and put it directly on PATH.
- The server requires the `egglog` binary on PATH to evaluate files.

Last verified: egglog 2.0.0 + upstream LSP 0.1.0 on Debian 13 trixie.
