# CachyOS host

- Workflow → `MAINTENANCE.md`; one package-manager owner; preserve existing upgrade gates.
- Recipes = `agent-desktop`, `agent-crash-policy`, `lid-policy`, `ac-loss-policy`, `intel-graphics-policy`, `normalize-dns`, `cache-retention`, `prune-desktop`, `kernel-recovery`.
- Host use = agents only. Crash diagnostics = native core dumps + journal + GDB; DrKonqi GUI/reporting stays dormant via `./agent-crash-policy apply`.
- Package protection → `prune-desktop` policy; preserve project runtimes + user app data.
- Host checks, cwd=this directory → `./agent-desktop check`, `./agent-crash-policy check`, `./lid-policy check`, `sudo -n ./kernel-recovery check`, `python ./check-kernel-recovery`.
- Guard regressions → `python ./check-prune-desktop`, `python ./check-kernel-recovery-regressions`, `python ./check-cache-retention`.
- Instruction checks, cwd=repo root → `codex/cachyos/check-instructions`, `codex/cachyos/deploy-instructions`.
- Static checks: Bash → ShellCheck; Python → Ruff + syntax. Report failing checks with their causes.
- Icon rules + checks → `sonic-icons/AGENTS.md`.
- Closed-lid VNC restart activation + safe GUI check → `sonic-restart/README.md`.
- Intel desktop/browser + NVIDIA compute → `./intel-graphics-policy check`, `./intel-graphics-policy live`, `./check-cuda-compute`; activation/recovery → `REMOTE-REBOOT.md`.
- AC-loss grace → `./ac-loss-policy check`, `python -B ./check-ac-loss-suspend -q`, `python -B ./check-ac-loss-regressions -q`; preserve lid-ignore + disabled desktop idle sleep.
- X11 stalls → `./check-x11-latency`; portal polling + measurement boundary → `MAINTENANCE.md`.
- Projects snapshots → `PROJECT-SNAPSHOTS.md`; native Snapper pre/post hooks, explicit NoCoW cache boundaries, manual retention.
- Snapshot checks → `python -B ./check-project-snapshots -q`, `python -B ./check-project-snapshots-migrate -q`, `./project-snapshots check`, `python -B ./check-project-snapshots-live`.
