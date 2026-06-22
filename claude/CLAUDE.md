# Environment

- Debian container; you (and all your sessions/subagents) are its sole user, with passwordless sudo and full read/write. Network available. Use LSP servers; REPLs via the bash script `~/.local/bin/bgcmd`.
- Modify the environment, modify yourself (skills, plugins, etc.), and install/download anything. Persist when blocked; prompt me if you can't resolve it.
- Keep the home directory clean: run package-manager cleanup after such tools, clear unused directories and dangling symlinks when you spot them.
- Prefer the superior tooling already installed: `uv` and `pnpm` for packages, `chromiumfish` for browser automation and web scraping.
- Serena (an LSP registered by Headroom) does symbol-level navigation and editing; its built-in memory is disabled — use the project's own memory store.
- Reference docs are mirrored at `~/agents/docs/<site>/llms.txt` (e.g. scopedcommits.com, agentlanguages.dev) — prefer the mirror over a web fetch.

# Reading

- Read file contents only via the `Read` tool, even inside a compound `Bash` command — shell dumps bypass Headroom compression and the `Read()` do-not-read rules, so they're denied as backstop.
- Reads pass through Headroom (lossy but reversible): treat a compressed read as browse-only, and suspect the proxy before the source when output looks garbled/truncated. `Edit` needs a byte-exact `old_string`, so get verbatim first via `headroom_retrieve` (filtered to the span) or a narrow line-range `Read`.

# RTK (Rust Token Killer)

A CLI proxy auto-applied by the Claude Code hook (`git status` → `rtk git status`, 0-token overhead); it compresses output when it has a filter, else passes through unchanged. Search runs as bash `grep`/`rg` — no Grep/Glob tools here (folded into Bash).

## Pitfalls
- **`sudo <cmd>`** — sudo strips PATH, so `sudo rtk <cmd>` fails with `sudo: rtk: command not found`. Run `rtk proxy sudo <cmd>` (or just `sudo <cmd>` — the hook still rewrites, so prefer `rtk proxy`).
- **`find`** — `rtk find` gives a useful noise-filtered file list, but rejects compound expressions (`-not`, `-exec`, `-and`, `-or`) and mis-reads a bare path (`rtk find <dir>` → `0 for ...`). For those, use `rtk proxy find <args>`.
- **`grep`/`rg`** — excluded from the rewrite (run raw): `rtk grep` corrupts any matched line containing `:` (drops content, miscounts files), and `rg` maps to non-recursive `grep`. If an env lacks the exclusion, search with `rtk proxy rg`.
- **`diff`** — excluded too (runs raw): standalone `rtk diff` gives false negatives ("Files are identical" when they differ after the first token). `rtk git diff` uses git's own diff and is unaffected.
- **`rtk format`** — destructive despite the "format checker" description: by default it runs the formatter in WRITE mode and rewrites files. Pass `--check` for read-only, or run `black`/`ruff`/`prettier --check` directly.
- **Need raw, unfiltered output** (piping into a parser, exact byte capture, diffing tool output verbatim) — `rtk proxy <cmd>` returns the unmodified stdout/stderr.
- **`git diff`/`git show` (and other large outputs)** — RTK condenses diffs (drops context lines; `git show` also drops the commit message body) and truncates long output silently. For full text — reviewing changes before commit, or reading a commit's rationale — use `rtk proxy git diff`/`git show` or redirect to a file.
- **Summarizing filters** (`json`, `env`, `log`, `curl`) — lossy previews, not full content: `rtk json` truncates long values/arrays and reorders keys, `rtk env` hides ~half the vars, `rtk log` drops INFO detail, `rtk curl` shows JSON as a schema. Use `rtk proxy <cmd>` (or the Read tool for files) for exact content.
- **File doesn't exist / binary not installed** (not an RTK quirk) — errors like `rtk: Failed to read file`/`rtk: Failed to execute command` mean the underlying file or tool is missing; fix it directly.

## Rule of thumb
- One `rtk:` error = switch to `rtk proxy` for that call.
- Some filters degrade silently (no `rtk:` error) — `grep` corruption, `diff`/`show` condensing, some build wrappers misreporting (`prettier` says "all formatted" on dirty files; `next`/`dotnet` report a failed build as "0 errors" or garble locations) — so trust exit codes and prefer `rtk proxy` when exact output matters. (Most wrappers preserve output fine: cargo, go, ruff, mypy, pytest, tsc, rubocop, rspec, eslint, jest, vitest, playwright, gradlew, prisma, psql, gh, glab.)
- Two failures in a row on the same command = the issue is something else.

# Meta

- Rewrite either instruction file — the global `~/.claude/CLAUDE.md` or a project's `CLAUDE.md` — whenever something is obsolete, better phrased, or improvable; just inform me.
- When my instructions conflict with any `CLAUDE.md`, my instructions are the final say.
