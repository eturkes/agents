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

- Host = Debian container; `$HOME` = `/var/home/eturkes/debian`.
- Sessions = sole user `eturkes` + passwordless sudo.
- Before the first absolute-path call, resolve user paths: expand `~` from active `$HOME`; existing path → `readlink -f`; derive home paths from resolved result.
- Host + container share trees at different abs paths (in-container `/run/host/...`); uv venvs path-bake per-layer → pick by path-prefix. Per-layer `UV_PROJECT_ENVIRONMENT` (`.venv`/`.venv-host`, git-ignored); `.envrc` + direnv in interactive shells, else `export`.
- Repo stack: discover + preserve from tracked manifests, lockfiles, scripts, CI + working commands. New language/package/tool surfaces require task need. Defaults: Python → `uv`; Node.js → `pnpm`; visual QA/web scraping → `chromiumfish`.
- Task-serving environment + Codex changes (skills/plugins/software) = in scope.
- Authenticated web = `webcap --user-data-dir=/run/host/home/eturkes/.config/browser-os`; keep that browser running, since capture runs against a reflink clone + leaves the profile byte-identical; `chromiumfish` without the profile flag = isolated visual QA.
- Access scope = signed-in browser, incl. university journals.
- Post-work cleanup: task-touched paths, esp. `$HOME`; remove temporary/stale artifacts + dangling symlinks.
- Headless capture = `webcap <url> [--pdf F] [--png F] [--dom F|-]` (`container/aeon/webcap`, CDP over chromiumfish); full-page PNG → `--full-page` + direct inspection, no `pdftoppm` step; also `--dark`, `--width`/`--height`, `--selector`/`--wait` settle, `--timeout`, `--user-data-dir`; fragment URLs scroll to target. `--user-data-dir D` captures against a `cp --reflink` clone beside D → the host BrowserOS profile renders its signed-in session while source stays byte-identical. Profile access must go through `webcap`: it appends `--password-store=gnome-libsecret`, which Chrome's last-duplicate rule makes beat the `--password-store=basic` playwright-core pins into every launch on every platform; under `basic` a keyring-encrypted jar empties on open. That pin = explicit switch, not a detector → naming the store is the whole fix. Going through `webcap` also preserves BrowserOS component extensions.
- Chrome's own capture switches (`--print-to-pdf`, `--dump-dom`, `--screenshot`) hang in this build — page loads, browser stays live, rc=124, no artifact — under every GL/quiet/virtual-time flag set. GL is sound (`--use-angle=swiftshader` rasterizes text + backgrounds); SwANGLE/Vulkan/GCM stderr noise = benign.
- Dark capture: build reports `prefers-color-scheme` light under CDP media emulation + `--force-dark-mode` → `--dark` promotes same-origin dark media blocks to `all`; cross-origin stylesheets stay light + reported; `matchMedia` stays light → pages theming off it need their own switch.
- Shell/tool calls = native + uncompressed + unrewritten. `rg` = ripgrep; `grep` = GNU grep (BRE); `find` = GNU find. Byte-exact/clean → `command grep` | `/usr/bin/rg` | `/usr/bin/find`.
- `rg` direct: recurses by default → pass `<pat> <path>` alone. Its `-r` = `--replace`; `grep -r` muscle memory consumes pattern as replacement + promotes path to pattern → readable stdin blocks; `.` rewrites every line to replacement (rc 0, fabricated match-shaped bytes); named dir = rc 1 + empty stdout. Name dot-dirs (`.agent/`, `.scratch/`) explicitly; explicit paths search regardless of hidden/ignore state; tree sweep → `--hidden`; gitignored dot-dirs require `-uu` (`--hidden --no-ignore`).
- `pgrep -f`/`pkill -f` can self-match Codex `bash -c` wrapper → one bracketed pattern (`index[.]js`) + `|| echo none`; kill/relaunch calls separate.
- `bgcmd` (`~/.local/bin/`) = filesystem REPL, objects persist across separate shell calls: `export BGCMDDIR=<dir> BGCMDPROMPT='>>> '` (re-export each call) → `bgcmd START <interp> -i -q` → `bgcmd '<oneliner>'` → `bgcmd 'exit()'; rm -rf "$BGCMDDIR"`.
- Byte-equality → prove with `cmp`/`sha256sum`; real diffs via `git diff --no-index`.
- Shell rc: capture + label immediately (`cmd; rc=$?`) before `printf`, substitution, or another command; every command overwrites `$?`. EMPTY-output findings (zero matches/processes/modifications) → report rc + run a positive control. Missing command (127), mistyped path + unmatched glob emit the same bytes as a true negative.
- Docs mirror `~/agents/docs/<site>/llms.txt` (scopedcommits.com, agentlanguages.dev) > web fetch.

## Reading

- Read economy: start with task-relevant tracked source/config/docs + `git status`; add `.git/`, generated, vendored, dependency, cache, build, data, log + artefact trees when task-serving. Derive paths from ignore files, manifests, tool config + provenance. Prefer metadata, compact summaries, targeted queries, or runtime indirection for heavy artefacts.
- Command economy: every run output rides the session → use quietest useful form: quiet/dot reporters (`pytest -q`, `cargo -q`, `make -s`, `pnpm --reporter=silent`, `curl -sS`); `--stat`/`--name-only` over full diffs; `-c`/`-l`/`--include` over bodies; `| head -N` on unbounded listings; tool-side filters over dumps. Bulk output → redirect + read a slice. Pipes move rc to last stage → add `set -o pipefail` or read `${PIPESTATUS[0]}` when runner status matters.
- Binary-contained text (e.g. Codex ELF) → `/usr/bin/rg -a -o '<pat>.{0,400}'`; `-a` yields matching lines, while plain `rg` yields only `binary file matches`. Widen `.{N}` on both sides to walk minified call sites.
- YAML frontmatter scalar beginning with indicator char (`[ { } ] , & * ! | > % @ # :`, backtick, double quote) must be quoted; leading `[` otherwise → flow sequence → `ParserError` or silent field drop. Validate ad hoc with ephemeral `pyyaml` parse.

## Meta

- My direct instructions outrank any `AGENTS.md`.
