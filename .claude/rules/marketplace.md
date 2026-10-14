---
paths: ["claude/marketplace/**"]
---

# LSP marketplace

- Claude Code reinstalls a plugin only when its `version` changes, so each version is a content hash that `claude/marketplace/stamp-versions` writes. After you change a plugin folder or its `marketplace.json` entry, `git add` new files, run `stamp-versions`, and commit the restamped manifest with the change.
- Installed plugins update manually, by my choice: `claude plugin update <name>@global --scope user`, then restart or `/reload-plugins`. Keep `FORCE_AUTOUPDATE_PLUGINS` off.

Checks:

```sh
claude/marketplace/stamp-versions --check
python -B claude/marketplace/check-stamp-versions -q
shellcheck claude/marketplace/stamp-versions
ruff check claude/marketplace/check-stamp-versions
claude plugin validate claude/marketplace
```
