---
paths: ["codex/*/AGENTS.codexify.md", "codex/cachyos/deploy-instructions", "codex/cachyos/check-instructions", "codex/nixbox/**"]
---

# Codexify instructions

- `codex/<host>/AGENTS.codexify.md` = that host's `~/AGENTS.md`: Codexify loads it once a chat's workspace = `~`. Shared text → edit every host copy; host-specific lines = `git diff --no-index` between copies.
- Deploy: cachyos → `codex/cachyos/deploy-instructions --apply` (+ `~/.codex/AGENTS.md`, stale trust pruning); nixbox → `codex/nixbox/deploy-instructions` (SSH as `eturkes`).
- nixbox runs Codexify ≥ 2.3: every chat selects a workspace, and only the selected directory's `AGENTS.md` loads ⇒ its deploy keeps catalogue entry `.` (alias `trading`) + `worktrees.mode` = `never` (`auto` → every later chat on `~` gets a git worktree → `git rev-parse` fails, `~` = no repo).
- nixbox `~/.codex/` = trading's pinned Codex home ⇒ instruction + trust changes there = trading scope.

Checks:

```sh
codex/cachyos/check-instructions
codex/nixbox/deploy-instructions --check   # live drift → rc 1
shellcheck -s sh codex/nixbox/deploy-instructions
```
