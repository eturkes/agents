---
paths: ["codex/*/AGENTS.codexify.md", "codex/*/deploy-instructions", "codex/cachyos/check-instructions", "codex/nixbox/**", "codex/*codexify-startup*"]
---

# Codexify instructions

- `codex/<host>/AGENTS.codexify.md` = that host's `~/AGENTS.md`: load at MCP startup + unbound `get_agent_brief`, then select workspace `~`. Shared text → edit every host copy; host-specific lines = `git diff --no-index` between copies.
- Deploy: cachyos → `codex/cachyos/deploy-instructions --apply` (+ `~/.codex/AGENTS.md`, stale trust pruning, Codexify config policy); aeon → `codex/aeon/deploy-instructions --apply` (cachyos policy + writer; no trust pruning: host-layer paths absent in-container ≠ stale); nixbox → `codex/nixbox/deploy-instructions` (SSH as `eturkes`). Restart cachyos/nixbox with `systemctl --user restart codexify.service`; aeon = direct process, relaunch from `~` (detached logs = `~/.codexify/codexify.log`).
- cachyos, aeon + nixbox run Codexify ≥ 2.2: tools advertise `destructiveHint`/`openWorldHint` = false ⇒ no per-chat permission prompt under connector `Allow all` (1.x marks shell/write tools destructive + open-world ⇒ ChatGPT asks).
- Upstream ≥ 2.2 requires workspace selection; `multiProject=false` is ignored. `codex/codexify-startup` builds pinned upstream + `codex/codexify-startup.patch`; `projectDoc.includeAtStartup=true` includes access-root instructions before selection. Default/off, instruction discovery/budget + conversation authorization stay intact; conversation-specific state loads only after selection. The home instructions choose `.` for an unbound chat; no special opener is needed. Existing bindings stay intact.
- Each deploy keeps `projectDoc.includeAtStartup=true`, catalogue entry `.` (nixbox alias `trading`), `worktrees.mode=never` (`~` is not a Git repo), `uiWidgets` + `agentChat.enabled=false` (plain chat, no MCP App cards).
- Native patch lifecycle: `codex/codexify-startup build` → `install` → restart → `check`; portable prebuilt install = `install /path/to/codexify`. Previous binary = `~/.codexify/bin/codexify.before-startup-doc`. Upstream self-updates replace the patch → reapply + rerun the live check; advancing the pinned base requires replaying the patch + tests first.
- Config change → refresh the ChatGPT connector (Plugins → `Codexify - <host>` → Refresh tools).
- nixbox `~/.codex/` = trading's pinned Codex home ⇒ instruction + trust changes there = trading scope.

Checks:

```sh
codex/cachyos/check-instructions
codex/check-codexify-startup               # live MCP initialize + fresh unbound brief must contain full ~/AGENTS.md
codex/aeon/deploy-instructions             # live drift → rc 1
codex/nixbox/deploy-instructions --check   # live drift → rc 1
shellcheck -s sh codex/nixbox/deploy-instructions
```
