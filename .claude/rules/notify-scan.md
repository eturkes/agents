---
paths: ["claude/notify-scan", "claude/check-notify-scan"]
---

# Notify scan

- `~/.local/bin/notify-scan` = symlink → `claude/notify-scan` ⇒ edits live at once. New machine: `ln -s ~/.local/app/agents/claude/notify-scan ~/.local/bin/notify-scan`.

Checks:

```sh
claude/check-notify-scan
shellcheck -s sh -e SC2016 claude/notify-scan claude/check-notify-scan
```
