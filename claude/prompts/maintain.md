# Maintain

`Phase: MAINTAIN`. Fresh session at the project root; type `/goal `, paste one body (everything between its rules), Enter. The first body takes my request in place of `<request>`.

## Request

---

<request>

Scope = the implementation; `.agent/spec.md` `Intent` + `Decisions` bind; global + project `CLAUDE.md` law applies as written. Orient, decide, execute; ask me whenever direction is unclear. Units on the shortest path, contract + tests per tier, gate green at every scoped commit; `Artifacts`/`Decisions`/`Deferred`, `.claude/rules/` + README move with the change.

Met when: the request is delivered end to end, the full gate command passes on a clean working tree at the closing commit, and the final message states what changed, the gate result, and the closing commit SHA.

---

## Security review

---

Security review of the implementation: threat surface from `.agent/spec.md` `Intent` + `Artifacts`; run the committed scanners, then a manual pass over remotely reachable code (input handling, auth, secrets, dependencies, supply chain) on a check set fixed before reading; each finding carries severity, `file:line`, and a red test or repro; every finding above informational is fixed, the rest → `Deferred` with an acceptance check. Gate green at every scoped commit.

Met when: the final message lists the check set with a verdict per row, every fix has a green acceptance check, the full gate command passes on a clean working tree, and the closing commit SHA is stated.

---

## Dependency upgrade

---

Upgrade every dependency + toolchain pin to its latest release: read changelogs on major bumps, adapt code, refresh lockfiles, rerun the full gate with scanners; a dependency held back earns a `Deferred` row naming the blocker.

Met when: every dependency is at its latest release or holds a `Deferred` row, the full gate command passes on a clean working tree, and the final message lists bumped versions, held-back rows, the gate result, and the closing commit SHA.

---
