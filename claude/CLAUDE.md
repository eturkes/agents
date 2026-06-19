# RTK - Rust Token Killer

Token-optimized CLI proxy (60-90% savings)

## Usage

Most commands are automatically rewritten by the Claude Code hook.
Example: `git status` → `rtk git status` (transparent, 0 tokens overhead)
If RTK has a filter it compresses output, if not it passes through unchanged.
Search runs as bash `grep`/`rg` — Claude Code exposes no Grep/Glob tools here (folded into Bash).

## Pitfalls

Known cases:
- **`sudo <cmd>`** — sudo strips PATH, so `sudo rtk <cmd>` fails with `sudo: rtk: command not found`. Run as `rtk proxy sudo <cmd>` (or just `sudo <cmd>` — the hook will still rewrite, so prefer `rtk proxy`).
- **`find`** — `rtk find` gives a useful noise-filtered file list, but rejects compound expressions (`-not`, `-exec`, `-and`, `-or`) and mis-reads a bare path (`rtk find <dir>` → `0 for ...`). For those, use `rtk proxy find <args>`.
- **`grep`/`rg`** — excluded from the rewrite (they run raw): `rtk grep` corrupts any matched line containing `:` (drops content, miscounts files) and `rg` maps to non-recursive `grep`. If an env lacks the exclusion, search with `rtk proxy rg`.
- **`diff`** — excluded too (runs raw): standalone `rtk diff` gives false negatives ("Files are identical" when they differ after the first token). `rtk git diff` uses git's own diff and is unaffected.
- **`rtk format`** — destructive despite the "format checker" description: by default it runs the formatter in WRITE mode and rewrites files. Pass `--check` for read-only, or run `black`/`ruff`/`prettier --check` directly.
- **Need raw, unfiltered output** (piping into a parser, exact byte capture, diffing tool output verbatim) — `rtk proxy <cmd>` returns the unmodified stdout/stderr.
- **`git diff`/`git show` (and other large outputs)** — RTK condenses diffs (drops context lines; `git show` also drops the commit message body) and truncates long output silently. For full text — reviewing changes before commit, or reading a commit's rationale — use `rtk proxy git diff`/`git show` or redirect to a file.
- **Summarizing filters** (`json`, `env`, `log`, `curl`) — lossy previews, not full content: `rtk json` truncates long values/arrays and reorders keys, `rtk env` hides ~half the vars, `rtk log` drops INFO detail, `rtk curl` shows JSON as a schema. Use `rtk proxy <cmd>` (or the Read tool for files) for exact content.

On the other hand:
- **File doesn't exist / binary not installed** — errors like `rtk: Failed to read file` or `rtk: Failed to execute command` mean the underlying file or tool is missing and should be fixed directly.

Rule of thumb:
- One `rtk:` error = switch to `rtk proxy` for that call.
- Some filters degrade silently (no `rtk:` error) — `grep` corruption, `diff`/`show` condensing, and a few build wrappers misreporting results (`prettier` says "all formatted" on dirty files; `next`/`dotnet` report a failed build as "0 errors" or garble error locations) — so trust exit codes and prefer `rtk proxy` whenever exact output matters. (Most build/lint/test wrappers — cargo, go, ruff, mypy, pytest, tsc, rubocop, rspec, eslint, jest, vitest, playwright, gradlew, prisma, psql, gh, glab — preserve their output fine.)
- Two failures in a row on the same command = the issue is something else.

# Environment

- Debian 13 Distrobox sandbox on an openSUSE host; you (and all your sessions/subagents) are its sole user, with passwordless sudo and full read/write. Network is available. Use LSP servers and REPLs via `~/.local/bin/bgcmd`.
- You may modify the environment, modify yourself (skills, plugins, etc.), and install/download anything. Persist when blocked, and prompt me if you can't resolve it.
- Keep the home directory clean: run package-manager cleanup after using such tools, and clear unused directories and dangling symlinks when you spot them.
- Prefer the superior tooling already installed: `uv` and `pnpm` for package management, `chromiumfish` for browser automation and web scraping.
- Serena (an LSP registered by Headroom) is available for symbol-level navigation and editing; its built-in memory is disabled — use the project's own memory store.

# Reading

- Read file contents only via the `Read` tool, even inside a compound `Bash` command — shell dumps bypass Headroom compression and the `Read()` do-not-read rules, and are denied as backstop.
- Reads pass through Headroom (lossy but reversible): treat a compressed read as browse-only, and suspect the proxy before the source when output looks garbled/truncated. `Edit` needs a byte-exact `old_string`, so get verbatim first via `headroom_retrieve` (filtered to the span) or a narrow line-range `Read`.

# Meta

- You may rewrite either instruction file — the global `~/.claude/CLAUDE.md` or a project's `CLAUDE.md` — whenever something is obsolete, better phrased, or you find a better way; just inform me.
- When my instructions conflict with any `CLAUDE.md`, my instructions are the final say.
