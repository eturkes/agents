# Pause now

Use in any phase. When you want to stop right away and continue later, replace `<request>` with your steering. It can name work to let finish first. Then paste this body into the running session. In-flight work stops where it stands, and the repo stays consistent. To let in-flight work finish first, use `pause.md`. Continue later with `resume.md`.

---

<request>

My request above outranks the rest of this body. Pause this session now for a fresh one to resume. In-flight work stops where it stands; the repo ends consistent: the working branch holds checked commits alone, everything else sits on snapshot branches, and the resume note names it all. The open finish line stays open and moves to disk.

1. Teammates: each running one → `TaskStop` now, its marker unawaited → prove quiescence → each worktree's leftover changes → a commit on its `wt/<name>` branch, unmerged (`CLAUDE.md` `Teammates` worktree close). Deliverables stay as written, unharvested.
2. Processes you started — servers, watchers, background shells → stopped by PID, their ports free.
3. Your own work: work whose last gate run passed on its current bytes → scoped commits; anything edited since its last passing run, or never run → one snapshot commit on a `wip/<topic>` branch, built through a temporary index (`GIT_INDEX_FILE`) so the main index + working tree stay as they are; gitignored secrets stay out of it.
4. Rulings from this session that bind later work → their owning files (contract, `Decisions`, `.claude/rules/`).
5. `.agent/spec.md` `Tasks` gains the resume note: one `- [ ] RESUME: …` row at the head of the open unit, holding the finish line in force, committed vs uncommitted work (paths + snapshot branch), each teammate's branch + tip marked unharvested + unverified, the next action. Commit it.
6. Resume inputs outside the repo (`/tmp`) → `.scratch/`; delete task-made scratch that no resume needs.

Met when: no teammate or started process runs, the resume note is committed, and `git status` shows only the uncommitted work the note names.
