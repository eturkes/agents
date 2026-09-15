# CachyOS host

- Maintenance entry = `MAINTENANCE.md`; package operations have one owner. Preserve existing upgrade gates.
- Runtime configuration recipes = `agent-desktop`, `normalize-dns`, `cache-retention`, `prune-desktop`, `kernel-recovery`.
- Retained tools = Claude/Headroom/CLIProxyAPI, Thunderbird, RStudio/R, BrowserOS, document tooling + direct build tools.
- Direct checks = `agent-desktop check`, `kernel-recovery check --capture-prefix` (sudo), `check-kernel-recovery`; instruction deployment checks = `../../codex/cachyos/check-instructions` + `deploy-instructions`.
- Static checks = ShellCheck for Bash; Ruff + Python parse for Python. Keep original failing checks visible with their specific cause.
- Icon migration + diagnostics = `sonic-icons/AGENTS.md`; selected-theme assets remain intact.
