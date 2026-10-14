---
paths: ["claude/statusline", "claude/check-statusline"]
---

# Statusline

- `~/.claude/statusline` is a copy. After a change, run `cp claude/statusline ~/.claude/statusline`.

Checks (gawk, busybox awk, then mawk and dash in Debian):

```sh
claude/check-statusline
claude/check-statusline busybox awk
podman run --rm -v "$PWD/claude:/c:ro" docker.io/library/debian:stable-slim sh -c 'apt-get update -qq >/dev/null && apt-get install -y -qq jq >/dev/null 2>&1 && /c/check-statusline'
```
