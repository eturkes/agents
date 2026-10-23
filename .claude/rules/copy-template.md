---
paths: ["claude/copy-template", "claude/check-copy-template"]
---

# Copy template

- `claude/copy-template` = the `Template files` copy step (`claude/prompts/README.md`): `claude/CLAUDE.project.md` → `CLAUDE.md`, `claude/spec-lint` → `.agent/spec-lint`, `claude/agents/*.md` → `.claude/agents/`. A template file added, renamed or dropped → this mapping, the README table + `claude/check-portable`'s default list move together.
- Never deletes: a role file the template lacks = the project's own (`refresh.md` step 2). Refuses before any write: not a git root, this repo, no `CLAUDE.md` without `--new` (keeps a `~/Projects/*` glob out of non-template repos), a symlink on a target path, a differing target with uncommitted changes.
- `~/.local/bin/copy-template` = symlink → `claude/copy-template` ⇒ edits live at once. New machine: `ln -s ~/.local/app/agents/claude/copy-template ~/.local/bin/copy-template`.

Checks:

```sh
claude/check-copy-template
shellcheck -s sh -e SC2016 claude/copy-template claude/check-copy-template
```
