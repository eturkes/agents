# Route

Use in any phase. When a request needs another phase, the agent asks you to confirm a route and then follows this body. To ask for a route yourself, paste this body into the running session after your request. The session sets up the next phase and ends. Its final message names the body for the next session.

---

Route my request in this session to the phase it needs (`Session flow` Routing), then end the session. `.agent/spec.md` `Intent` outranks everything here; global + project `CLAUDE.md` law applies as written.

1. Confirm in one `AskUserQuestion`, unless I confirmed already or my request names the phase: target phase, scope + why it fits, staying in the current phase as the other option. Add where it applies: each open scope the route reworks → suspend intact or retire (`.agent/archive/` + `.agent/deferred.md` rows); every other open scope is suspended without a question. A conflict between my request and `Intent` → ask me to edit `Intent` first.
2. State this body's `Met when` as the session's finish line and write it as a `- [ ] ROUTE: …` row at the head of `Tasks`, where compaction keeps it.
3. Close the open work: each running teammate reaches its marker, then gets harvested per global `Subagents` and stopped, its worktree committed on its branch, unmerged; processes you started → stopped by PID; checked, cohesive work → scoped commits with the gates its unit requires; the rest → one commit on a new `wip/<topic>` branch (gitignored secrets stay out), then back to the branch you left; rulings that bind later work → their owning files.
4. `.agent/spec.md` → the routed state (`Session flow`): the request = my words, or the routed `.agent/deferred.md` row moved out of the queue; one `Suspended:` line per scope kept, its in-flight `Tasks` row naming its `wip/` and worktree branches; retired scopes leave per step 1.
5. Delete the `ROUTE` row and commit on a clean working tree. The final message names the body to paste next — `auto/<phase>.md`, or `steered/<phase>.md` for added steering — and its launch settings (`~/.local/app/agents/claude/prompts/README.md`).

Met when: `Phase` holds the target, its scope + the request; every scope the route left is suspended with its `Tasks` rows intact, or retired where I ruled so; no teammate or started process runs; and the route is committed on a clean working tree without its `ROUTE` row.
