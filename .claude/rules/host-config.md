---
paths: ["claude/cachyos/CLAUDE.md", "claude/aeon/CLAUDE.md", "claude/cachyos/settings.json", "claude/aeon/settings.json", "claude/cachyos/fable/CLAUDE.md", "claude/aeon/fable/CLAUDE.md", "claude/cachyos/fable/settings.json", "claude/aeon/fable/settings.json", "claude/check-fable", "claude/fable", "claude/link-profile", "claude/check-link-profile"]
---

# Host config

- `claude/{cachyos,aeon}/` = each host's `~/.claude/CLAUDE.md` + `settings.json`; shared text → edit both; host-specific lines = `git diff --no-index claude/aeon/CLAUDE.md claude/cachyos/CLAUDE.md`.
- Host files load into every session ⇒ task-facing machine guidance (capabilities, tool semantics, gates, model routing) + `Delivery` = conduct toward me that every session needs, project or not (my requests as proposals, turn ends, messages to me); machine configuration, troubleshooting + derivations → on-demand docs (`host/<host>/*.md`, tool READMEs, script comments + `--help`); project practice → `claude/CLAUDE.project.md`, which projects copy.
- Deploy = plain copies per host: `cp claude/<host>/CLAUDE.md claude/<host>/settings.json ~/.claude/`. CC writes the live `settings.json` (e.g. `/effort`) → diff live vs repo first + carry each live change worth keeping into the repo file.
- `claude/<host>/fable/{CLAUDE.md,settings.json}` = generated: `claude/check-fable` applies its `BULLETS` + `EDITS` (Fable text: the Fable prompting-guide prompts replacing the Opus ones; a Code Mode session without GPT: Haiku lane, script tool calls) + drops the advisor bullets, + its `SETTINGS_*` delta (no proxy, Code Mode on, mod list bar `idle-compact`) → edit the host file or those tables, then `claude/check-fable --write`. A host edit to a line `BULLETS` replaces leaves the Fable copy as it is.
- Fable launch = `claude/fable` (`~/.local/bin/fable` = symlink → it): CC loads `<dir>/.claude/CLAUDE.md` of every directory above the launch dir as a project file ⇒ under `$HOME` a profile session also gets `~/.claude/CLAUDE.md`, the Opus host file; `claudeMdExcludes` drops it + matches user-type files too ⇒ it rides the launcher's `--settings`, never the shared `settings.json` (there it would strip Opus sessions of their host file). Probe: `fable --effort low -p '<list the CLAUDE.md paths in your context>'` from a dir under `$HOME` → the profile's file alone.
- Fable profile deploy = `claude/prompts/README.md` `Fable as MAIN` (`cp --remove-destination` for `settings.json`: a plain `cp` onto a pre-Code-Mode profile writes through its link into `~/.claude/settings.json`); in sync ⇔ `claude/link-profile --check --own settings.json fable` → `fable: 0 changes needed, 0 conflicts` + `cmp claude/<host>/fable/settings.json ~/.claude/fable/settings.json`.

Checks:

```sh
claude/check-fable
claude/check-link-profile
shellcheck -s sh claude/fable
shellcheck -s sh -e SC2016 claude/link-profile claude/check-link-profile
```
