# Maintain

When `Phase` is `MAINTAIN`, use this body. Start a fresh session at the project root. Replace `<request>` with your request, or `<rows>` with `.agent/deferred.md` row names. Paste one body: the text between its two rules. To work every row, use `auto/maintain.md`.

## Request

---

<request>

Scope = the implementation; `.agent/spec.md` `Intent` + `Decisions` bind; global + project `CLAUDE.md` law applies as written. Decide, execute; ask me whenever direction is unclear. Units on the shortest path, planned in `Tasks`, contract + tests per tier, gate green at every scoped commit; `Artifacts`/`Decisions`/`Tasks`, `.claude/rules/` + README move with the change.

Met when: the request is delivered end to end, the full gate command passes on a clean working tree at the closing commit, and the final message states what changed, the gate result with its skipped, not-run + missing checks named or `none`, each teammate by name + role + verdict (or `none`), each advisor call with your ruling (or `none`), what you could not confirm, the `git status` result, and the closing commit SHA.

---

## Queue

---

<rows>

Work the `.agent/deferred.md` rows named above in rank order until none remains that you can fund. A row's text + acceptance check = its contract; a row lacking one → write it yourself, then fund the row. One unit + one scoped commit per row, gate green at every commit, the row pruned in its closing commit. A row that needs me (a live run, hardware, a ruling) → finish every agent-fundable part, record my part as owed (unsimulated, unclaimed), move on; a row stating a re-open condition waits for its trigger. A row closes on its own acceptance check alone; one too big for its check stays open with what it owes. New finds → new rows with acceptance checks, funded after the named ones. Collect what you need from me into one `AskUserQuestion` once the agent-side work is done, then fund what my answers unblock; whatever needs me after it stays owed. Ask mid-run only where proceeding would waste a unit or risk harm. `.agent/spec.md` `Intent` + `Decisions` bind; global + project `CLAUDE.md` law applies as written.

Met when: every row in scope is closed by its acceptance check in its own commit, recorded as blocked on me with what it still owes, or waiting on its unmet re-open trigger, the full gate command passes on a clean working tree at the closing commit, and the final message lists per row its commit SHA, what it owes or its waiting trigger, the rows added, the gate result with its skipped, not-run + missing checks named or `none`, each teammate by name + role + verdict (or `none`), each advisor call with your ruling (or `none`), what you could not confirm, the `git status` result, and the closing commit SHA.

---

## Security review

---

<request>

My request above outranks the rest of this body; `Intent` outranks both — a conflict → ask me. Security review of the implementation: threat surface from `.agent/spec.md` `Intent` + `Artifacts`; run the committed scanners (a stack with none earns a finding), then a manual pass over remotely reachable code (input handling, auth, secrets, dependencies, supply chain) on a check set fixed before reading; each finding carries severity, `file:line`, and a red test or repro; every finding above informational is fixed, the rest → `.agent/deferred.md` with an acceptance check. Gate green at every scoped commit. You run this body alone: security vocabulary ends a teammate's context (global `CLAUDE.md` `Subagents`).

Met when: the final message lists the check set with a verdict per row, every fix has a green acceptance check, the full gate command passes on a clean working tree, the gate's skipped, not-run + missing checks are named or `none`, each advisor call carries your ruling (or `none`), what you could not confirm is named, the `git status` result is given, and the closing commit SHA is given.

---

## Dependency upgrade

---

<request>

My request above outranks the rest of this body; `Intent` outranks both — a conflict → ask me. Upgrade every dependency + toolchain pin to its latest release: list current vs latest per entry yourself; each major bump → its changelog's breaking changes against our call sites; adapt code, refresh lockfiles, rerun the full gate with scanners; a dependency held back earns a `.agent/deferred.md` row naming the blocker.

Met when: every dependency is at its latest release or holds a `.agent/deferred.md` row, the full gate command passes on a clean working tree, and the final message lists bumped versions, held-back rows, the gate result with its skipped, not-run + missing checks named or `none`, each teammate by name + role + verdict (or `none`), each advisor call with your ruling (or `none`), what you could not confirm, the `git status` result, and the closing commit SHA.

---
