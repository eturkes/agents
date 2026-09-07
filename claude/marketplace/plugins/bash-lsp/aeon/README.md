# Bash language server on Aeon

`bash-language-server` provides diagnostics, definitions, and hover for shell scripts. It runs `shellcheck` for diagnostics when `shellcheck` is on `PATH`.

## Prerequisites

1. Run `pnpm add -g bash-language-server`.
2. Run `sudo apt install shellcheck`.
3. Confirm that `bash-language-server --version` prints a version.

`pnpm update -g --latest` upgrades the server. `apt` upgrades `shellcheck` with the system.
