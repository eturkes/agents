# RTK - Rust Token Killer

Token-optimized CLI proxy (60-90% savings)

## Usage

All commands are automatically rewritten by the Claude Code hook.
Example: `git status` → `rtk git status` (transparent, 0 tokens overhead)
If RTK has a filter it compresses output, if not it passes through unchanged.
Search runs as bash `grep`/`rg` — Claude Code exposes no Grep/Glob tools here (folded into Bash).

## Pitfalls

In general, when a command fails with `rtk:` in the error, prepend `rtk proxy` to skip the rewrite.

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
- **File doesn't exist / binary not installed** — errors like `rtk: Failed to read file` or `rtk: Failed to execute command` mean the underlying file or tool is missing and that that should be fixed directly.

Rule of thumb:
- One `rtk:` error = switch to `rtk proxy` for that call.
- Some filters degrade silently (no `rtk:` error) — `grep` corruption, `diff`/`show` condensing, and a few build wrappers misreporting results (`prettier` says "all formatted" on dirty files; `next`/`dotnet` report a failed build as "0 errors" or garble error locations) — so trust exit codes and prefer `rtk proxy` whenever exact output matters. (Most build/lint/test wrappers — cargo, go, ruff, mypy, pytest, tsc, rubocop, rspec, eslint, jest, vitest, playwright, gradlew, prisma, psql, gh, glab — preserve their output fine.)
- Two failures in a row on the same command = the issue is something else.
