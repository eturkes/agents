---
paths: ["claude/mods/away/**"]
---

# away mod

- Text tiers: `hooks/text.ts` = model-facing texts → agent-optimized; `bin/away` help + messages, the prompt-hint line, the `/away` description + `plugin.json` description = human-facing.
- Wake paths (onset, return, presence) call `$.prompt.submit`; the plugin test kit skips the host check that refuses one raised inside a hook the turn waits on ⇒ a change there also gets a live run: an interactive session in a detached `tmux` session, `CLAUDE_AWAY_DIR` = a scratch dir, launched under `env -i` (HOME, USER, PATH, TERM, LANG, SHELL, XDG_RUNTIME_DIR) so this session's `CLAUDECODE` + `CLAUDE_CODE_*` stay out; `claude --bg` needs a folder trusted once in the REPL; `claude purge -y <dir>` after.

Checks (beside the mods README `Check` steps):

```sh
python -B claude/mods/away/tests/check-away -q
ruff check claude/mods/away/bin/away claude/mods/away/tests/check-away
```
