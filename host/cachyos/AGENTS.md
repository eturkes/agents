# CachyOS host

- Workflow → `MAINTENANCE.md`; one package-manager owner; preserve existing upgrade gates.
- Recipes = `agent-desktop`, `lid-policy`, `normalize-dns`, `cache-retention`, `prune-desktop`, `kernel-recovery`.
- Package protection → `prune-desktop` policy; preserve project runtimes + user app data.
- Host checks, cwd=this directory → `./agent-desktop check`, `./lid-policy check`, `sudo -n ./kernel-recovery check`, `python ./check-kernel-recovery`.
- Guard regressions → `python ./check-prune-desktop`, `python ./check-kernel-recovery-regressions`, `python ./check-cache-retention`.
- Instruction checks, cwd=repo root → `codex/cachyos/check-instructions`, `codex/cachyos/deploy-instructions`.
- Static checks: Bash → ShellCheck; Python → Ruff + syntax. Report failing checks with their causes.
- Icon rules + checks → `sonic-icons/AGENTS.md`.
- Closed-lid VNC restart activation + safe GUI check → `sonic-restart/README.md`.
