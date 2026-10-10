---
paths: ["claude/statusline", "claude/check-statusline"]
---

# Statusline

- Gate = `claude/check-statusline` under every awk the hosts run: default `awk` (gawk), `claude/check-statusline busybox awk`, and mawk + dash = `podman run --rm -v "$PWD/claude:/c:ro" docker.io/library/debian:stable-slim sh -c 'apt-get update -qq >/dev/null && apt-get install -y -qq jq >/dev/null 2>&1 && /c/check-statusline'`. Firing: `7d6ebf6`'s statusline fails 17/49 cases.
- Deploy = `cp claude/statusline ~/.claude/statusline` (a copy) → `cmp` equal.
