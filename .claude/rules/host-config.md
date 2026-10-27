---
paths: ["claude/cachyos/CLAUDE.md", "claude/aeon/CLAUDE.md", "claude/cachyos/settings.json", "claude/aeon/settings.json", "claude/cachyos/fable/CLAUDE.md", "claude/aeon/fable/CLAUDE.md", "claude/check-fable", "claude/link-profile", "claude/check-link-profile"]
---

# Host config

- `claude/{cachyos,aeon}/` = each host's `~/.claude/CLAUDE.md` + `settings.json`; shared text → edit both; host-specific lines = `git diff --no-index claude/aeon/CLAUDE.md claude/cachyos/CLAUDE.md`.
- Host files load into every session ⇒ task-facing machine guidance alone (capabilities, tool semantics, gates, model routing); machine configuration, troubleshooting + derivations → on-demand docs (`host/<host>/*.md`, tool READMEs, script comments + `--help`); general practice → `claude/CLAUDE.project.md`, which projects copy.
- Deploy = plain copies per host: `cp claude/<host>/CLAUDE.md claude/<host>/settings.json ~/.claude/`. CC writes the live `settings.json` (e.g. `/effort`) → diff live vs repo first + carry each live change worth keeping into the repo file.
- `claude/<host>/fable/CLAUDE.md` = generated: `claude/check-fable` applies its `EDITS` (Fable text, incl. the Fable prompting-guide prompts replacing the Opus ones) + drops the advisor bullets → edit the host file or `EDITS`, then `claude/check-fable --write`.
- Fable profile deploy = `claude/prompts/README.md` `Fable as MAIN`; in sync ⇔ `claude/link-profile --check fable` → `fable: 0 changes needed, 0 conflicts`.

Checks:

```sh
claude/check-fable
claude/check-link-profile
shellcheck -s sh -e SC2016 claude/link-profile claude/check-link-profile
```
