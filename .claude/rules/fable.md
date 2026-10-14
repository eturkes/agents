---
paths: ["claude/cachyos/CLAUDE.md", "claude/aeon/CLAUDE.md", "claude/cachyos/settings.json", "claude/aeon/settings.json", "claude/cachyos/fable/CLAUDE.md", "claude/aeon/fable/CLAUDE.md", "claude/check-fable", "claude/link-profile", "claude/check-link-profile"]
---

# Fable profile

- `claude/<host>/fable/CLAUDE.md` = host sibling + `claude/check-fable` `EDITS` − advisor text: MAIN = Fable 5.1 via launch `--model`, Fable-relative teammate profile, Fable 5.1 guide prompts in place of the host's Opus 5.5 guide prompts. Shared-text edit = host file + `claude/check-fable --write`; Fable-only edit → `EDITS`; a vendor-guide prompt → its model's file. The Fable guide's `Finish the whole task` autonomy paragraph + its exception stay out: I answer questions mid-task. Profile `settings.json` = link to the host file (`claude/link-profile`).
- Gate = `claude/check-fable` + `claude/check-link-profile` + `shellcheck -s sh -e SC2016 claude/link-profile claude/check-link-profile`. Firing (drift in copies → `check-fable` failed files): host-only shared edit 1, Fable-only shared edit 1, anchor drift 1, Opus-guide anchor drift 1, Fable bullet 1, Fable-guide bullet dropped 1, advisor line in Fable copy 1, host advisor anchor lost 1; (mutants of `claude/link-profile` → failed cases): profile skip dropped 1, own-file skip dropped 11, empty-dir swap dropped 6, identical-copy link dropped 1, migrate dropped 1, `--check` guard dropped 2, dangling drop dropped 1, relink dropped 1, `.claude.json` link dropped 2.
- Deploy = `claude/prompts/README.md` `Fable as MAIN`; synced = `claude/link-profile --check fable` → `fable: 0 changes needed, 0 conflicts`.
