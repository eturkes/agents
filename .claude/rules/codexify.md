---
paths: ["codex/*/AGENTS.codexify.md", "codex/*/deploy-instructions", "codex/cachyos/check-instructions", "codex/nixbox/**", "codex/*codexify-startup*"]
---

# Codexify instructions

- `codex/<host>/AGENTS.codexify.md` → host `~/AGENTS.md`. Shared edits → every host copy; compare host-specific text with `git diff --no-index`.
- Startup = patched native Codexify + `projectDoc.includeAtStartup=true` → access-root instructions in MCP initialize + unbound `get_agent_brief`. Preserve auth gates, instruction discovery/budget + existing bindings; load workspace state after selection.
- Policy = catalogue `.` (nixbox alias `trading`), `worktrees.mode=never`, `uiWidgets=false`, `agentChat.enabled=false`. Preserve `destructiveHint`/`openWorldHint=false` for connector `Allow all`.
- Deploy: cachyos → `codex/cachyos/deploy-instructions --apply` (native instructions + stale trust pruning); aeon → `codex/aeon/deploy-instructions --apply` (preserve host-layer trust); nixbox → `codex/nixbox/deploy-instructions` over SSH as `eturkes`.
- Restart: cachyos/nixbox → `systemctl --user restart codexify.service`; aeon → relaunch direct process from `~`, detached log = `~/.codexify/codexify.log`. Config/runtime changes → refresh ChatGPT connector: Plugins → `Codexify - <host>` → Refresh tools.
- Patch = `codex/codexify-startup.patch`; lifecycle = `codex/codexify-startup build` → `install [BINARY]` → restart → `check`. After upstream updates → reapply; new base → replay patch + tests. Rollback binary = `~/.codexify/bin/codexify.before-startup-doc`.
- nixbox `~/.codex/` = trading's pinned Codex home; keep its instruction + trust changes in trading scope.

Checks:

```sh
codex/cachyos/check-instructions
codex/check-codexify-startup               # full ~/AGENTS.md in startup + fresh brief
codex/aeon/deploy-instructions             # live drift → rc 1
codex/nixbox/deploy-instructions --check   # live drift → rc 1
shellcheck -s sh codex/nixbox/deploy-instructions
```
