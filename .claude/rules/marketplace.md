---
paths: ["claude/marketplace/**"]
---

# LSP marketplace

- Plugin `version` = `stamp-versions` output: `1.0.0+<12 hex over the entry minus version + git-tracked plugin files>`. Why: `claude plugin update` reinstalls only on a changed version string → an unstamped edit never reaches installs.
- Any edit to a plugin folder or its `marketplace.json` entry → `git add` new files → `claude/marketplace/stamp-versions` → commit the restamped manifest with the edit.
- Install updates stay manual (user ruling): `claude plugin update <name>@global --scope user` per plugin, then restart or `/reload-plugins`; CC plugin auto-update (`FORCE_AUTOUPDATE_PLUGINS`) stays off.
- Gate = `claude/marketplace/stamp-versions --check` + `python -B claude/marketplace/check-stamp-versions -q` + `shellcheck claude/marketplace/stamp-versions` + `ruff check claude/marketplace/check-stamp-versions` + `claude plugin validate claude/marketplace`. Firing: unstamped manifest (`1.0.0` ×5) → `--check` exit 1 + 5 `stale:` lines; (mutants of `stamp-versions` → failed cases of 11): `del(.version)` dropped 7, key sort dropped 2, entry hash dropped 2, file content hash dropped 2, file path hash dropped 2, tracked files → every file 2, `--check` writes 6, `--check` exit 1 dropped 6, `pipefail` dropped 1.
