---
paths: ["codex/*/AGENTS.codexify.md", "codex/cachyos/deploy-instructions", "codex/cachyos/check-instructions", "codex/nixbox/**"]
---

# Codexify instructions

- `codex/<host>/AGENTS.codexify.md` = that host's `~/AGENTS.md`: Codexify loads it once a chat's workspace = `~`. Shared text → edit every host copy; host-specific lines = `git diff --no-index` between copies.
- Deploy: cachyos → `codex/cachyos/deploy-instructions --apply` (+ `~/.codex/AGENTS.md`, stale trust pruning, Codexify config policy); nixbox → `codex/nixbox/deploy-instructions` (SSH as `eturkes`).
- cachyos + nixbox run Codexify ≥ 2.2 (aeon = 1.x until upgraded): tools advertise `destructiveHint`/`openWorldHint` = false ⇒ no per-chat permission prompt under connector `Allow all` (1.x marks shell/write tools destructive + open-world ⇒ ChatGPT asks).
- ≥ 2.2: every chat selects a workspace, and only the selected directory's `AGENTS.md` loads ⇒ each deploy keeps catalogue entry `.` (nixbox alias `trading`), `worktrees.mode` = `never` (`auto` → every later chat on `~` gets a git worktree → `git rev-parse` fails, `~` = no repo), `uiWidgets` + `agentChat.enabled` = false (plain chat, no MCP App cards).
- Config change → refresh the ChatGPT connector (Plugins → `Codexify - <host>` → Refresh tools).
- nixbox `~/.codex/` = trading's pinned Codex home ⇒ instruction + trust changes there = trading scope.

Checks:

```sh
codex/cachyos/check-instructions
codex/nixbox/deploy-instructions --check   # live drift → rc 1
shellcheck -s sh codex/nixbox/deploy-instructions
```
