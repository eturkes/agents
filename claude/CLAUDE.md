# Environment

- Debian container; you + all sessions/subagents = sole user: passwordless sudo, full r/w, network. LSP; REPLs via `~/.local/bin/bgcmd`.
- Host & container share trees at different abs paths (in-container `/run/host/...`). uv venvs path-bake per-layer → pick by path-prefix. Per-layer `UV_PROJECT_ENVIRONMENT` (`.venv`/`.venv-host`, git-ignored); `.envrc`+direnv in interactive shells, else `export`.
- Moving a project dir breaks uv's baked abs-path shebangs in `.venv/bin/` scripts (the `python` symlink masks it) → `rm -rf .venv && uv sync`.
- Freely modify env + yourself (skills/plugins) + install anything; persist through blockers, ask only when truly stuck.
- Keep `$HOME` clean: pkg-manager cleanup post-install; clear stale dirs + dangling symlinks.
- Installed: `uv`, `pnpm`, `cargo-binstall` (pkgs), `chromiumfish` (browser/scrape).
- `grep`/`find` = CC shell-fn shadow → tweakcc `rg-fff` (**RE2**, relevance-ranked, fuzzy-fallback; see `# fff`), NOT raw `ugrep -G`/`bfs`. `rg`=`/usr/bin/rg` (unshadowed). System `grep` binary = GNU grep 3.11 (BRE). Byte-exact/clean → `command grep` | `/usr/bin/rg` | `rtk proxy grep`.
- `pgrep -f`/`pkill -f` self-match their `bash -c 'eval …'` wrapper → bracket the pattern (`index[.]js`) + `|| echo none`.
- `bgcmd` = filesystem REPL, objects persist across separate Bash calls: `export BGCMDDIR=<dir> BGCMDPROMPT='>>> '` (re-export each call) → `bgcmd START <interp> -i -q` → `bgcmd '<oneliner>'` → `bgcmd 'exit()'; rm -rf "$BGCMDDIR"`.
- Serena (Headroom MCP) = primary LSP: symbol nav/edit, ~70 langs, servers auto-install; memory tools off → use the project's. Missing lang → gap-fill plugin in the `global` LSP marketplace. Both global, zero setup.
- Serena gotchas: `Active languages: [...]` → add lang to project `.serena/project.yml` `languages:` (first = fallback LS), restart Claude Code (startup-only config), verify via a symbol call (first may lag). `replace_symbol_body` spans the leading doc comment + outer `#[...]` attrs → include them or use `replace_content`. Serena rewrites `project.yml` to its full annotated template on missing keys → track as written (else re-dirties tree). Serena owns `.serena/.gitignore` → commit `.serena/`; root `.gitignore` stays project-only. Diagnostic delivery splits by provider: a Serena-served language surfaces diagnostics only on an explicit get_diagnostics_for_file call; a format served by a `global`-marketplace LSP plugin also pushes passively through the harness new-diagnostics channel (the passive push is the plugin path — Serena is MCP, not a Claude Code LSP plugin) → query Serena formats explicitly, they don't auto-appear on edit.
- Marksman (Serena's bundled markdown LSP, active when `.serena/project.yml` `languages:` lists `markdown`): diagnostics on get_diagnostics_for_file like any Serena format (source "Marksman", code 2/Warning), unconfigurable (no `.marksman.toml` knob; Diag.fs emits phantom and real findings the same code, so any filter kills the signal). Three real warning shapes, all quick fixes — phantom reference-link: bare adjacent `][` bracket groups outside code spans parse as reflinks → backtick-wrap regexes/grammars/notation (grep `][` to find them); "non-existent document": repair the link; "Ambiguous link": target has >1 H1 (title_from_heading registers each as a title → keep one, demote the rest). Its index honors `.ignore`/`.gitignore`/`.hgignore` (Folder.fs), read at folder-scan not watched (changes apply at next LSP start): an ignored markdown target turns valid links into false "non-existent document" warnings → to hide a dir from rg sweeps without blinding Marksman, exclude it in `.rgignore` (rg-only, Marksman-invisible). Off-switch: drop `markdown` from `languages:` (restart Claude Code).
- Docs mirror `~/agents/docs/<site>/llms.txt` (scopedcommits.com, agentlanguages.dev) > web fetch.

# Reading

- File contents → `Read` tool (shell dumps denied as backstop, even in a compound `Bash`).
- PDF `Read` → its bundled rasterizer reports `pdftoppm is not installed` even after `apt-get install poppler-utils` (it ignores the system `/usr/bin/pdftoppm`; Bash sees it fine) → render pages via Bash `pdftoppm -png -r 80 f.pdf out` then `Read` the PNG(s); `pdfinfo` = page count/size, `pdftotext f.pdf -` = embedded text (empty ⇒ outlined/rasterized text, use the PNG).
- Reads pass Headroom: lossy but reversible. Compression = a token-bag `[N … compressed … hash=…]` (high-entropy stays verbatim) → recover via `headroom_retrieve` on its `hash=`. Compressed read = browse-only; suspect the proxy before the source on garbled output. Byte-exact `Edit` `old_string` → verbatim via `headroom_retrieve` / narrow line-range `Read` / `grep -n`/`sed`/Python `read_text()`, anchoring on short distinctive raw bytes (compression re-wraps prose; the `\uXXXX` mismatch hint misleads). Dedups → past the TTL (86400s, `~/.profile`) or store cap, `headroom_retrieve` 404s → `grep -n`/Python.
- `Edit`/`Write` decode `\uXXXX` only (`\n`, `\xNN` pass through) → a literal backslash-`u` gets rewritten (often still compiles); encode another way (byte array, `0x5c` = backslash) + re-read after writing.
- Quote YAML frontmatter scalars opening with an indicator char (`[ { } ] , & * ! | > % @ # :`, backtick, double-quote): leading `[` → flow sequence → `ParserError` or silently-dropped field. Verify ad-hoc frontmatter with an ephemeral `pyyaml` parse.
- `API Error: <ConnectionTerminated error_code:0 …>` = transient HTTP/2 GOAWAY mid-stream through Headroom; context survives → `git status`, resume.

# RTK (Rust Token Killer)

CLI proxy auto-applied by the Claude Code hook (`git status` → `rtk git status`, 0-token). Compresses when it has a filter, else passes through. Search = bash `grep`/`rg`. `rtk proxy <cmd>` = raw passthrough → for exact bytes.

## Filters
- **`sudo`** strips PATH → `rtk proxy sudo <cmd>` (or plain `sudo`; hook still rewrites).
- **`find`**: `rtk find <dir> -name …` = noise-filtered list; bare path (`→ 0 for …`) or compound (`-not`/`-exec`/…) → `rtk proxy find`.
- **`grep`/`rg`**: rewrite-vs-raw env-dependent (verify per env vs `rtk proxy grep`). Rewritten = header + `file:line:` prefixes, but preserves matched lines (incl. `:`), counts files right, `rg` recursive, combined flags (`grep -rln`) OK. Exact → `rtk proxy grep`/`rg`.
- **`diff`**: standalone `rtk diff` can falsely say "Files are identical" → `rtk git diff`, `rtk proxy diff`, or `git diff --no-index`.
- **`rtk format`**: WRITE mode by default (rewrites) → `--check` for read-only, or run the formatter directly (`black`/`ruff`/`prettier --check`; in project venvs → `uv run ruff`).
- **`git diff`/`show`/`log`** + large output: drops diff context, drops `git show` body, truncates piped `git log` at 50 → full text/counts via `rtk proxy git …`, `git rev-list --count`, or redirect.
- **`json`/`env`/`log`/`curl`** = lossy previews (`json` truncates+reorders, `env` hides ~half, `log` drops INFO, `curl` = schema) → `rtk proxy <cmd>` (or `Read`) for exact.
- **`rtk: Failed to read file`/`execute command`** = missing file/binary → fix directly.

## Rules
- One `rtk:` error → `rtk proxy` that call. Two failures on one command → cause is elsewhere.
- Filters can degrade silently: `diff`/`show` condensing; build wrappers misreport (`prettier` says "all formatted" on dirty files; `next`/`dotnet` log a failed build as "0 errors"/garbled) → trust exit codes; `rtk proxy` when exact output matters.
- Byte-equality → prove with `cmp`/`sha256sum`; real diffs via `git diff --no-index` or `rtk proxy diff`.

# fff search (tweakcc `rg-fff` — shadows `grep`/`find`)

CC shell-snapshot repoints `grep`→`rg-fff` (argv0 ugrep), `find`→`rg-fff` (argv0 bfs); **fff-first = DEFAULT** → serves fff **RE2**, relevance-RANKED, with inline markers. `rg`=`/usr/bin/rg` (shadowed only if system rg absent → here untouched). Auto-spawns `rg-fff --daemon <cwd>` (warm idx, ~30m idle; accumulates per-cwd, harmless — `pgrep -af 'rg[-]fff --daemon'`). RTK passes `grep`/`find` thru to fff here (if it ever rewrites→`rtk grep`, fff bypassed).

- **Output ≠ real grep** → RANKED not file-order, strips leading `./`, inline markers, lines capped 512B. Clean/order-stable/byte-exact/full-line → `command grep` (=GNU 3.11 BRE, `./`, file-order, untruncated) | `/usr/bin/rg` | `rtk proxy grep`.
- **Zero-match grep ≠ empty (BIG)**: auto fuzzy-fallback → `# rg-fff: 0 EXACT…` hdr + N ` [~approx]` lines on **STDOUT** (survive `2>/dev/null`, flow into pipes/`$()`), shaped like real `path:line:text`. Truth = **exit 1** + `[~approx]`/leading-`#`, NOT line presence → piping/capturing a maybe-zero grep MUST filter `[~approx]`/`#` or use `command grep`. Off: `RG_FFF_NO_FUZZY_FALLBACK=1`.
- **`[def]`** trailing tag = likely definition; rank does NOT float it up (junk/long lines outrank — observed def landing last) → trust tag, not position. "read top hit first" unreliable.
- **>512B line** → served truncated + ` [...rg-fff: line truncated at ~512B; Read the file for the full line]` (`-c` counts it once); non-UTF-8 (U+FFFD) long line defers instead → Read file for full line.
- **`find P -name|-iname PAT` [-type f] zero-match** → fuzzy filename suggest (`# rg-fff: 0 exact…` + `name [~approx]`), **exit 0** (find code, ≠ grep's 1); suggest lines lack `./`, real matches have `./`. `-type d`/`-exec`/`-delete`/`-mtime`/`-maxdepth`/… never augmented (+ never fff-captured → side-effect-safe). Off: same env.
- **Served**: literals incl. phrases w/ space/`:`/quote (regex-escaped), RE2 regex (`\b \d \w + ( ) | {} ?`), `-i` (case-insensitive, any-case pat), `-A/-B/-C N`, `-l`, `-c`, `--include=*.ext`, multi reldir-under-cwd. No `-r` = top-level only (non-recursive; no "Is a directory" error).
- **DEFERS → embedded ugrep -G = BRE** (clean, file-order, no markers): stdin/pipe (`…|grep` ALWAYS, ~52% of greps), single-file arg, `-o`, `-P`/PCRE, regex matching newline (`\s`/negated class) or empty (`x?`,`foo|`), non-ASCII pat, `--no-ignore`/`--include-dir`, abs/`./`/`.`-mixed path, glob ≠ `*.ext`. **Deferred regex = BRE** → RE2/ERE syntax misfires (`foo|bar` defers→matches literal "foo|bar").
- **Dialect when SERVED = RE2** → bare `|`=alt, `+ * ?`=quant, `()`=group, `\d \w \b` classes; `\|` `\+` = LITERAL. Old BRE `\|`=alt / `\+`=1+ advice now valid ONLY for `command grep` / deferred path.
- Knobs: `RG_FFF_FIRST=0` = regex→byte-equiv BRE-mirror (literals STAY fff-ranked+marked, NOT a declutter); `RG_FFF_LOG=<path>` per-call decision log; `RG_FFF_DEBUG=1` regex-defer reason.

# Subagents

- Subagent window = session's, via the terminal launch flag `CLAUDE_CODE_DISABLE_1M_CONTEXT`: `=1` → 200K, omit → 1M (a `claude` launch-command flag; settings files carry model slugs).
- Subagents run without compaction → window overflow = hard mid-task death: the next request is rejected INLINE as `Prompt is too long` (no result). Budget context with margin (a read+rewrite agent peaks ~100K on ~40KB) → chunk big rewrites at section boundaries. Transcripts: `~/.claude/projects/<project>/<session>/subagents/agent-<id>.jsonl` (`.message.usage`).
- Fan out several subagents/turn across items/files; chunk sequentially to dodge rate-limit failures, confirm each completed.

# Meta

- This global `~/.claude/CLAUDE.md` holds Claude guidance even outside a project (always-on RTK + Headroom) → update the moment it's improvable; first session to hit a project-independent env/tool failure logs it here that turn.
- Instruction-file hierarchy, all yours to edit (route durable guidance to the narrowest fit): this global `~/.claude/CLAUDE.md` = Claude, env/tooling, project-INDEPENDENT (applies outside any project); `CLAUDE.local.md` = machine-specific but project-RELEVANT-only (its distinction from this file) — gitignored per project yet reused verbatim across my projects + tracked once in the `~/agents` dotfiles repo, so edit it ONLY with facts meeting BOTH criteria (every edit propagates to all projects); per project, `CLAUDE.md` (Claude-specific project config, imports its `AGENTS.md`) and `AGENTS.md` (agent-agnostic working principles read by Claude AND Codex → keep every file reference there agent-neutral) carry durable guidance; `.agent/memory.md` carries project-SPECIFIC learned facts/decisions (agent-agnostic, read by Codex too). AGENTS.md's principles are project-INDEPENDENT in nature yet live per-project — no global tier both agents read (this file is Claude-only), so they recur across projects by necessity. Route a durable item by two axes: agent-agnostic working principle → that project's `AGENTS.md`; project-specific learned fact/decision → its `.agent/memory.md`; Claude-specific config → the narrowest CLAUDE tier (project-independent → here; machine-specific + cross-project → `CLAUDE.local.md`; this-project → per-project `CLAUDE.md`).
- My direct instructions outrank any `CLAUDE.md`.
