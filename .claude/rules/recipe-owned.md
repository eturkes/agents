---
paths: ["host/cachyos/recipe-owned", "host/cachyos/check-recipe-owned", "host/cachyos/ac-loss-policy", "host/cachyos/intel-graphics-policy", "host/cachyos/nvidia-prime-policy"]
---

# Recipe ownership

- `apply` and `rollback` in `ac-loss-policy`, `intel-graphics-policy` and `nvidia-prime-policy` replace or remove a deployed file only when `recipe-owned <source> <target>` passes: the target is a regular file that holds the current or a committed version of the source. Symlinks, other file types and unknown content are refused.
- Ownership comes from git history, so commit a source change before you deploy it. Otherwise the deployed edit looks foreign once the source moves on.

Checks (`check-recipe-owned` needs user namespaces and passwordless `sudo -n`):

```sh
python -B host/cachyos/check-recipe-owned -q
for f in host/cachyos/{recipe-owned,ac-loss-policy,intel-graphics-policy,nvidia-prime-policy}; do bash -n "$f"; done
shellcheck host/cachyos/{recipe-owned,ac-loss-policy,intel-graphics-policy,nvidia-prime-policy}
ruff check host/cachyos/check-recipe-owned
```
