---
paths: ["host/cachyos/recipe-owned", "host/cachyos/check-recipe-owned", "host/cachyos/ac-loss-policy", "host/cachyos/intel-graphics-policy", "host/cachyos/nvidia-prime-policy"]
---

# Recipe ownership

- `apply` + `rollback` of `ac-loss-policy`, `intel-graphics-policy` + `nvidia-prime-policy` replace or remove an existing target only when `recipe-owned <source> <target>` passes = a regular file holding the source's bytes or any committed version of them; symlinks, other file types + unknown bytes stay refused. Why: exact-match ownership refuses the recipe's own stale deployment → source edits never reach the host.
- Ownership = git history → commit a source before deploying it; a deployed uncommitted edit reads as foreign once the source moves on. Root without `SUDO_UID` (`REMOTE-REBOOT.md` rollback timer) reaches history via `-c safe.directory='*'`; a target equal to the current source needs no git.
- Gate = `python -B host/cachyos/check-recipe-owned -q` (needs `unshare` user+mount namespaces + `sudo -n`) + `bash -n` + `shellcheck` on `recipe-owned` + the 3 recipes + `ruff check host/cachyos/check-recipe-owned`. Firing (mutants → failed cases of 17): `recipe-owned` symlink check dropped 2, regular-file check dropped 1, cmp fast path dropped 2, history lookup dropped 9, `safe.directory` dropped 1, `--all` dropped 1, `--diff-merges` dropped 1, path limit dropped 1; `ac-loss-policy` guard → exact cmp 2, dangling-symlink clause dropped 1, guard dropped 3; `intel-graphics-policy` guard → exact cmp 2, dropped 1; `nvidia-prime-policy` guard → exact cmp 2, dropped 1.
