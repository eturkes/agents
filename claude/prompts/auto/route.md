# Route

Use: any phase. The agent follows this body when a request needs another phase; to route yourself, paste it into the running session after your request. Next session = the body the final message names.

---

Route my request in this session to the phase it needs (`Session flow` Routing), then end the session. `.agent/spec.md` `Intent` outranks everything here; global + project `CLAUDE.md` law applies as written.

1. Ask in one `AskUserQuestion`, each item where it applies: the route — target phase, scope + why it fits, staying in the current phase as the other option — unless I confirmed it or named the phase; suspend intact or retire (`.agent/archive/` + `.agent/deferred.md` rows) per open scope the route reworks. Other open scopes stay suspended intact. A conflict between my request and `Intent` → ask which holds; update `Intent` to match.
2. State this body's `Met when` as the session's finish line and write it as a `- [ ] ROUTE: …` row at the head of `Tasks`, where compaction keeps it.
3. Close the open work: each running teammate → its marker, then harvested per `CLAUDE.md` `Teammates` + stopped, its worktree committed on its branch, unmerged; processes you started → stopped by PID; checked, cohesive work → scoped commits with the gates its unit requires; the rest → one commit on a new `wip/<topic>` branch (gitignored secrets stay out), then back on the branch you left; rulings that bind later work → their owning files.
4. `.agent/spec.md` → the routed state (`Session flow`): request = my words, or the routed `.agent/deferred.md` row moved out of the queue; each in-flight `Tasks` row names its `wip/` + worktree branches; retired scopes leave per step 1.
5. Delete the `ROUTE` row; commit. Final message = the body to paste next (`auto/<phase>.md`; `steered/<phase>.md` for added steering).

Met when: `Phase` holds the target, its scope + the request; every scope the route left with open `Tasks` rows is suspended with those rows intact, or retired where I ruled so; every teammate + started process is stopped; the route is committed on a clean working tree, its `ROUTE` row gone.
