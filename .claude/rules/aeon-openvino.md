---
paths: ["claude/aeon/CLAUDE.md", "codex/aeon/AGENTS.md", "codex/aeon/AGENTS.codexify.md", "codex/aeon/AGENTS.host.md", "host/aeon/OPENVINO.md"]
---

# Aeon OpenVINO

- Task rules (devices, enable, NPU pitfalls) = 3 bullets in each always-loaded Aeon host file: byte-identical across the Debian-container files (`claude/aeon/CLAUDE.md`, `codex/aeon/AGENTS.md`, `codex/aeon/AGENTS.codexify.md`); `codex/aeon/AGENTS.host.md` (openSUSE host) differs in the enable bullet (host `setupvars.sh`) + the doc path. A change → all four, then `claude/check-fable --write`.
- Builds, driver farm, hardware + upkeep → `host/aeon/OPENVINO.md` alone (on-demand tier, `host-config.md`).

Checks:

```sh
python3 -B claude/check-fable
for f in codex/aeon/AGENTS.md codex/aeon/AGENTS.codexify.md; do diff <(rg -A2 '^- Local inference → OpenVINO' claude/aeon/CLAUDE.md) <(rg -A2 '^- Local inference → OpenVINO' "$f") && echo "$f: same"; done
```
