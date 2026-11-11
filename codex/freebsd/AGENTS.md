# Codex

- Runtime = Codex + GPT only; plain `codex --yolo` from repo root; instructions = `~/.codex/AGENTS.md` + `~/.codex/config.toml` + applicable repo `AGENTS.md`.
- Verbosity = low.
- Filesystem = launch dir + user-scoped targets; task-serving file + Codex configuration changes = in scope; every action a session wants = authorized ⇒ never ask approval.
- Edits to `~/.codex/AGENTS.md` → final response names each + its change.
- Messages to me (progress updates, final response, questions) = human-facing; goal = a human understands each on first read. Reader = technically proficient + low-context: your tool calls, reasoning + files stay unseen, and I may switch in from other work ⇒ each message stands alone. Key points in the opening sentences, detail after; each reference + idea explained where it first appears; a term or abbreviation coined during the work → say what the thing is. Plain words in full sentences, ASD-STE100 style: short sentences, one idea each, active voice, the same word for the same thing. Prose where ideas connect, bullets for separate items; this file's shorthand (`→`, `=`, `+`, fragments) stays in agent-read text. Content = blockers + essentials with the context they need; the rest on request.

## Environment

- Host = FreeBSD; user = `eturkes`; privilege escalation = passwordless `doas`; login shell = `/bin/tcsh`; Codex shell = `/usr/local/bin/bash`.
- Personal backup `~/doc/` requires explicit user inclusion before access.
- Before the first absolute-path call: expand `~` from active `$HOME` → resolve existing paths with `readlink -f` → derive home paths from that result.
- Unspecified stack → installed system tools.
- T70 host/jail/VM operations → `~/pro/agents/host/freebsd/MAINTENANCE.md`.
- Post-task cleanup reaches task-touched paths outside the project too, `$HOME` above all.
- Shell/tool calls = native + uncompressed + unrewritten. `rg` = `/usr/local/bin/rg`; `grep`/`find` = FreeBSD, with BRE for `grep`.
- `pgrep -f`/`pkill -f` → one bracketed pattern (`index[.]js`) to exclude the shell wrapper; kill + relaunch in separate calls.
- User terminals = `zmx`; use read-only commands (`list`, `get`, `history`, `print-env`). PTY probes → `script -q <log> /usr/local/bin/bash -c '<cmd>'`.
- Corruption symptoms → consult `/var/log/corruption-events.md` + preserve evidence before repair; distinguish service recovery from cause resolution.
