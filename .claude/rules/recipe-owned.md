---
paths: ["host/cachyos/recipe-owned", "host/cachyos/check-recipe-owned", "host/cachyos/ac-loss-policy", "host/cachyos/intel-graphics-policy", "host/cachyos/nvidia-prime-policy"]
---

# Recipe ownership

- `apply` + `rollback` in `ac-loss-policy`, `intel-graphics-policy`, `nvidia-prime-policy` replace or remove a deployed file only when `recipe-owned <source> <target>` passes: target = regular file holding the current or a committed source version; symlinks, other file types + unknown content → refused.
- Ownership = git history ⇒ commit a source change before deploying it; else the deployed edit reads as foreign once the source moves on.

Checks (`check-recipe-owned` needs user namespaces + passwordless `sudo -n`):

```sh
python -B host/cachyos/check-recipe-owned -q
for f in host/cachyos/{recipe-owned,ac-loss-policy,intel-graphics-policy,nvidia-prime-policy}; do bash -n "$f"; done
shellcheck host/cachyos/{recipe-owned,ac-loss-policy,intel-graphics-policy,nvidia-prime-policy}
ruff check host/cachyos/check-recipe-owned
```
