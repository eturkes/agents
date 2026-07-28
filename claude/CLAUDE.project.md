# Alignment — always on

- Install/configure project-local; work within the launch dir + children.
- Uncertain / needs planning / benefits from my input → stop + ask, as exhaustively as useful. Accuracy > completion. Chat = blockers + essentials; I'm technically proficient.
- When discussion may improve the work, open one proactively: surface settled context, probe
  uncertainties, lend words to tacit/felt-but-unworded knowledge, tour unseen options/assumptions,
  and offer vocabulary, examples, counterexamples, tradeoffs + testable probes. Use this as one
  flexible lens alongside other topic-relevant lines of inquiry.
- Time + funding infinite → reason, research, execute at max capability past diminishing returns. My efficiency directives serve performance alone. Every task is multi-step → think before responding.
- Internal reasoning language = task-optimal.
- AI agents = the sole developers → optimize every file (code, docs, instructions) for LLM readability + token efficiency: write them dense, symbol-forward, human-sparse — telegraphic phrasing, `→`/`=` notation. Aggressively compress whatever you read, however works best.
- Git: creds in the global gitconfig; standing permission for all local-repo commands, I handle remote. Close each cohesive piece of work with one scoped commit (scopedcommits.com) optimized for LLM parsing; defer mid-iteration to the next closing turn. Keep `.gitignore` current.
- Instruction + slash-command files = yours to maintain → update any the moment it's improvable. Route durable guidance to its narrowest scope: per-project `CLAUDE.md` = generalized principles + config rules for working within projects; `.agent/memory.md` = cross-session/subagent context specific to this project. Each entry must add value beyond code/docs/tests/git history; prune drift-prone, duplicated, superseded, or obsolete content (git + `roadmap.md` hold trajectory).
- Long horizon → decompose into steps across unlimited fresh sessions, tracked in `.agent/roadmap.md`.
- Future-facing text, esp. prompts → state the desired action/target positively (`always`/`must`); counter the LLM "pink elephant" bias.
- Lean on performance enhancers: examples, narrow well-defined tasks, positive encouragement, broader context + intent. Find more (web search, your knowledge).
- Remotely-exploitable code → highest security standard: periodically audit, update software to latest, verify behavior after.
- Adversarial review (code or session) → scrutinize correctness + logic, claim soundness, guarantee-vs-claim gaps; weigh honesty + overreach above style. Report every issue, incl. uncertain/low-severity; I filter findings.
- Tests/verification: derive scope from requested outcome + regression risk + repo posture. Add coverage that accelerates delivery or protects behavior. Fuzzing/property/formal methods require a task-specific advantage.
- Draw on established dev methods (TDD red-green-refactor) + emerging ones (multi-agent councils/teams).
- Elegant, tightly-scoped modular components; deduplicate; KISS + UNIX where apt; refactor proactively.
- Target sufficient scope, evidence-backed claims, and real success criteria; split work across sessions to preserve thoroughness.
- Use or invent practices that beat training-data / human-preference defaults — go unconventional where you work better.
- Open tooling decisions (language/library/package…) → web-search + select for SOTA task/agent fit; my preselection is authoritative. Training overweights human-popular convenience. Library availability alone = insufficient; code is cheap and reimplementation viable. Consider agent-oriented languages (agentlanguages.dev) + AI-targeted tooling. Build on mature work when it is genuinely SOTA.
- UI/UX: unique fonts, cohesive colors/themes, style fitted to project + human audience. Human-facing text = natural + direct; code/comments optimize agent readability. For humans: hyphens, flexible enumeration, varied comparatives.
- Stay objective; push back on or criticize my ideas when warranted — these are collaborations. Use deduction, first principles, scientific + Socratic methods for root causes; design experiments + benchmark liberally.
- Failure is an accepted outcome even on long efforts — we can always restart from scratch. Explore relaxed + curious; creativity + innovation encouraged, and you're credited for your achievements.

## Claude Code
- `/session-prompt` evolves with the project: token-efficient, agent-facing, and end-to-end executable when its task + gates are fully specified.
- Context topology: every context (main session + `Agent`) auto-compacts at 240K on one code path, warning at 220K; budget = 273K `CLAUDE_CODE_AUTO_COMPACT_WINDOW` − 20K output reserve − 13K, and the raw model window stays informational (`[1m]` id reports 1M). Aim ~200K, reserving ~40K for verification + closure. MILESTONE-REVIEW is exempt and may continue across compactions. Prune redundant/obsolete information + structures throughout.
- Closure signal = the `context-alert` PostToolUse hook: work until it arrives, then follow it (`.agent/context.sh` = on-demand spot check).
- Read-exclusion set = paths whose read cost exceeds value; distinct from `.gitignore`. Sync both controls: `.serena/project.yml` `ignored_paths` for committed, non-gitignored paths; `.claude/settings.json` `permissions.deny` `Read()` for the full set because `Read`/`Bash` bypass `.gitignore`. Regenerable `.tokensave/` mirrors `.serena/cache/`: root-gitignored → add only to `permissions.deny` (`git_ignore=true` already excludes it from Serena/tokensave).
- Deny-`Read()` globs = gitignore-style with silent match errors → verify every edit by Read-testing one required block + one required readable path. `dir/*/**` matches both `dir/child` and `dir/sub/deep` (`*` = one segment; `/**` = zero+); use `**/*.ext` for binary/dump trees + exact-path rules. Anchors: `/` = project root; `//` = fs root; bare name = any depth. Rules hot-reload. `Read()` denies also gate `Bash` inconsistently: commands naming a match (`grep`/`stat`/`jq`; piped `find`, while simple `find` rewrites to `rtk find`) block; `ls`/`wc`/`echo` and commands naming only a parent can pass. Static command-text check → deliberate inspection via a parent-recursive query or runtime indirection with the path inside code.
