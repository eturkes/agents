# Maintain

`Phase: MAINTAIN`. Fresh session at the project root, launched with `--effort xhigh`; paste one body (everything between its rules). The first body takes my request in place of `<request>`.

## Request

---

<request>

Scope = the implementation; `.agent/spec.md` `Intent` + `Decisions` bind; global + project `CLAUDE.md` law applies as written. Decide, execute; ask me whenever direction is unclear. Units on the shortest path, planned in `Tasks`, contract + tests per tier, gate green at every scoped commit; `Artifacts`/`Decisions`/`Tasks`, `.claude/rules/` + README move with the change. A committed `kernel` contract funds `tester`; `reviewer` takes each `kernel` diff before its commit and the closing diff on every lens.

Met when: the request is delivered end to end, the full gate command passes on a clean working tree at the closing commit, and the final message states what changed, the gate result with its skipped, not-run + missing checks named or `none`, each teammate by name + role + verdict, what you could not confirm, and the closing commit SHA.

---

## Security review

---

Security review of the implementation: threat surface from `.agent/spec.md` `Intent` + `Artifacts`; run the committed scanners, then a manual pass over remotely reachable code (input handling, auth, secrets, dependencies, supply chain) on a check set fixed before reading; each finding carries severity, `file:line`, and a red test or repro; every finding above informational is fixed, the rest → `.agent/deferred.md` with an acceptance check. Gate green at every scoped commit. You run this body alone: security vocabulary ends a teammate's context (global `CLAUDE.md` `Subagents`).

Met when: the final message lists the check set with a verdict per row, every fix has a green acceptance check, the full gate command passes on a clean working tree, the gate's skipped, not-run + missing checks are named or `none`, what you could not confirm is named, and the closing commit SHA is given.

---

## Dependency upgrade

---

Upgrade every dependency + toolchain pin to its latest release: list current vs latest per entry yourself; `researcher` per major bump returns its changelog's breaking changes against our call sites; adapt code, refresh lockfiles, rerun the full gate with scanners; `reviewer` takes the closing diff; a dependency held back earns a `.agent/deferred.md` row naming the blocker.

Met when: every dependency is at its latest release or holds a `.agent/deferred.md` row, the full gate command passes on a clean working tree, and the final message lists bumped versions, held-back rows, the gate result with its skipped, not-run + missing checks named or `none`, each teammate by name + role + verdict, what you could not confirm, and the closing commit SHA.

---
