---
paths: ["claude/marketplace/**"]
---

# LSP marketplace

- CC reinstalls a plugin only on a `version` change ⇒ version = content hash written by `claude/marketplace/stamp-versions`. Plugin folder or `marketplace.json` entry changed → `git add` new files → `stamp-versions` → commit the restamped manifest with the change.
- Installed plugins update manually (my choice): `claude plugin update <name>@global --scope user`, then restart or `/reload-plugins`;

Checks:

```sh
claude/marketplace/stamp-versions --check
python -B claude/marketplace/check-stamp-versions -q
shellcheck claude/marketplace/stamp-versions
ruff check claude/marketplace/check-stamp-versions
claude plugin validate claude/marketplace
```
