---
paths: ["claude/cachyos/CLAUDE.md", "claude/aeon/CLAUDE.md", "claude/cachyos/settings.json", "claude/aeon/settings.json", "claude/cachyos/fable/CLAUDE.md", "claude/aeon/fable/CLAUDE.md", "claude/check-fable", "claude/link-profile", "claude/check-link-profile"]
---

# Host config

- `claude/cachyos/` and `claude/aeon/` hold each host's `~/.claude/CLAUDE.md` and `~/.claude/settings.json`. The two hosts share most of the text, so make shared changes in both. `git diff --no-index claude/aeon/CLAUDE.md claude/cachyos/CLAUDE.md` shows the host-specific lines.
- Each host deploys its own files as plain copies. On CachyOS: `cp claude/cachyos/CLAUDE.md claude/cachyos/settings.json ~/.claude/`. Claude Code also writes to the live `settings.json` (for example `/effort`), so compare the two files first and carry any live change you want to keep into the repo file.
- `claude/<host>/fable/CLAUDE.md` is generated from the host `CLAUDE.md`: `claude/check-fable` applies its `EDITS` (Fable-specific text, including the Fable prompting-guide prompts that replace the Opus ones) and removes the advisor bullets. Edit the host file or `EDITS`, then run `claude/check-fable --write`.
- Keep the Fable guide's "Finish the whole task" autonomy paragraph out of the Fable copy, because I answer questions mid-task.
- The Fable profile deploys as `claude/prompts/README.md` (`Fable as MAIN`) describes. When the profile is in sync, `claude/link-profile --check fable` prints `fable: 0 changes needed, 0 conflicts`.

Checks:

```sh
claude/check-fable
claude/check-link-profile
shellcheck -s sh -e SC2016 claude/link-profile claude/check-link-profile
```
