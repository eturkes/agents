---
paths: ["claude/notify-scan", "claude/check-notify-scan"]
---

# Notify scan

- `~/.local/bin/notify-scan` is a symlink to `claude/notify-scan`, so edits are live at once. To set it up on a new machine: `ln -s ~/.local/app/agents/claude/notify-scan ~/.local/bin/notify-scan`.

Checks:

```sh
claude/check-notify-scan
shellcheck -s sh -e SC2016 claude/notify-scan claude/check-notify-scan
```
