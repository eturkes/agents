# Implement

My go after ITERATE. Fresh session at the project root; type `/goal `, paste everything below the rule, Enter.

---

Implement the intended software; set `.agent/spec.md` `Phase: IMPLEMENT` first. `Intent` outranks everything here, `Decisions` bind, `prototype/` = behavioral reference (UX, outputs, aesthetics) and nothing more. Global + project `CLAUDE.md` law applies as written, `Session flow` IMPLEMENT first.

1. Stack: web-search current options; select for task + agent fit + SOTA over popularity; my preselection wins. One `AskUserQuestion` for the stack + every spec gap before files that encode them; ask again whenever direction is unclear.
2. Skeleton: package metadata (project name + `LICENSE` identifier), entry point, one passing test, every gate wired — format, lint, type-check, test + the scanners below — behind one gate command whose invocation + result land in `.claude/rules/<topic>.md`.
3. Security scanning, automated + committed: dependency vulnerability audit, secret scan, static analysis for the stack, in the gate command and in CI (`.github/workflows/` or the host's equivalent), plus update automation (Dependabot/Renovate) where the host supports it.
4. Units = the shortest path to the consumable artifact, each with its tier (`kernel` full battery, `data` validator + spot-check, `docs` consistency) and a contract of testable predicates before code; teammates per the project `CLAUDE.md` portfolio where they pay. Gates green at every commit; one scoped commit per unit.
5. Review: adversarial pass over the whole diff on declared lenses (correctness/spec, claim soundness, guarantee-vs-claim gaps, `CLAUDE.md` conformance) with a check set fixed before reading; every row adjudicated in `.agent/review.md` (committed as rows close); accepted fixes land before close.
6. README in the human-facing register: install, run, configure. Retire `prototype/`: `git tag prototype` then `git rm -r prototype/`, or move a still-useful aid under `tools/` and record it in `Artifacts`.
7. `.agent/spec.md`: `Artifacts` = the implementation's entry points + run commands, `Decisions` + `Deferred` current, `Phase: MAINTAIN`.

Met when: the full gate command (scanners included) passes on a clean working tree at the closing commit, CI + scanning + update automation are committed, every `Decisions` entry is implemented or moved to `Deferred` with its reason, `.agent/review.md` holds no open row, `prototype/` is retired, `Phase: MAINTAIN` is committed, and the final message states the gate command + result, the CI/scanner file paths, the `git status` result, and the closing commit SHA.
