# Codex

- Runtime = Codex + GPT only; plain `codex --yolo` from repo root; instructions = `~/.codex/AGENTS.md` + `~/.codex/config.toml` + applicable repo `AGENTS.md`.
- Verbosity = low; personality/reasoning-summary/raw-reasoning display = off; Apps = disabled.
- Filesystem = launch dir + user-scoped targets; task-serving file + Codex configuration changes = in scope.
- Edits to `~/.codex/AGENTS.md` → final response names each + its change.

## Environment

- Host = FreeBSD on ThinkPad T70 (51nb mod).
- User = `eturkes`; privilege escalation = passwordless `doas`; login shell = `/bin/tcsh`; Codex shell = `/usr/local/bin/bash`.
- Personal backup `~/doc/` requires explicit user inclusion before access.
- Before the first absolute-path call: expand `~` from active `$HOME` → resolve existing paths with `readlink -f` → derive home paths from that result.
- Unspecified stack → installed system tools.
- Post-task cleanup reaches task-touched paths outside the project too, `$HOME` above all.
- Use native, uncompressed, unrewritten shell/tool calls. `rg` = `/usr/local/bin/rg`; `grep` = FreeBSD BRE; `find` = FreeBSD. Clean output → `command grep`, `/usr/local/bin/rg`, `/usr/bin/find`.
- Recursive search = `rg <pat> <path>`; `-r` = replacement. Name dot-dirs explicitly; explicit file paths bypass hidden/ignore filtering; tree sweep → `--hidden`, including ignored paths → `-uu` (`--hidden --no-ignore`).
- `pgrep -f`/`pkill -f` → one bracketed pattern (`index[.]js`) to exclude the shell wrapper; kill + relaunch in separate calls.
- User terminals = `zmx` sessions; `zmx attach` inside a session switches its live client instead of nesting. Keep `zmx` use read-only (`list`, `get`, `history`, `print-env`); PTY probes → `script -q <log> /usr/local/bin/bash -c '<cmd>'`.
- Binary-contained text → `/usr/local/bin/rg -a -o '<pat>.{0,400}'`; widen context on either side for minified call sites.

## Machine maintenance

- Corruption = unresolved; related failures → `/var/log/corruption-events.md`. Append dated symptoms, evidence paths, checks/results, repair + validation. Preserve evidence before repair; separate observations/hypotheses + service recovery/root-cause resolution.
- Preserve accounts/keys + browser credentials. SSH = TCP `9993` + public keys; PF public ingress = host SSH + Caddy HTTP/HTTPS; VM SSH = LAN-only.
- System maintenance → inspect `zpool status -v` + `/var/log/{daily,weekly,monthly}.log`. Package updates → refresh signed indexes/audits + review exact transactions/reverse dependencies. Stage one host/guest at a time; verify SSH, Caddy/jail/VM + backend health between stages.
- Maintenance recovery → create task-scoped boot/jail/VM rollback points before relevant changes; retain them through post-change validation. Local ZFS snapshots share the pool.
- Home snapshots = `/usr/local/sbin/home-snapshot` via `/etc/cron.d/home-snapshot`; recover selected files from `~/.zfs/snapshot/`.
- ZFS repair → record errors, objects + retaining snapshots → repair verified targets → check readability/checksums → clear errors. Delete snapshots by exact full name; monitor validating scrub to completion.
- Firmware → match installed 51nb board/revision + verify image checksums; arrange console access, stable power + bootable recovery before flashing.
- Boot/mitigation/resource controls (`hw.mds_disable`, RACCT/RCTL) → arrange recovery access + measure workload impact before persistence; verify access, service health + tunables after controlled reboot.
