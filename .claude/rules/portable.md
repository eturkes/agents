---
paths: ["claude/CLAUDE.project.md", "claude/agents/**", "claude/spec-lint", "claude/check-portable", "codex/AGENTS.project.md", "codex/*/AGENTS*.md"]
---

# Portable template files

- Projects copy `claude/CLAUDE.project.md`, `claude/agents/*.md` + `claude/spec-lint` (`claude/prompts/README.md` `Template files`); Codex projects copy `codex/AGENTS.project.md`. Projects stay portable across machines + users ⇒ these files name nothing outside the project: home or machine paths, this repo, machine-specific tools, model routing, user-level `CLAUDE.md`/`AGENTS.md` sections.
- Machine facts → host files: `claude/<host>/CLAUDE.md`, `codex/<host>/AGENTS.md`.
- A template change reaches a project at its next refresh, started by me.
- Each host's `~/.claude/agents/` = copies of `claude/agents/*.md`, the roles of sessions outside projects (this repo included) ⇒ a role added or changed → `cp claude/agents/*.md ~/.claude/agents/` on each host.

Checks:

```sh
claude/check-portable
printf '%s\n' 'see ~/x' | claude/check-portable -   # planted input → rc 1
shellcheck -s sh claude/check-portable
for f in claude/agents/*.md; do cmp -s "$f" ~/.claude/agents/"${f##*/}" || echo "stale: $f"; done   # home copies → no output
```
