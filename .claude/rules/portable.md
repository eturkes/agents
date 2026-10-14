---
paths: ["claude/CLAUDE.project.md", "claude/agents/**", "claude/spec-lint", "claude/check-portable", "codex/AGENTS.project.md", "codex/*/AGENTS*.md"]
---

# Portable template files

- Projects copy `claude/CLAUDE.project.md`, `claude/agents/*.md` and `claude/spec-lint` (`claude/prompts/README.md` `Template files`); Codex projects copy `codex/AGENTS.project.md`. Projects must work for other developers, so these files name nothing outside the project: no home or machine paths, no reference to this repo, no machine-specific tools or model routing, no pointers into user-level `CLAUDE.md` or `AGENTS.md` sections.
- Machine facts go to the host files: `claude/<host>/CLAUDE.md` and `codex/<host>/AGENTS.md`.
- A change to a template file reaches a project at its next refresh, which I start.

Checks:

```sh
claude/check-portable
printf '%s\n' 'see ~/x' | claude/check-portable -   # planted input → rc 1
shellcheck -s sh claude/check-portable
```
