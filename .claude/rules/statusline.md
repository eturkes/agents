---
paths: ["claude/statusline", "claude/check-statusline"]
---

# Statusline

- `~/.claude/statusline` = copy → after a change: `cp claude/statusline ~/.claude/statusline`.

Checks (CachyOS: gawk + busybox awk under bash):

```sh
claude/check-statusline
claude/check-statusline busybox awk
```

- aeon (Debian container: `sh` = dash, Debian's `awk`) = the only other runtime; unreachable from CachyOS ⇒ its deploy runs `claude/check-statusline` there before the `cp`.
