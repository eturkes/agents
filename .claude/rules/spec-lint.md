---
paths: ["claude/spec-lint", "claude/check-spec-lint"]
---

# Spec lint

- Gate = `claude/check-spec-lint` (default `awk`) + `claude/check-spec-lint 'busybox awk'` + mawk = `podman run --rm -v "$PWD/claude:/c:ro" docker.io/library/debian:stable-slim /c/check-spec-lint` + `shellcheck -s sh -e SC2016 claude/spec-lint claude/check-spec-lint`. Firing (mutants of `claude/spec-lint` → failed cases of 18): Phase history check dropped 1, fence toggle dropped 1, deferred-pointer check dropped 1, Tasks row check dropped 2, Phase line-1 form check dropped 1, section-order check dropped 3.
- Deploy = a byte copy at each phase-flow project's `.agent/spec-lint` (template `Session flow`); `prototype.md`, `implement.md` + `refresh.md` place it.
