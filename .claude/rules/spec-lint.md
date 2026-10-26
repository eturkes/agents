---
paths: ["claude/spec-lint", "claude/check-spec-lint"]
---

# Spec lint

- Each phase-flow project keeps a byte copy at `.agent/spec-lint`, placed by `claude/copy-template` (`claude/prompts/README.md` `Template files`) ⇒ a change here reaches a project at its next refresh.
- A project may ShellCheck its copy at any severity ⇒ `claude/spec-lint` carries its suppressions inline, checked without `-e`; a project-side edit to its copy is overwritten at the next refresh.

Checks (gawk, busybox awk, then mawk in Debian):

```sh
claude/check-spec-lint
claude/check-spec-lint 'busybox awk'
podman run --rm -v "$PWD/claude:/c:ro" docker.io/library/debian:stable-slim /c/check-spec-lint
shellcheck -s sh claude/spec-lint
shellcheck -s sh -e SC2016 claude/check-spec-lint
```
