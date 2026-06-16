# RTK - Rust Token Killer

Token-optimized CLI proxy (60-90% savings)

## Usage

All commands are automatically rewritten by the Claude Code hook.
Example: `git status` → `rtk git status` (transparent, 0 tokens overhead)
If RTK has a filter it compresses output, if not it passes through unchanged.

## Pitfalls

In general, when a command fails with `rtk:` in the error, prepend `rtk proxy` to skip the rewrite.

Known cases:
- **`sudo <cmd>`** — sudo strips PATH, so `sudo rtk <cmd>` fails with `sudo: rtk: command not found`. Run as `rtk proxy sudo <cmd>` (or just `sudo <cmd>` — the hook will still rewrite, so prefer `rtk proxy`).
- **`find` with compound expressions** (`-not`, `-exec`, `-and`, `-or`) — `rtk find` rejects these. Use `rtk proxy find <args>`.
- **Need raw, unfiltered output** (piping into a parser, exact byte capture, diffing tool output verbatim) — `rtk proxy <cmd>` returns the unmodified stdout/stderr.
- **`git diff` (and other large outputs)** — RTK truncates long output silently, so you may miss hunks past the cutoff. For a full diff (especially when reviewing changes before commit), use `rtk proxy git diff` or redirect to a file.

On the other hand:
- **File doesn't exist / binary not installed** — errors like `rtk: Failed to read file` or `rtk: Failed to execute command` mean the underlying file or tool is missing and that that should be fixed directly.

Rule of thumb:
- One `rtk:` error = switch to `rtk proxy` for that call.
- Two failures in a row on the same command = the issue is something else.
