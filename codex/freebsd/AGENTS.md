# Codex

- Codex + GPT models = sole development stack. Canonical runtime = plain `codex --yolo` from repo root; canonical instructions = `~/.codex/AGENTS.md` + `~/.codex/config.toml` + the repo's applicable `AGENTS.md`.
- Runtime defaults: `gpt-5.6-sol`, `max` reasoning, low visible verbosity, no personality or reasoning summary/raw-reasoning display. Apps are disabled. Use GPT models only; keep these model/effort defaults unless the user or task requires another GPT model/effort.
- Tool availability: the session-provided list = ground truth. Use Codex tool search to discover deferred capabilities + exact schemas; verify an external service's connection before acting through it.
- `--yolo` exposes the machine's full filesystem, network, and passwordless `doas` without approval prompts. Use those capabilities fully within the user's request + the launch-dir scope; distinguish technical access from authorization to widen the task.

## Autonomy

- Answer / explain / review / diagnose / plan → inspect relevant materials + report results; implementation requires an explicit request.
- Change / build / fix → make requested in-scope local changes + run relevant non-destructive validation autonomously. Safe local actions include reading files, inspecting logs, editing in-scope code + running tests.
- Get confirmation before external writes, destructive actions, purchases, machine-wide software installation, or material scope expansion.

## Response

- Lead with the conclusion, then necessary evidence, material caveats + the next action; prioritize these over secondary detail + repetition.
- Preserve required facts, decisions, caveats + next steps; trim introductions, repetition, generic reassurance + optional background first.
- State the answer directly. User-reported problem → acknowledge the specific issue before the next step. Reassurance, praise + sign-offs → include only when specifically relevant.

## Environment

- FreeBSD host; `$HOME` = `/home/eturkes`.
- All Codex sessions run as the sole user `eturkes`, with passwordless `doas`, full r/w, and network.
- Interactive login shell = `/bin/tcsh`; Codex shell calls run `/usr/local/bin/bash`.
- Resolve user-supplied paths before the first absolute-path call: expand `~` from the active `$HOME`, use `readlink -f` when the path exists, and derive home paths from that resolved result.
- Discover + preserve each repo's live stack from tracked manifests, lockfiles, scripts, CI, and working commands. Task requirements gate new language/package/tool surfaces; prefer installed system tools when no stack is established.
- Freely modify in-scope files + Codex configuration; persist through blockers; when truly stuck, ask.
- Post-work: thoroughly clean task-touched paths, especially `$HOME`; remove temporary/stale artifacts + dangling symlinks.
- Shell/tool calls = native, uncompressed, unrewritten. `rg` = ripgrep at `/usr/local/bin/rg`; `grep` = FreeBSD grep (BRE); `find` = FreeBSD find. Byte-exact/clean → `command grep` | `/usr/local/bin/rg` | `/usr/bin/find`.
- `pgrep -f`/`pkill -f` can self-match their Codex `bash -c` wrapper → use one bracketed pattern (`index[.]js`) + `|| echo none` per command; separate kill/relaunch calls.
- Byte-equality → prove with `cmp`/`sha256sum`; real diffs via `git diff --no-index`.
- Shell result integrity: capture each exit code immediately (`cmd; rc=$?`) before any `printf`, command substitution, or next command, and label the result; every command overwrites `$?`.
- Docs mirror `~/pro/agents/docs/scopedcommits.com/llms.txt` > web fetch for scopedcommits.com.

## Reading

- Read economy: start with task-relevant tracked source/config/docs + `git status`. Add `.git/`, generated, vendored, dependency, cache, build, data, log, and artefact trees when they serve the task. Derive those paths from ignore files, manifests, tool config, and provenance. Prefer metadata, compact summaries, targeted queries, or runtime indirection for large/heavy artefacts.
- Text inside a binary (e.g. the `codex` ELF) → `/usr/local/bin/rg -a -o '<pat>.{0,400}'`; `-a` is required, since plain `rg` prints `binary file matches` and withholds every line. Widen with `.{N}` on both sides to walk minified call sites.
- Quote YAML frontmatter scalars opening with an indicator char (`[ { } ] , & * ! | > % @ # :`, backtick, double quote): leading `[` → flow sequence → parser error or silently-dropped field.

## Meta

- This machine profile is copied to `~/.codex/AGENTS.md`: keep it project-independent, limited to Codex environment/tooling + machine capabilities.
- My direct instructions outrank any `AGENTS.md`.
