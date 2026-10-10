# Resume

Use in any phase. Start a fresh session at the project root. Replace `<request>` with the next work and its end point. Paste everything below the rule.

---

<request>

Resume this repo with the work my request above names. My request outranks the rest of this body; `.agent/spec.md` `Intent` outranks both — a conflict → ask me; global + project `CLAUDE.md` law applies as written, `Session flow` first.

1. Rebuild the state from disk before acting: `Phase` (phase + scope), `Tasks` (open rows + any resume note), `git log` since the last phase or pause commit, `git status`, `git stash list`, `git worktree list` + branches (`wt/*`, `wip/*`), `.scratch/` rosters + checklists. A missing or stale resume note → the newest prior transcript of this repo (`ls -t ~/.claude/projects/"$(pwd | tr /. --)"/*.jsonl`, skipping `$CLAUDE_CODE_SESSION_ID`), read through bounded `jq` queries: its pasted body + `Met when`, its last instruction, its last assistant text.
2. Finish line = the end point my request names. State it in your first message and write it into the resume note (the `- [ ] RESUME: …` row at the head of the open unit; create it where absent), where compaction keeps it.
3. Carried work — uncommitted changes, teammate + snapshot branches, claims in notes — earns trust once you rerun the checks that grade it; build on it after they pass.
4. Do the requested work until the finish line holds, under the law of the body that opened the open work (its copy in a prior transcript, else `~/.local/app/agents/claude/prompts/auto/<phase>.md`).
5. Map each template structure — in this prompt and in the body you resume under — onto what this repo runs: `Artifacts`, the gate command + ledgers its `.claude/rules/` name; a structure a rule retired, or one the repo never had, stays out.
6. `cmp CLAUDE.md ~/.local/app/agents/claude/CLAUDE.project.md` differs → name the drift in your first message; `refresh.md` closes it in a session of its own.

Met when: the finish line from your first message holds on a clean working tree at the closing commit, and the resume note is gone.
