# Maintain

`Phase: MAINTAIN`. Fresh session at the project root; type `/goal `, paste one body (everything between its rules), Enter. The first body takes my request in place of `<request>`.

## Request

---

<request>

Scope = the implementation; `.agent/spec.md` `Intent` + `Decisions` bind; global + project `CLAUDE.md` law applies as written. Orient by dispatch: your first `Agent` call precedes your first survey `Read` — unfamiliar surface funds `map`, an open question `res`, a written contract `test`, the closing diff `rev`, in parallel. Decide, execute; ask me whenever direction is unclear. Units on the shortest path, contract + tests per tier, gate green at every scoped commit; `Artifacts`/`Decisions`/`Deferred`, `.claude/rules/` + README move with the change. Every unit opens by naming its dispatch — roles + scope, or the licence it runs solo under — and closes with that line in its commit body.

Met when: the request is delivered end to end, the full gate command passes on a clean working tree at the closing commit, and the final message states what changed, the gate result, ≥1 teammate, each by name + role + harvest verdict, the licence for each unit you ran solo, the dispatch line per unit, and the closing commit SHA.

---

## Security review

---

Security review of the implementation: threat surface from `.agent/spec.md` `Intent` + `Artifacts`; run the committed scanners, then a manual pass over remotely reachable code (input handling, auth, secrets, dependencies, supply chain) on a check set fixed before reading; each finding carries severity, `file:line`, and a red test or repro; every finding above informational is fixed, the rest → `.agent/deferred.md` with an acceptance check. Gate green at every scoped commit. This body runs MAIN-side whole: security vocabulary kills a teammate's request (global `CLAUDE.md` `Subagents`).

Met when: the final message lists the check set with a verdict per row, every fix has a green acceptance check, the full gate command passes on a clean working tree, and the closing commit SHA is stated.

---

## Dependency upgrade

---

Upgrade every dependency + toolchain pin to its latest release: dispatch `map` over the dependency + toolchain surface to return current vs latest per entry, `res` per major bump to return its changelog's breaking changes against our call sites, and `rev` on the closing diff; adapt code, refresh lockfiles, rerun the full gate with scanners; a dependency held back earns a `.agent/deferred.md` row naming the blocker.

Met when: every dependency is at its latest release or holds a `.agent/deferred.md` row, the full gate command passes on a clean working tree, and the final message lists bumped versions, held-back rows, the gate result, ≥1 teammate, each by name + role + harvest verdict, the dispatch line per unit, and the closing commit SHA.

---
