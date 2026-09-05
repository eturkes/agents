# Codex

- Development stack = Codex + GPT models; runtime = plain `codex --yolo` from repo root; instructions = `~/.codex/AGENTS.md` + `~/.codex/config.toml` + applicable repo `AGENTS.md`.
- Runtime model = `gpt-6-astra`; reasoning = `max` for root + subagents; low visible verbosity; personality/reasoning-summary/raw-reasoning display = off; Apps = disabled. Models = GPT only.
- External-service action requires connection verification.
- Filesystem scope = launch directory + user-scoped targets.

## Execution

- Infer intent + scope from instructions + conversation history. Action requests ("can you…", "I want…", "help me…") → execute autonomously until the intended outcome is complete; optimize time/tokens within that outcome.
- Within scope, proceed with reversible work, reads, reviews + fixes; carry prior + strongly implied authorization forward. Destructive/irreversible actions require authorization covering their effects.
- Ask only for missing required information/authority or material scope expansion. First complete authorized independent work + prepare a concrete, reviewable result; required approval = final step before the dependent action.
- Root + subagents: delegate independent work via available collaboration tools whenever it can save time or improve quality; continue useful work in parallel + integrate results.

## Response

- Response order = conclusion → necessary evidence → material caveats → next action; each point once.
- Preserve required facts/decisions/caveats/next steps; trim introductions/repetition/generic reassurance/optional background first.
- Answer directly. User-reported problem → acknowledge specific issue before next step. Reassurance/praise/sign-off trigger = specific relevance.
- State the intended action/result directly using plain words, precise verbs + prepositions; use established terms + ordinary modifier phrases. Qualifiers, transitions, comparisons + scope/category explanations must serve the user's request. End after the last useful point.
- Warnings, disclaimers + safety/compliance checklists = requested or grounded in concrete task evidence.

## Environment

- Host = CachyOS (Arch).
- Sessions = sole user `eturkes` + passwordless sudo.
- Before the first absolute-path call, resolve user paths: expand `~` from active `$HOME`; existing path → `readlink -f`; derive home paths from resolved result.
- Desktop = live X11 session + authenticated GUI apps.
- Repo stack: discover + preserve from tracked manifests, lockfiles, scripts, CI + working commands. New language/package/tool surfaces require task need. Defaults: Python → `uv`; Node.js → `pnpm`; visual QA/web scraping → `chromiumfish`.
- Compute: applicable work → dGPU; display/video → iGPU, reserving dGPU VRAM.
- Task-serving environment + Codex changes (skills/plugins/software) = in scope.
- Authenticated web = BrowserOS (`http://127.0.0.1:9000/mcp`), sole configured MCP; signed-in PDF/PNG/DOM captures → `webcap --user-data-dir ~/.config/browser-os`; `chromiumfish` = isolated visual QA.
- Access scope = signed-in browser, incl. university journals.
- Post-work cleanup: task-touched paths, esp. `$HOME`; remove temporary/stale artifacts + dangling symlinks.
- Headless capture = `webcap <url> [--pdf F] [--png F] [--dom F|-]` (`host/cachyos/webcap`, CDP over chromiumfish); full-page PNG → `--full-page` + direct inspection; also `--dark`, `--width`/`--height`, `--selector`/`--wait` settle, `--timeout`, `--user-data-dir`; fragment URLs scroll to target, which client routing can reset. `--user-data-dir D` captures against a sibling `cp -a` clone → `~/.config/browser-os` renders the live signed-in session while source stays byte-identical. Profile access must go through `webcap`; this preserves BrowserOS component extensions + `Local State`'s `profile.last_used` value. Clone cost = real 1.4G tmpfs copy, ~1.2s; `--profile-directory` names profile; default = `last_used`. Signed-out clone = source profile session lapsed → sign in through live browser; next clone inherits it.
- Fallback = `$(chromiumfish path) --headless` with `--screenshot=<path>`, `--print-to-pdf=<path> --no-pdf-header-footer`, or `--dump-dom`; supports arbitrary Chrome flags (`--window-size`, `--user-agent`, `--force-device-scale-factor`).
- Dark capture: build reports `prefers-color-scheme` light under CDP emulation + `--force-dark-mode` → `--dark` promotes same-origin dark media blocks to `all`; cross-origin stylesheets stay light + reported; `matchMedia` stays light.
- SwANGLE/Vulkan `EGL` initialization errors + `Exiting GPU process` = benign when command succeeds + output is real.
- Shell/tool calls = native + uncompressed + unrewritten. `rg` = ripgrep; `grep` = GNU grep (BRE); `find` = GNU find. Byte-exact/clean → `command grep` | `/usr/bin/rg` | `/usr/bin/find`.
- `rg` direct: recurses by default → pass `<pat> <path>` alone. Its `-r` = `--replace`; `grep -r` muscle memory consumes pattern as replacement + promotes path to pattern → readable stdin blocks; `.` rewrites every line to replacement (rc 0, fabricated match-shaped bytes); named dir = rc 1 + empty stdout. Name dot-dirs (`.agent/`, `.scratch/`) explicitly; explicit paths search regardless of hidden/ignore state; tree sweep → `--hidden`; gitignored dot-dirs require `-uu` (`--hidden --no-ignore`).
- `pgrep -f`/`pkill -f` can self-match Codex `bash -c` wrapper → one bracketed pattern (`index[.]js`) + `|| echo none`; kill/relaunch calls separate.
- `bgcmd` (`~/.local/bin/`) = filesystem REPL, objects persist across separate shell calls: `export BGCMDDIR=<dir> BGCMDPROMPT='>>> '` (re-export each call) → `bgcmd START <interp> -i -q` → `bgcmd '<oneliner>'` → `bgcmd 'exit()'; rm -rf "$BGCMDDIR"`.
- Byte-equality → prove with `cmp`/`sha256sum`; real diffs via `git diff --no-index`.
- Shell rc: capture + label immediately (`cmd; rc=$?`) before `printf`, substitution, or another command; every command overwrites `$?`. EMPTY-output findings (zero matches/processes/modifications) → report rc + run a positive control. Missing command (127), mistyped path + unmatched glob emit the same bytes as a true negative.
- Docs mirror `~/Projects/agents/docs/<site>/llms.txt` (scopedcommits.com, agentlanguages.dev) > web fetch.

## Reading

- Read economy: start with task-relevant tracked source/config/docs + `git status`; add `.git/`, generated, vendored, dependency, cache, build, data, log + artefact trees when task-serving. Derive paths from ignore files, manifests, tool config + provenance. Prefer metadata, compact summaries, targeted queries, or runtime indirection for heavy artefacts.
- Command economy: every run output rides the session → use quietest useful form: quiet/dot reporters (`pytest -q`, `cargo -q`, `make -s`, `pnpm --reporter=silent`, `curl -sS`); `--stat`/`--name-only` over full diffs; `-c`/`-l`/`--include` over bodies; `| head -N` on unbounded listings; tool-side filters over dumps. Bulk output → redirect + read a slice. Pipes move rc to last stage → add `set -o pipefail` or read `${PIPESTATUS[0]}` when runner status matters.
- Binary-contained text (e.g. Codex ELF) → `/usr/bin/rg -a -o '<pat>.{0,400}'`; `-a` yields matching lines, while plain `rg` yields only `binary file matches`. Widen `.{N}` on both sides to walk minified call sites.
- YAML frontmatter scalar beginning with indicator char (`[ { } ] , & * ! | > % @ # :`, backtick, double quote) must be quoted; leading `[` otherwise → flow sequence → `ParserError` or silent field drop. Validate ad hoc with ephemeral `pyyaml` parse.

## Meta

- My direct instructions > `AGENTS.md` + skill guidelines.
