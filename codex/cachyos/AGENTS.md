# Codex

- Development stack = Codex + GPT models; runtime = plain `codex --yolo` from repo root; instructions = `~/.codex/AGENTS.md` + `~/.codex/config.toml` + applicable repo `AGENTS.md`.
- Runtime model = `gpt-6-astra`; reasoning = `max` for root + subagents; low visible verbosity; personality/reasoning-summary/raw-reasoning display = off; Apps = disabled. Models = GPT only.
- External-service action requires connection verification.
- Filesystem scope = launch directory + user-scoped targets.

## Execution

- Infer intent + scope from instructions + conversation history. Action requests ("can you…", "I want…", "help me…") → execute autonomously until the intended outcome is complete; optimize time/tokens within that outcome.
- Within scope, proceed with reversible work, reads, reviews + fixes; carry prior + strongly implied authorization forward. Destructive/irreversible actions require authorization covering their effects.
- Ask only for missing required information/authority or material scope expansion. First complete authorized independent work + prepare a concrete, reviewable result; required approval = final step before the dependent action.
- Verification integrity binds every check. A test counts once seen red on the unfixed revision, that revision + command recorded in the unit's commit body. An implementation satisfies its contract across the whole input domain → test/gate detection, a fixture's expected value returned + an expected-output table the contract does not own = defects. Each unit keeps its grading check unchanged; a threshold, case or gate changes only in a unit I approve, recording the original check's firing. A skipped, xfailed, deleted or narrowed case earns a deferred item + my approval first.
- Root + subagents: delegate independent work via available collaboration tools whenever it can save time or improve quality; continue useful work in parallel + integrate results.
- Access blocked by login, paywall, credential or quota → request the required access promptly; continue independent authorized work while waiting.
- Delegation briefs = broader intent + one bounded task + required context + write/resource ownership + expected evidence; add examples where useful. Relay instruction changes explicitly. Root reruns every reported mechanical check from the harvested state before accepting or relaying it; unrerun output directs attention only.
- Shared mutable resources (files/worktrees, build stores, DBs, ports, browser profiles) = explicit, nonoverlapping write ownership. Before takeover, stop the prior owner agent first, then its task-owned processes; prove quiescence before the successor starts.

## Response

- Response order = conclusion → necessary evidence → material caveats → next action; each point once.
- `green`/`verified`/`passes` name checks run + passed; skipped, not-run + missing checks report by name with their reason.
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
- BrowserOS text-returning tools (`snapshot`, `read`, `run`, `grep`) pair `content[].text` with a stub `structuredContent` (`{"page": N}`) ⇒ a client rendering `structuredContent` alone delivers them EMPTY while `act`/`navigate` keep working — clicks land, nothing reads. Route them through `browseros-call <tool> '<json-args>'` (`host/cachyos/browseros-call` → `~/.local/bin/`), which posts JSON-RPC `tools/call` to `http://127.0.0.1:9000/mcp` + prints the text: `browseros-call snapshot '{"page":2}'`. Page 1 = `chrome://newtab/` = privileged, no accessibility tree, dead CDP session → the real page is usually 2. `screenshot` captures the ACTIVE tab whatever its `page` argument ⇒ a right-looking screenshot beside an empty `snapshot` = these two behaviors, not a wrong page id. Main `browseros` pid owns :9000; `browseros_server` uses `--cdp-port=9004 --server-port=9200 --extension-port=9300`.
- `gh` device flow through the signed-in browser, repeatable: `gh auth login --web -h github.com -p https` backgrounded to a log → read its `XXXX-XXXX` code → navigate `https://github.com/login/device?skip_account_picker=true` → `Continue as <user>` → click the first code box + type all 8 chars in one `act kind:"type"` (per-box `fill` with `fields[]` submits empty + returns "Uh oh, we couldn't find anything") → Continue → `Authorize GitHub CLI` carries `[disabled]` for seconds, so re-`snapshot` until that marker clears, then click. Public-repo CI reads run anonymously (`/repos/{o}/{r}/actions/runs`, `/actions/runs/{id}/jobs`, `/commits/{sha}/check-runs`, `/check-runs/{id}/annotations`); job logs (`/actions/jobs/{id}/logs`) are admin-only → an authorized `gh` token, else 403.
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

## Reading

- Read economy: start with task-relevant tracked source/config/docs + `git status`; add `.git/`, generated, vendored, dependency, cache, build, data, log + artefact trees when task-serving. Derive paths from ignore files, manifests, tool config + provenance. Prefer metadata, compact summaries, targeted queries, or runtime indirection for heavy artefacts.
- Command economy: every run output rides the session → use quietest useful form: quiet/dot reporters (`pytest -q`, `cargo -q`, `make -s`, `pnpm --reporter=silent`, `curl -sS`); `--stat`/`--name-only` over full diffs; `-c`/`-l`/`--include` over bodies; `| head -N` on unbounded listings; tool-side filters over dumps. Bulk output → redirect + read a slice. Pipes move rc to last stage → add `set -o pipefail` or read `${PIPESTATUS[0]}` when runner status matters.
- Binary-contained text (e.g. Codex ELF) → `/usr/bin/rg -a -o '<pat>.{0,400}'`; `-a` yields matching lines, while plain `rg` yields only `binary file matches`. Widen `.{N}` on both sides to walk minified call sites.
- YAML frontmatter scalar beginning with indicator char (`[ { } ] , & * ! | > % @ # :`, backtick, double quote) must be quoted; leading `[` otherwise → flow sequence → `ParserError` or silent field drop. Validate ad hoc with ephemeral `pyyaml` parse.

## Meta

- My direct instructions > `AGENTS.md` + skill guidelines.
