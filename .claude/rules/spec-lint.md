---
paths: ["claude/spec-lint", "claude/check-spec-lint"]
---

# Spec lint

- Each phase-flow project keeps a byte copy at `.agent/spec-lint`, placed by the copy commands in `claude/prompts/README.md` `Template files` ⇒ a change here reaches a project at its next refresh.

Checks (gawk, busybox awk, then mawk in Debian):

```sh
claude/check-spec-lint
claude/check-spec-lint 'busybox awk'
podman run --rm -v "$PWD/claude:/c:ro" docker.io/library/debian:stable-slim /c/check-spec-lint
shellcheck -s sh -e SC2016 claude/spec-lint claude/check-spec-lint
```
