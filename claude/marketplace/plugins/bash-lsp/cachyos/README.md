# Bash language server on CachyOS

`bash-language-server` provides diagnostics, definitions, and hover for shell scripts. It runs `shellcheck` for diagnostics when `shellcheck` is on `PATH`.

## Prerequisites

1. Run `sudo pacman -S --needed bash-language-server`.
2. Keep `shellcheck` installed. The `shellcheck-bin` AUR package satisfies this.
3. Confirm that `bash-language-server --version` prints a version.

`paru -Syu` upgrades both packages with the system.
