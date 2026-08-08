# Codex

- Codex + GPT models = sole development stack — canonical runtime = plain `codex --yolo` from repo root; canonical instructions = `~/.codex/AGENTS.md` + `~/.codex/config.toml` + the repo's applicable `AGENTS.md`.
- Runtime defaults: `gpt-5.6-sol`, `max` reasoning, low visible verbosity, no personality or reasoning summary/raw-reasoning display. Apps are disabled. Use GPT models ONLY; keep these model/effort defaults unless the user or task requires another GPT model/effort.
- External services: verify the connection before acting through one.
- Filesystem scope = launch directory + targets the user places in scope.

## Confirmation

- Confirm immediately before external writes, destructive actions, purchases, machine-wide software installation, or material scope expansion.

## Response

- Lead with the conclusion — then necessary evidence, material caveats + the next action; prioritize these over secondary detail + repetition.
- Preserve required facts, decisions, caveats + next steps; trim introductions, repetition, generic reassurance + optional background first.
- State the answer directly. User-reported problem → acknowledge the specific issue before the next step. Reassurance, praise + sign-offs → include ONLY when specifically relevant.

## Environment

- FreeBSD host; `$HOME` = `/home/eturkes`.
- Codex sessions run as the sole user `eturkes`, with passwordless `doas`.
- Interactive login shell = `/bin/tcsh`; Codex shell calls run `/usr/local/bin/bash`.
- Resolve user-supplied paths before the first absolute-path call: expand `~` from the active `$HOME`, use `readlink -f` when the path exists, and derive home paths from that resolved result.
- Discover + preserve each repo's live stack from tracked manifests, lockfiles, scripts, CI, and working commands. Task requirements gate new language/package/tool surfaces; prefer installed system tools when no stack is established.
- Task-serving file + Codex configuration changes are in scope.
- Post-work: thoroughly clean task-touched paths, especially `$HOME`; remove temporary/stale artifacts + dangling symlinks.
- Shell/tool calls = native, uncompressed, unrewritten. `rg` = ripgrep at `/usr/local/bin/rg`; `grep` = FreeBSD grep (BRE); `find` = FreeBSD find. Byte-exact/clean → `command grep` | `/usr/local/bin/rg` | `/usr/bin/find`.
- `rg` direct calls: recurses by default → pass `<pat> <path>` ALONE. `-r` is `--replace`, so `grep -r` muscle memory eats the pattern as replacement text + promotes the path to pattern → readable stdin blocks the call; `.` matches every line + rewrites output to the replacement (rc=0, fabricated bytes shaped like real matches); a named dir matches nothing (rc=1). Reach dot-dirs (`.agent/`, `.scratch/`) by NAMING the path — explicit paths search regardless of hidden/ignore state; tree-wide sweeps take `--hidden`; gitignored dot-dirs take `-uu` (= `--hidden --no-ignore`), which `--hidden` alone MISSES.
- `pgrep -f`/`pkill -f` can self-match their Codex `bash -c` wrapper → use one bracketed pattern (`index[.]js`) + `|| echo none` per command; separate kill/relaunch calls.
- Byte-equality → prove with `cmp`/`sha256sum`; real diffs via `git diff --no-index`.
- Shell result integrity: capture each exit code immediately (`cmd; rc=$?`) before any `printf`, command substitution, or next command, and label the result; every command overwrites `$?`. Where EMPTY output IS the finding (no matches, nothing running, nothing modified), report rc beside it and pair the query with a positive control that must print: a missing command (127), a mistyped path, and a glob matching nothing all emit byte-for-byte what a true negative emits.
- Docs mirror `~/pro/agents/docs/scopedcommits.com/llms.txt` > web fetch for scopedcommits.com.

## Reading

- Read economy: start with task-relevant tracked source/config/docs + `git status`. Add `.git/`, generated, vendored, dependency, cache, build, data, log, and artefact trees when they serve the task. Derive those paths from ignore files, manifests, tool config, and provenance. Prefer metadata, compact summaries, targeted queries, or runtime indirection for large/heavy artefacts.
- Text inside a binary (e.g. the `codex` ELF) → `/usr/local/bin/rg -a -o '<pat>.{0,400}'`; `-a` is required, since plain `rg` prints `binary file matches` and withholds every line. Widen with `.{N}` on both sides to walk minified call sites.
- Quote YAML frontmatter scalars opening with an indicator char (`[ { } ] , & * ! | > % @ # :`, backtick, double quote): leading `[` → flow sequence → parser error or silently-dropped field.

## Meta

- This machine profile is copied to `~/.codex/AGENTS.md` — keep it project-independent, limited to Codex environment/tooling + machine capabilities.
- My direct instructions outrank any `AGENTS.md`.
