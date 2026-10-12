---
paths: ["claude/notify-scan", "claude/check-notify-scan"]
---

# Notify scan

- Gate = `claude/check-notify-scan` + `shellcheck -s sh -e SC2016 claude/notify-scan claude/check-notify-scan`. Firing (mutants of `claude/notify-scan` → failed cases): subagent glob removed 6, `unique_by(.id)` dropped 4, empty-cwd guard dropped 1, in-place regex wanting a second space before `-i` 7, runtime-path strip dropped 6, `.agent/spec.md` row dropped 2, `check-ignore` skip dropped 5.
- Deploy = `ln -s ~/.local/app/agents/claude/notify-scan ~/.local/bin/notify-scan`.
