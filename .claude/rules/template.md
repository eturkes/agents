---
paths: ["claude/CLAUDE.project.md", "claude/agents/**", "codex/AGENTS.project.md"]
---

# Template files

- Projects copy `claude/CLAUDE.project.md`, `claude/agents/*.md` + `claude/spec-lint` (`claude/prompts/README.md` `Template files`); Codex projects copy `codex/AGENTS.project.md`. A template change reaches a project at its next refresh, started by me.
- Each host's `~/.claude/agents/` = copies of `claude/agents/*.md`, the roles of sessions outside projects (this repo included) ⇒ a role added or changed → `cp claude/agents/*.md ~/.claude/agents/` on each host.

Checks:

```sh
for f in claude/agents/*.md; do cmp -s "$f" ~/.claude/agents/"${f##*/}" || echo "stale: $f"; done   # home copies → no output
```
