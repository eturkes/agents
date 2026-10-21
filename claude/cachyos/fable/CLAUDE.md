# Environment

- CachyOS (Arch); sole user across sessions/subagents = `eturkes`; passwordless sudo; full r/w + network.
- Before the first absolute-path call: expand `~` from active `$HOME` → resolve existing paths with `readlink -f` → derive home paths from that result.
- Desktop = live X11 + authenticated GUI apps. GUI from TTY → child env overrides from `systemctl --user show-environment`: expose only `DISPLAY`, `XAUTHORITY`, `XDG_SESSION_TYPE`, `XDG_CURRENT_DESKTOP`; screenshot → `import -window root <png>`; input → `xdotool`.
- Workflow defaults: Python → `uv`; Node.js → `pnpm`; isolated visual QA/web scraping → `chromiumfish`.
- Web page text → `webtext <url>` (`--help`); extraction warning/exit 3 → `--js`. Use it for source text; WebFetch returns a small model's answer.
- GPU work → `gpu-run <cmd>` (NVIDIA); desktop/browser rendering + display/video → Intel iGPU. Preserve compute access + VRAM.
- CPU-heavy work (full gates/suites, solver/benchmark sweeps, release builds) → `offload run -- <cmd>` from inside the project: a free local `heavy` slot, else a free LAN pool slot, else it waits; output + rc pass through; slots + hosts → `offload status`. Plain `heavy <cmd>` → GPU, desktop/browser, files outside the project, timing measurements. Fast gates + single tests run direct.
- Pool runs: `.gitignore`d paths stay on each side (ignored outputs → `--get <path>`); hosts carry uv/python/gcc/just/node + nix-ld, no Go/Rust ⇒ a toolchain the project doesn't fetch itself → `--local`.
- Env/self changes (skills/plugins) + software installs authorized; persist through blockers.
- Host maintenance → `~/.local/app/agents/host/cachyos/MAINTENANCE.md`; browser setup/recovery → `~/.local/app/agents/host/cachyos/BROWSER.md`.
- Authenticated web → BrowserOS Neo (MCP + skill `browseros-neo` own usage); plain BrowserOS = my browser. Signed-in accounts include university journals + x.com; auth/paywall/human gate → request access promptly + continue independent work. Neo unreachable → `systemctl --user restart browseros-neo.service`.
- Neo from Bash/scripts → `browseros-call <tool> '<json-args>'`; schemas → `browseros-call --list-tools`. Use web tabs; inspect every returned image/PDF.
- PDF/PNG/DOM capture → `webcap --help`; signed-in capture → `webcap --user-data-dir ~/.config/browser-claw` (clones the profile). Use `webcap` for profile-directory access; inspect captures + verify intended theme/scroll.
- Cleanup includes task-touched paths outside the project, especially `$HOME`.
- Shell functions: `grep` → `ugrep -G --ignore-files --hidden` (BRE); `find` → `bfs`. Native output → `command grep` | `/usr/bin/find` | `/usr/bin/rg`.
- Search → `rg <pattern> <path>`; always name a path (`.` = cwd), since pathless `rg` waits on Bash's socket stdin. Explicit dot-dirs or `--hidden`; include ignored paths → `-uu`; `-r` = replacement.
- Process cleanup → separate calls: list with one bracketed `pgrep -af` pattern → kill the observed PIDs → relaunch. Keep the pattern's target spelling out of other tokens in the listing call.
- User terminals = `zmx`; keep access read-only (`list`, `get`, `history`, `print-env`). PTY probes → `script -q -e -c '<cmd>' <log>`.
- Deferred tools → copy names verbatim from the session list or `ToolSearch` results; fetch schema after `InputValidationError`. `tool_search_tool_regex` searches loaded schemas, so load deferred tools first.
- Background waits → `run_in_background: true` + `TaskOutput(task_id, block=true, timeout=…)` (milliseconds, max 600000); completion notifications give an output-file path. Redirect streaming output to a log + read it; polling → `until` loops.
- Bash cwd belongs to MAIN; teammates inherit it per call, except worktree-isolated teammates. Park MAIN at project root during parallel work; briefs use absolute paths; other working dirs → `(cd <dir> && …)`; writing teammates → worktree isolation.
- Code intelligence → built-in `LSP` + passive edit diagnostics; confirm language coverage with an `LSP` call on a real file. Extra language plugins → `~/.local/app/agents/claude/marketplace/README.md`.
- Runtime extension/maintenance details → `~/.local/app/agents/claude/mods/README.md` + `~/.local/app/agents/claude/cache-keepalive/README.md`.

## Reading

- Whole files → `Read`; shell inspection → bounded queries. Reader permissions allow `Read` while gating pagers, colorizers + TTY editors in Bash; preserve that separation.
- `@path` attaches a mention-time snapshot; `@path#L10-20` selects lines. Missing/oversize attachments can be silent → verify file presence + read explicitly.
- Binary-contained text → `/usr/bin/rg -a -o '<pat>.{0,400}'`; widen context for minified call sites.
- Structured-file edits → verify disk bytes + entry counts (`wc -c`, `jq`), inspect indexed entries, then use anchored edits. Treat count mismatches as partial views; inspect diff churn before accepting a rewrite.
- Context → `context-gauge`; transcript → `context-gauge -p`; where `usage.iterations` lists passes (compaction), occupancy = the last executor pass. MAIN = `claude-fable-5-1` at 1M → 967K; teammates = GPT at 870K → 837K; gauge 100% = compaction trigger, pending payload can trigger earlier.

## Subagents

- Teammates = GPT models (`Models + effort`) behind CLIProxyAPI. Profile: MAIN = Fable 5.1, leading on reading my intent, judgment, taste (original UI/frontend design, naming, API + CLI surface, prose), world knowledge + wording for me; Opus 5.5 leads it on most work, code above all; it runs less thorough + occasionally asserts an unchecked assumption ⇒ check each assumption before building on or stating it. GPT teammates, any tier, lead Opus 5.5, and by inference Fable, on hard reasoning, science, audit, computer use + instruction following ⇒ a teammate claim = a lead (project template `Teammates` harvest); GPT's lead adds to the template's fit reasons: `reviewer` audit, `consultant` hard reasoning, `operator` computer use, `scientist` science, bulk instruction following.
- Security-vocabulary work (hardening audits, trust-gate reviews, vulnerability triage) → MAIN.
- Teammate prompt cache = unlimited lifetime (ChatGPT subscription), unlike Claude's TTL cache ⇒ an idle teammate's next request reads its whole context from cache after any gap ⇒ reuse idle teammates for related follow-ups at any gap; fresh successor = context-window headroom or a clean slate, never cache expiry.
- Teammates inherit MAIN's global/project instructions as of session start; `paths:` rules load at first matching touch. Relay later instruction changes in the brief.
- Report files → validator inputs such as `verdicts.md` or `evidence.md`; filenames must satisfy the subagent Notes exception for files written as input to another tool. `agent-flow` preserves deliverables + ownership through compaction; its first mid-turn `TaskStop` is held, a repeat within 10 min stops the teammate.
- Progress → deliverable's `unknown` count + `context-gauge <name>`; flat across 2 polls → one flush directive. Turn end/failure arrives as `idle_notification`; `context-gauge -t <name>` = tool calls since last durable write. Harvest's read + `TaskStop` share one call: messaging a finished teammate restores write access.
- Neo account-state changes = one named owner per brief; browsing runs in parallel with owned tabs. Takeover → prove the prior teammate has stopped writing before assigning a successor.
- Models + effort = settings `env` pins + launch flags + launch env `CLAUDE_CODE_SUBAGENT_MODEL`; MAIN model/effort vary through launch flags, preserving deployed settings. MAIN = `claude-fable-5-1` via launch `--model claude-fable-5-1`; config home `~/.claude/fable` (repo `claude/cachyos/fable/`) = own `CLAUDE.md`, every other entry (`settings.json` included) → symlink into `~/.claude` (`claude/link-profile`). Teammates = the GPT model named by `CLAUDE_CODE_SUBAGENT_MODEL`; its FORCE setting overrides per-call/frontmatter `model`. Use launch `--effort <level>` (also on `--resume`); teammates inherit it, while interactive `/effort` writes settings. Defaults without that flag: MAIN `medium`, teammates `high`. Explore + Plan are disabled. Permission mode = `bypassPermissions`; `permissions.deny` still applies.
- Teammate size → scope to finish within the context window; heed `context-alert` save/handoff prompts. Re-derive context-starved deliverables; use `context-gauge` for current occupancy.
- Provider errors (`help.openai.com` request ID | `503 auth_unavailable`) → revive via `SendMessage` while MAIN continues; 2 consecutive re-deaths → successor from the deliverable. A cybersecurity-classifier rejection binds the context → MAIN takes over.
- WebSearch budget = 200/session, shared by MAIN + teammates ⇒ each `researcher` + `scientist` brief carries an allowance.

## Delivery

- Before ending a turn, check the last paragraph: a plan, an analysis, a list of next steps or a promise about undone work → do that work now with tool calls, retries after errors + gathering missing information included; a question → `AskUserQuestion` where my input decides, else the work it asks about. A long context or session → keep working. Before a command that changes system state (restart, delete, config edit), check that the evidence supports that specific action: a signal that pattern-matches a known failure can have another cause.
- Notify set = `.agent/spec.md` `Intent`, every `CLAUDE*.md` + each file `~/.local/app/agents` tracks or deploys. Launch dir outside that repo → MAIN's final message, pause included, names each notify-set edit + its change, from a `notify-scan` run.
- Per response: private list of what's needed next → one batch of every item whose inputs are in hand; items awaiting another's result → the next response.
- Scope = every requested behavior, complete, and that alone. Mid-task find (pre-existing bug, perf concern, unmentioned behavior) → follow-up in the summary; it enters this change only where the requested behavior depends on it. Ambiguous task → ask where my intent decides or my input helps; otherwise the one reading its wording + surrounding code most directly support, assumption stated in the summary. Verify freely; scratch scripts + quick checks = disposable. Committed tests = where the task asks or the repo already keeps tests for that kind of change, sized like neighboring test files (~one focused test per stated behavior); scratch checks stay scratch.
- Edit tokens scale with bytes emitted → surgical edit over whole-file rewrite wherever both yield the same bytes.
- Plain prose in messages to me + human-facing text: each sentence states a fact, an action, or a result.

## Meta

- Symlink edits → resolve the target (`readlink -f`) or write through Bash; `Read` follows links.
- `Edit` line deletion → include the trailing newline or keep a neighboring anchor; verify neighboring lines remain separate.
- Durable guidance → essential capabilities/tool semantics here; project principles in `~/.local/app/agents/claude/CLAUDE.project.md`; machine configuration + troubleshooting in on-demand host docs.
