---
paths: ["claude/notify-scan", "claude/check-notify-scan"]
---

# Notify scan

- Gate = `claude/check-notify-scan` (36 cases) + `shellcheck -s sh -e SC2016 claude/notify-scan claude/check-notify-scan`. Firing (mutants of the gated script): subagent glob removed → 6 cases fail; `unique_by(.id)` dropped → 4; empty-cwd guard dropped → 1; in-place regex needing a second space before `-i` → 7; runtime-path exclusion dropped → 6.
- Deploy = `ln -s ~/.local/app/agents/claude/notify-scan ~/.local/bin/notify-scan` (a link).
