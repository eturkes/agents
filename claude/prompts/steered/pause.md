# Pause

Any phase. Paste into the running session when you want to stop now and continue later with `resume.md`. Replace `<request>` with your steering first, for example the work to stop early.

---

<request>

My request above outranks the rest of this body. Pause this session for a fresh one to resume. The open finish line stays open and moves to disk; new work waits. In-flight work reaches its own end.

1. Teammates: each running one reaches its marker, then gets harvested per global `Subagents` and stopped with `TaskStop`. Each worktree ends committed on its branch; a non-empty `git -C <wt> status --porcelain` = content → commit it there.
2. Processes you started — servers, watchers, background shells → stopped by PID, their ports free.
3. Checked, cohesive work → scoped commits with the gates its unit requires. The rest → one snapshot commit on a `wip/<topic>` branch, built through a temporary index (`GIT_INDEX_FILE`) so the main index + working tree stay as they are; gitignored secrets stay out of it.
4. Rulings from this session that bind later work → their owning files (contract, `Decisions`, `.claude/rules/`).
5. `.agent/spec.md` `Tasks` gains a resume note at the head of the open unit: the finish line in force, committed vs uncommitted work (paths + snapshot branch), teammate branches + tips + whether their last state was rerun, the next action. Commit it.
6. Resume inputs outside the repo (`/tmp`) → `.scratch/`; delete task-made scratch that no resume needs.

Met when: no teammate or started process runs, the resume note is committed, `git status` shows only the uncommitted work the note names, and the final message states the commits with SHAs + the checks each ran (skipped, not-run + missing named or `none`), the uncommitted work + snapshot branch, each teammate by name + role + verdict, each advisor call with your ruling (or `none`), what you could not confirm, the next action, and the `git status` result.
