# Resume

Use in any phase. Start a fresh session at the project root. Paste everything below the rule.

---

Resume this repo's open work. `.agent/spec.md` `Intent` outranks everything here; global + project `CLAUDE.md` law applies as written, `Session flow` first.

1. Rebuild the state from disk before acting: `Phase` (phase + scope), `Tasks` (open rows + any resume note), `git log` since the last phase or pause commit, `git status`, `git stash list`, `git worktree list` + branches (`wt/*`, `wip/*`), `.scratch/` rosters + checklists. A missing or stale resume note → the newest prior transcript of this repo (`ls -t ~/.claude/projects/"$(pwd | tr /. --)"/*.jsonl`, skipping `$CLAUDE_CODE_SESSION_ID`), read through bounded `jq` queries: its pasted body + `Met when`, its last instruction, its last assistant text.
2. Finish line = the interrupted body's `Met when` while it still applies, else the open phase's close per `Session flow`; ask when neither fits, open work absent included. State it in your first message and write it into the resume note, where compaction keeps it.
3. Carried work — uncommitted changes, teammate + snapshot branches, claims in notes — earns trust once you rerun the checks that grade it; build on it after they pass.
4. Continue by phase:
   - PROTOTYPE, IMPLEMENT, MAINTAIN → the open `Tasks` units in order, under the body that opened the work (its copy in a prior transcript, else `~/.local/app/agents/claude/prompts/auto/<phase>.md`), until the finish line holds.
   - ITERATE → run every prototype entry in `Artifacts`, report what changed since the last session + what needs my call, then work my feedback; the phase advances on my go alone.
5. Map each template structure — in this prompt and in the body you resume under — onto what this repo runs: `Artifacts`, the gate command + ledgers its `.claude/rules/` name; a structure a rule retired, or one the repo never had, stays out.
6. `cmp CLAUDE.md ~/.local/app/agents/claude/CLAUDE.project.md` differs → name the drift in your first message; `refresh.md` closes it in a session of its own.

Met when: the finish line from your first message holds on a clean working tree at the closing commit, the resume note is current or gone, and the final message states that finish line, each unit landed with its SHA, the gate result with its skipped, not-run + missing checks named or `none`, each teammate by name + role + verdict, each advisor call with your ruling (or `none`), what you could not confirm, the `git status` result, and the closing commit SHA.
