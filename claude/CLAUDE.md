# Environment

- Debian container; you (and all your sessions/subagents) are its sole user, with passwordless sudo and full read/write. Network available. Use LSP servers; REPLs via the bash script `~/.local/bin/bgcmd`.
- Host & container share working trees at **different absolute paths** — in-container under `/run/host/...`, native on the host. So path-baking artifacts (uv venvs) are per-layer: select by that prefix (the ground truth), not a marker like `/run/.containerenv` (can be absent). uv: per-layer `UV_PROJECT_ENVIRONMENT` (`.venv`/`.venv-host`, git-ignored); a project `.envrc` (direnv) automates it in allowed interactive shells only, else `export` explicitly.
- Modify the environment, modify yourself (skills, plugins, etc.), and install/download anything. Persist when blocked; prompt me if you can't resolve it.
- Keep the home directory clean: run package-manager cleanup after such tools, clear unused directories and dangling symlinks when you spot them.
- Prefer modern, best-in-class tooling; `uv`, `pnpm`, and `cargo-binstall` (packages) and `chromiumfish` (browser automation / scraping) are already installed.
- Serena (Headroom's MCP server) is the primary LSP — symbol nav/edit, ~70 languages, servers auto-installed on first use; memory disabled, use the project's. For a language Serena lacks, enable a gap-fill plugin in the `global` Claude LSP marketplace. Both global, no project setup.
- Serena gotchas: a symbolic-tool `Active languages: [...]` error means the language isn't enabled — add it to the project's `.serena/project.yml` `languages:` (first entry = the fallback LS) and restart Claude Code (config is read only at startup), then verify with a symbol call (the first may lag on indexing). `replace_symbol_body` spans the symbol's leading doc comment AND outer `#[...]` attributes — a body omitting them deletes them, so include them or edit inner regions with `replace_content`. On startup Serena rewrites `project.yml` to its full annotated template when keys are missing, so track the file exactly as written or it re-dirties the tree every session.
- Reference docs are mirrored at `~/agents/docs/<site>/llms.txt` (e.g. scopedcommits.com, agentlanguages.dev) — prefer the mirror over a web fetch.
- Web search: the `WebSearch` tool 400s on this model line (its forced `tool_choice` is rejected and the error arrives INLINE in an ok-looking result), so reach the web with `WebFetch` on `https://lite.duckduckgo.com/lite/?q=<query>` (sandbox `curl` hits a bot wall) or targeted channels — crates.io (`curl` with a `-A` header: detail `/api/v1/crates/NAME`, search `/crates?q=`), GitHub `/search/repositories?q=`, Wikipedia opensearch. A Workflow `agent()` with a `schema` is unaffected; re-test on a Claude Code or model-line change.

# Reading

- Read file contents only via the `Read` tool, even inside a compound `Bash` command — shell dumps bypass Headroom compression and the `Read()` do-not-read rules, so they're denied as backstop.
- Reads pass through Headroom (lossy but reversible): treat a compressed read as browse-only, and suspect the proxy before the source when output looks garbled/truncated. `Edit` needs a byte-exact `old_string`, so get verbatim first via `headroom_retrieve` (filtered to the span) or a narrow line-range `Read` — compression also re-wraps long prose lines, so an `old_string` lifted from a compressed read can miss the file's real wrap points (and the `Edit` mismatch error's `\uXXXX` hint misleads; anchor on raw printed bytes). Prefer short distinctive anchors; re-reading identical bytes returns the SAME cached result (content-dedup), so once an original ages past the proxy TTL `headroom_retrieve` can answer "not found" — then dodge the proxy for exact bytes via small-output `grep -n`/`sed` or a Python `read_text()`.
- `Edit`/`Write` string parameters decode `\uXXXX` escapes — and only those (`\n`, `\xNN` pass through) — so source that must hold a literal backslash-`u` is silently corrupted and often still compiles. Express such bytes another way (a byte-array literal with `0x5c` for the backslash) and read the region back after writing.
- A turn-halting `API Error: <ConnectionTerminated error_code:0 …>` is the upstream HTTP/2 connection rotating mid-stream (a GOAWAY surfacing through the Headroom proxy): transient, content-independent, and SDK-unretryable. Recovery — session context survives, so `git status` to confirm tree state, then continue the interrupted action.
- That compression tracks **boilerplate redundancy**: it folds repeated structure (log/format strings, repetitive prose) into a deduped token-bag and keeps high-entropy tokens verbatim, above a ratio bar that tightens as context fills, so a file's result varies by read. Spot it by the token-bag ending `[N … compressed … hash=…]`; expect collapse on boilerplate-dense code (logging, formatting) and verbatim on varied code.

# RTK (Rust Token Killer)

A CLI proxy auto-applied by the Claude Code hook (`git status` → `rtk git status`, 0-token overhead); it compresses output when it has a filter, else passes through unchanged. Search runs as bash `grep`/`rg` — no Grep/Glob tools here (folded into Bash).

## Pitfalls
- **`sudo <cmd>`** — sudo strips PATH, so `sudo rtk <cmd>` fails with `sudo: rtk: command not found`. Run `rtk proxy sudo <cmd>` (or just `sudo <cmd>` — the hook still rewrites, so prefer `rtk proxy`).
- **`find`** — `rtk find` gives a useful noise-filtered file list, but rejects compound expressions (`-not`, `-exec`, `-and`, `-or`) and mis-reads a bare path (`rtk find <dir>` → `0 for ...`). For those, use `rtk proxy find <args>`.
- **`grep`/`rg`** — whether RTK rewrites these or runs them raw is env-dependent; never assume either, verify per env (diff a known match against `rtk proxy grep`). When rewritten the damage is silent: `rtk grep` corrupts any matched line containing `:` (drops content, miscounts files), bare `rg` maps to non-recursive `grep`, and combined short flags reparse (`grep -rln` ran as `rg -r ln` = `--replace ln`: zero output, exit 0). When unsure, bypass with `rtk proxy grep`/`rtk proxy rg` and sanity-check that a known-present match returns (a silent reparse can exit 0 with no output).
- **`diff`** — excluded too (runs raw): standalone `rtk diff` gives false negatives ("Files are identical" when they differ after the first token). `rtk git diff` uses git's own diff and is unaffected.
- **`rtk format`** — destructive despite the "format checker" description: by default it runs the formatter in WRITE mode and rewrites files. Pass `--check` for read-only, or run `black`/`ruff`/`prettier --check` directly.
- **Need raw, unfiltered output** (piping into a parser, exact byte capture, diffing tool output verbatim) — `rtk proxy <cmd>` returns the unmodified stdout/stderr.
- **`git diff`/`git show`/`git log` (and other large outputs)** — RTK condenses diffs (drops context lines; `git show` also drops the commit message body) and truncates long output silently (`git log` piped cuts off at 50 entries with no marker). For full text — reviewing changes before commit, reading a commit's rationale, or full listings and counts — use `rtk proxy git diff`/`show`/`log`, `git rev-list --count`, or redirect to a file.
- **`git commit -m`** — RTK mangles a multi-`-m` message carrying non-ASCII (`§`, em-dash): args drop or split and the commit silently never lands while RTK prints success (the staged add stays). Pass the message from a file (`git commit -F <path>`, then remove it); single-`-m` ASCII commits are safe.
- **Summarizing filters** (`json`, `env`, `log`, `curl`) — lossy previews, not full content: `rtk json` truncates long values/arrays and reorders keys, `rtk env` hides ~half the vars, `rtk log` drops INFO detail, `rtk curl` shows JSON as a schema. Use `rtk proxy <cmd>` (or the Read tool for files) for exact content.
- **File doesn't exist / binary not installed** (not an RTK quirk) — errors like `rtk: Failed to read file`/`rtk: Failed to execute command` mean the underlying file or tool is missing; fix it directly.

## Rule of thumb
- One `rtk:` error = switch to `rtk proxy` for that call.
- Some filters degrade silently (no `rtk:` error) — `grep` corruption, `diff`/`show` condensing, some build wrappers misreporting (`prettier` says "all formatted" on dirty files; `next`/`dotnet` report a failed build as "0 errors" or garble locations) — so trust exit codes and prefer `rtk proxy` when exact output matters. (Most wrappers preserve output fine: cargo, go, ruff, mypy, pytest, tsc, rubocop, rspec, eslint, jest, vitest, playwright, gradlew, prisma, psql, gh, glab.)
- When byte-compatibility is the bar, prove equality with `cmp`/`sha256sum` rather than eyeballed output, and read real diffs via `git diff --no-index` or `rtk proxy diff`.
- Two failures in a row on the same command = the issue is something else.

# Subagents

- A subagent's context window equals the session's, fixed by one launch flag: prefix `claude` with `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` for 200K, omit it for 1M (terminal-only — settings carry model slugs, not this flag). The flag gates the 1M beta header process-wide, so with it on a `CLAUDE_CODE_SUBAGENT_MODEL=<model>[1m]` slug is inert and every subagent caps at 200K (a subagent env block echoing `[1m]` confirms model selection only, never the window).
- Subagents never compact, so window overflow is a hard mid-task death: the API rejects the next request and the Agent result carries an INLINE `Prompt is too long` (no exception, no result). In 200K sessions budget each subagent at 200K with margin — a read-plus-rewrite agent handles ~40KB of text (~100K peak); chunk larger rewrites at section boundaries. Per-agent transcripts: `~/.claude/projects/<project>/<session-id>/subagents/agent-<id>.jsonl` (assistant `.message.usage`).
- Fan out several subagents per turn across items or files; chunk sequentially to dodge unrecovered rate-limit failures, and verify each ran to completion.

# Meta

- This global `~/.claude/CLAUDE.md` holds Claude guidance that applies even outside any project — so RTK and Headroom (always in use) live here; update it the moment it's improvable.
- When my instructions conflict with any `CLAUDE.md`, my instructions are the final say.
