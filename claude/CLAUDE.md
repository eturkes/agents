# Environment

- Debian container; you + all sessions/subagents = sole user: passwordless sudo, full r/w, network. LSP; REPLs via `~/.local/bin/bgcmd`.
- Host & container share trees at different abs paths (in-container `/run/host/...`). uv venvs path-bake per-layer → pick by path-prefix. Per-layer `UV_PROJECT_ENVIRONMENT` (`.venv`/`.venv-host`, git-ignored); `.envrc`+direnv in interactive shells, else `export`.
- Moving a project dir breaks uv's baked abs-path shebangs in `.venv/bin/` scripts (the `python` symlink masks it) → `rm -rf .venv && uv sync`.
- Freely modify env + yourself (skills/plugins) + install anything; persist through blockers, ask only when truly stuck.
- Keep `$HOME` clean: pkg-manager cleanup post-install; clear stale dirs + dangling symlinks.
- Installed: `uv`, `pnpm`, `cargo-binstall` (pkgs), `chromiumfish` (browser/scrape).
- `grep` = function → embedded `ugrep -G` (system binary = GNU grep 3.11); both do GNU BRE specials (`\|`=alternation, `\+`=one-or-more), write directly.
- `pgrep -f`/`pkill -f` self-match their `bash -c 'eval …'` wrapper → bracket the pattern (`index[.]js`) + `|| echo none`.
- `bgcmd` = filesystem REPL, objects persist across separate Bash calls: `export BGCMDDIR=<dir> BGCMDPROMPT='>>> '` (re-export each call) → `bgcmd START <interp> -i -q` → `bgcmd '<oneliner>'` → `bgcmd 'exit()'; rm -rf "$BGCMDDIR"`.
- Serena (Headroom MCP) = primary LSP: symbol nav/edit, ~70 langs, servers auto-install; memory tools off → use the project's. Missing lang → gap-fill plugin in the `global` LSP marketplace. Both global, zero setup.
- Serena gotchas: `Active languages: [...]` → add lang to project `.serena/project.yml` `languages:` (first = fallback LS), restart Claude Code (startup-only config), verify via a symbol call (first may lag). `replace_symbol_body` spans the leading doc comment + outer `#[...]` attrs → include them or use `replace_content`. Serena rewrites `project.yml` to its full annotated template on missing keys → track as written (else re-dirties tree). Serena owns `.serena/.gitignore` → commit `.serena/`; root `.gitignore` stays project-only.
- Docs mirror `~/agents/docs/<site>/llms.txt` (scopedcommits.com, agentlanguages.dev) > web fetch.

# Reading

- File contents → `Read` tool (shell dumps denied as backstop, even in a compound `Bash`).
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

# Subagents

- Subagent window = session's, via the terminal launch flag `CLAUDE_CODE_DISABLE_1M_CONTEXT`: `=1` → 200K, omit → 1M (a `claude` launch-command flag; settings files carry model slugs).
- Subagents run without compaction → window overflow = hard mid-task death: the next request is rejected INLINE as `Prompt is too long` (no result). Budget context with margin (a read+rewrite agent peaks ~100K on ~40KB) → chunk big rewrites at section boundaries. Transcripts: `~/.claude/projects/<project>/<session>/subagents/agent-<id>.jsonl` (`.message.usage`).
- Fan out several subagents/turn across items/files; chunk sequentially to dodge rate-limit failures, confirm each completed.

# Meta

- This global `~/.claude/CLAUDE.md` holds Claude guidance even outside a project (always-on RTK + Headroom) → update the moment it's improvable.
- My direct instructions outrank any `CLAUDE.md`.
