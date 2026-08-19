# Codex

- Codex + GPT models = sole development stack — canonical runtime = plain `codex --yolo` from repo root; canonical instructions = `~/.codex/AGENTS.md` + `~/.codex/config.toml` + the repo's applicable `AGENTS.md`.
- Runtime defaults: `gpt-5.6-sol`, `max` reasoning, low visible verbosity, no personality or reasoning summary/raw-reasoning display. Apps are disabled. Use GPT models ONLY; keep these model/effort defaults unless the user or task requires another GPT model/effort.
- External services: verify the connection before acting through one.
- Filesystem scope = launch directory + targets the user places in scope.

## Confirmation

- Confirm immediately before external writes, destructive actions, purchases, or material scope expansion.

## Response

- Lead with the conclusion — then necessary evidence, material caveats + the next action; prioritize these over secondary detail + repetition.
- Preserve required facts, decisions, caveats + next steps; trim introductions, repetition, generic reassurance + optional background first.
- State the answer directly. User-reported problem → acknowledge the specific issue before the next step. Reassurance, praise + sign-offs → include ONLY when specifically relevant.

## Environment

- Debian container; `$HOME` = `/var/home/eturkes/debian`.
- Codex sessions run as the sole user `eturkes`, with passwordless sudo.
- Host & container share trees at different abs paths (in-container `/run/host/...`). uv venvs path-bake per-layer → pick by path-prefix. Per-layer `UV_PROJECT_ENVIRONMENT` (`.venv`/`.venv-host`, git-ignored); `.envrc`+direnv in interactive shells, else `export`.
- Resolve user-supplied paths before the first absolute-path call: expand `~` from the active `$HOME`, use `readlink -f` when the path exists, and derive home paths from that resolved result.
- Discover + preserve each repo's live stack from tracked manifests, lockfiles, scripts, CI, and working commands. Task requirements gate new language/package/tool surfaces. Defaults: Python → `uv`; Node.js → `pnpm`; visual QA/web scraping → `chromiumfish`.
- Task-serving environment + Codex changes (skills/plugins, software installation) are in scope.
- Authenticated web: drive `webcap --user-data-dir=/run/host/home/eturkes/.config/browser-os`; close that browser first, since Chrome's ProcessSingleton refuses a profile already in use. Always reach that profile through `webcap`, which names the login keyring store (`--password-store=gnome-libsecret`) so the signed-in session survives; a launch leaving the store to auto-detection lands on `basic`, fails to decrypt the jar and deletes every cookie in it. Without the profile flag, `chromiumfish` = isolated visual QA.
- Authenticated browser access includes anything available in my signed-in day-to-day browser, including university access to most peer-reviewed journals.
- Post-work: thoroughly clean task-touched paths, especially `$HOME`; remove temporary/stale artifacts + dangling symlinks.
- Headless capture: `webcap <url> [--pdf F] [--png F] [--dom F|-]` (`container/aeon/webcap`, CDP over chromiumfish). Full-page PNG: `--full-page` → inspect directly, no `pdftoppm` step. Also `--width`/`--height`, `--selector`/`--wait` settle, `--timeout`, `--user-data-dir`. Fragment URLs scroll to their target.
- Chrome's own capture switches (`--print-to-pdf`, `--dump-dom`, `--screenshot`) hang forever in this build — the page loads, the browser stays live, rc=124, no artifact — under every GL/quiet/virtual-time flag set → always capture through `webcap`. GL is sound (`--use-angle=swiftshader` rasterizes text + backgrounds); SwANGLE/Vulkan/GCM stderr noise = benign.
- The build answers `prefers-color-scheme` light under CDP media emulation and under `--force-dark-mode` → `--dark` promotes the page's own dark media blocks to `all`; cross-origin stylesheets stay light + are reported, and `matchMedia` keeps reporting light → pages theming off it need their own switch.
- Shell/tool calls = native, uncompressed, unrewritten. `rg` = ripgrep; `grep` = GNU grep (BRE); `find` = GNU find. Byte-exact/clean → `command grep` | `/usr/bin/rg` | `/usr/bin/find`.
- `rg` direct calls: recurses by default → pass `<pat> <path>` ALONE. `-r` is `--replace`, so `grep -r` muscle memory eats the pattern as replacement text + promotes the path to pattern → readable stdin blocks the call; `.` matches every line + rewrites output to the replacement (rc=0, fabricated bytes shaped like real matches); a named dir matches nothing (rc=1). Reach dot-dirs (`.agent/`, `.scratch/`) by NAMING the path — explicit paths search regardless of hidden/ignore state; tree-wide sweeps take `--hidden`; gitignored dot-dirs take `-uu` (= `--hidden --no-ignore`), which `--hidden` alone MISSES.
- `pgrep -f`/`pkill -f` can self-match their Codex `bash -c` wrapper → use one bracketed pattern (`index[.]js`) + `|| echo none` per command; separate kill/relaunch calls.
- `bgcmd` (`~/.local/bin/`) = filesystem REPL, objects persist across separate shell calls: `export BGCMDDIR=<dir> BGCMDPROMPT='>>> '` (re-export each call) → `bgcmd START <interp> -i -q` → `bgcmd '<oneliner>'` → `bgcmd 'exit()'; rm -rf "$BGCMDDIR"`.
- Byte-equality → prove with `cmp`/`sha256sum`; real diffs via `git diff --no-index`.
- Shell result integrity: capture each exit code immediately (`cmd; rc=$?`) before any `printf`, command substitution, or next command, and label the result; every command overwrites `$?`. Where EMPTY output IS the finding (no matches, nothing running, nothing modified), report rc beside it and pair the query with a positive control that must print: a missing command (127), a mistyped path, and a glob matching nothing all emit byte-for-byte what a true negative emits.
- Docs mirror `~/agents/docs/<site>/llms.txt` (scopedcommits.com, agentlanguages.dev) > web fetch.

## Reading

- Read economy: start with task-relevant tracked source/config/docs + `git status`. Add `.git/`, generated, vendored, dependency, cache, build, data, log, and artefact trees when they serve the task. Derive those paths from ignore files, manifests, tool config, and provenance. Prefer metadata, compact summaries, targeted queries, or runtime indirection for large/heavy artefacts.
- Command economy: every run's output rides the whole session → always invoke at the quietest useful setting: quiet/dot reporters (`pytest -q`, `cargo -q`, `make -s`, `pnpm --reporter=silent`, `curl -sS`), `--stat`/`--name-only` over full diffs, `-c`/`-l`/`--include` over match bodies, `| head -N` on unbounded listings, and tool-side filters returning the answer over the dump. Bulk-by-nature output → redirect to a file + read the slice. Piping for economy moves rc to the last stage → add `set -o pipefail` (or read `${PIPESTATUS[0]}`) wherever the runner's status is the finding.
- Text inside a binary (e.g. the `codex` ELF) → `/usr/bin/rg -a -o '<pat>.{0,400}'`; `-a` is required, since plain `rg` prints `binary file matches` and withholds every line. Widen with `.{N}` on both sides to walk minified call sites.
- Quote YAML frontmatter scalars opening with an indicator char (`[ { } ] , & * ! | > % @ # :`, backtick, double quote): leading `[` → flow sequence → `ParserError` or silently-dropped field. Verify ad-hoc frontmatter with an ephemeral `pyyaml` parse.

## Meta

- My direct instructions outrank any `AGENTS.md`.
