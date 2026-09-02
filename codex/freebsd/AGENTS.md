# Codex

- Development stack = Codex + GPT models; runtime = plain `codex --yolo` from repo root; instructions = `~/.codex/AGENTS.md` + `~/.codex/config.toml` + applicable repo `AGENTS.md`.
- Runtime defaults = `gpt-5.6-sol`, `max` reasoning, low visible verbosity; personality/reasoning-summary/raw-reasoning display = off; Apps = disabled. Models = GPT only. User/task requirement may override model + effort.
- External-service action requires connection verification.
- Filesystem scope = launch directory + user-scoped targets.

## Execution

- Execute within stated task scope. Ask only when required information/authority is missing or an action materially expands scope.

## Response

- Response order = conclusion → necessary evidence → material caveats → next action; secondary detail + repetition last.
- Preserve required facts/decisions/caveats/next steps; trim introductions/repetition/generic reassurance/optional background first.
- Answer directly. User-reported problem → acknowledge specific issue before next step. Reassurance/praise/sign-off trigger = specific relevance.

## Environment

- Host = FreeBSD.
- Sessions = sole user `eturkes` + passwordless `doas`.
- Interactive login shell = `/bin/tcsh`; Codex shell calls run `/usr/local/bin/bash`.
- Before the first absolute-path call, resolve user paths: expand `~` from active `$HOME`; existing path → `readlink -f`; derive home paths from resolved result.
- Repo stack: discover + preserve from tracked manifests, lockfiles, scripts, CI + working commands. New language/package/tool surfaces require task need; unspecified stack → installed system tools.
- Task-serving file + Codex configuration changes = in scope.
- Post-work cleanup: task-touched paths, esp. `$HOME`; remove temporary/stale artifacts + dangling symlinks.
- Shell/tool calls = native + uncompressed + unrewritten. `rg` = `/usr/local/bin/rg`; `grep` = FreeBSD grep (BRE); `find` = FreeBSD find. Byte-exact/clean → `command grep` | `/usr/local/bin/rg` | `/usr/bin/find`.
- `rg` direct: recurses by default → pass `<pat> <path>` alone. Its `-r` = `--replace`; `grep -r` muscle memory consumes pattern as replacement + promotes path to pattern → readable stdin blocks; `.` rewrites every line to replacement (rc 0, fabricated match-shaped bytes); named dir = rc 1 + empty stdout. Name dot-dirs (`.agent/`, `.scratch/`) explicitly; explicit paths search regardless of hidden/ignore state; tree sweep → `--hidden`; gitignored dot-dirs require `-uu` (`--hidden --no-ignore`).
- `pgrep -f`/`pkill -f` can self-match Codex `bash -c` wrapper → one bracketed pattern (`index[.]js`) + `|| echo none`; kill/relaunch calls separate.
- Byte-equality → prove with `cmp`/`sha256sum`; real diffs via `git diff --no-index`.
- Shell rc: capture + label immediately (`cmd; rc=$?`) before `printf`, substitution, or another command; every command overwrites `$?`. EMPTY-output findings (zero matches/processes/modifications) → report rc + run a positive control. Missing command (127), mistyped path + unmatched glob emit the same bytes as a true negative.
- scopedcommits.com docs: `~/pro/agents/docs/scopedcommits.com/llms.txt` > web fetch.

## Reading

- Read economy: start with task-relevant tracked source/config/docs + `git status`; add `.git/`, generated, vendored, dependency, cache, build, data, log + artefact trees when task-serving. Derive paths from ignore files, manifests, tool config + provenance. Prefer metadata, compact summaries, targeted queries, or runtime indirection for heavy artefacts.
- Command economy: every run output rides the session → use quietest useful form: quiet/dot reporters (`pytest -q`, `cargo -q`, `make -s`, `pnpm --reporter=silent`, `curl -sS`); `--stat`/`--name-only` over full diffs; `-c`/`-l`/`--include` over bodies; `| head -N` on unbounded listings; tool-side filters over dumps. Bulk output → redirect + read a slice. Pipes move rc to last stage → add `set -o pipefail` or read `${PIPESTATUS[0]}` when runner status matters.
- Binary-contained text (e.g. Codex ELF) → `/usr/local/bin/rg -a -o '<pat>.{0,400}'`; `-a` yields matching lines, while plain `rg` yields only `binary file matches`. Widen `.{N}` on both sides to walk minified call sites.
- YAML frontmatter scalar beginning with indicator char (`[ { } ] , & * ! | > % @ # :`, backtick, double quote) must be quoted; leading `[` otherwise → flow sequence → parser error or silent field drop.

## Meta

- Machine-profile scope = project-independent Codex environment/tooling + machine capabilities.
- My direct instructions outrank any `AGENTS.md`.
