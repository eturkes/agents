# Project init

Paste at the project root, in a fresh Claude Code session.

Stand this repo up for the agent workflow. `.agent/initial-prompt.md` carries the project intent and outranks anything here; the directory name gives the project name. Global + project `CLAUDE.md` rules already apply — follow them rather than re-deriving them.

1. Read `.agent/initial-prompt.md`, `CLAUDE.md`, and `CLAUDE.local.md` if present. Confirm the starting set: `CLAUDE.md`, three commands in `.claude/commands/`, `LICENSE`, `.agent/initial-prompt.md`, plus any file the intent names. Absent intent file → stop and ask.
2. Tooling: web-search current options, select for task + agent fit over popularity, and take one decision from me before writing any file that encodes it — unless the intent already names the stack, which is my preselection and wins outright.
3. `.agent/roadmap.md` = the goal restated from the intent + the first milestone marked UNPLANNED, naming `.agent/initial-prompt.md` as its scope seed. `.agent/memory.md` = the tooling decision + gate commands. `.agent/polish.md` = empty. All three attach to every session → keep them minimal.
4. `.gitignore` = the stack's caches, build output, local databases, `.scratch/`, `.claude/settings.local.json`, and `CLAUDE.local.md` when present.
5. Read-exclusion set → `.claude/settings.json` `permissions.deny` + `.serena/project.yml` `ignored_paths`, synced per the `CLAUDE.md` rule. Seed it with `.serena/cache/` and the stack's regenerable caches; it grows as the tree does.
6. Serena: `activate_project <abs path>`; set `.serena/project.yml` `language_servers:` = the chosen languages + the formats you edit. Commit `.serena/`.
7. Minimum runnable skeleton: package metadata carrying the project name and the `LICENSE` identifier, one entry point, one test that proves the harness runs, and every gate command wired. Run each gate once; record its exact invocation + result in `.agent/memory.md`. Features belong to milestones, not here.
8. `git init` if the repo is new, then one scoped commit.

Then stop. `/session-roadmap` plans the first milestone from this state.

Report: files created, the tooling decision, gate commands + results, and every fact left undetermined.
