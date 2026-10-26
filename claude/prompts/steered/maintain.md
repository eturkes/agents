# Maintain

Use: `Phase` = `MAINTAIN`. Fresh session at the project root; `<request>` → your request (`Code review`: a bug report or a review scope), or `<rows>` → `.agent/deferred.md` row names → paste one body = the text between its two rules. Every row → `auto/maintain.md`.

## Request

---

<request>

Finish line = my request addressed: the work it names, else this body's whole work under its steering. State it in your first message; stop once it holds — finds past it → `.agent/deferred.md` rows. Scope = the implementation; `.agent/spec.md` `Intent` + `Decisions` bind; global + project `CLAUDE.md` law applies as written. A request needing a session or more of another phase → route it (`Session flow` Routing). Decide, execute; ask me whenever direction is unclear. Units on the shortest path, planned in `Tasks`, contract + tests per tier, gate green at every scoped commit; `Artifacts`/`Decisions`/`Tasks`, `.claude/rules/` + README move with the change.

Met when: the request is delivered end to end, and the full gate command passes on a clean working tree at the closing commit — or its route is committed (`route.md` `Met when`).

---

## Queue

---

<rows>

Finish line = my request addressed: the work it names, else this body's whole work under its steering. State it in your first message; stop once it holds — finds past it → `.agent/deferred.md` rows. Work the `.agent/deferred.md` rows named above in rank order until none remains that you can fund. A row's text + acceptance check = its contract; a row lacking one → write it yourself, then fund the row. One unit + one scoped commit per row, gate green at every commit, the row pruned in its closing commit. A row that needs me (a live run, hardware, a ruling) → finish every agent-fundable part, record my part as owed (unsimulated, unclaimed), move on; a row stating a re-open condition waits for its trigger. A row closes on its own acceptance check alone; one too big for its check stays open with what it owes. Collect what you need from me into one `AskUserQuestion` once the agent-side work is done, then fund what my answers unblock; finds needing me after it → one closing `AskUserQuestion` (approve or leave, per find), then fund what it approves; whatever needs me after that stays owed. A row needing a session or more of another phase (`Session flow` Routing) joins that question: routed (`route.md`) after every other row, or funded here. Ask mid-run only where proceeding would waste a unit or risk harm. `.agent/spec.md` `Intent` + `Decisions` bind; global + project `CLAUDE.md` law applies as written.

Met when: every named row is closed by its acceptance check in its own commit, recorded as blocked on me with what it still owes, waiting on its unmet re-open trigger, or routed (`route.md` `Met when`), and the full gate command passes on a clean working tree at the closing commit.

---

## Code review

---

<request>

My request above outranks the rest of this body; `Intent` outranks both — a conflict → ask me. Finish line = my request addressed: the work it names, else this body's whole work under its steering. State it in your first message; stop once it holds — finds past it → `.agent/deferred.md` rows. A bug report above → a red test reproducing it first, then the root-cause fix + defect-class sweep below; the review below then covers the finished fix's diff. Code review of the implementation — code, tests, gates, config + docs — with every finding fixed. Check set fixed + committed to `.agent/review.md` before the first read; rows = lens × module, `CLAUDE.md` conformance = lens × clause. Lenses: baseline = the full gate + each runnable `Artifacts` entry driven by its run command, a red step or failed run = a finding; `Engineering` code diff lenses (Correctness, Cleanup, Altitude), each function read with its callers + callees; claim soundness + guarantee-vs-claim gaps (README, `--help`, comments + `Artifacts` vs behavior); verification integrity (`Engineering`); spec fit (behavior vs `Intent` + `Decisions`); `CLAUDE.md` conformance = each clause of every repo `CLAUDE.md` + `.claude/rules/` file that binds a tracked file — a clause a tool can decide → its gate check runs + fires on a planted bad input, none → a finding fixed by wiring the check (`Engineering`). Verdicts committed as rows close. Finding = severity + `file:line` + proof: a red test (behavior) or anchor bytes `rg -Fn` matches (text). Fix at the root cause, then sweep the implementation for the defect class + fix every instance: one scoped commit per class, gate green at each. Law vs code mismatch → fix the stale side: code, or repo law in its `.claude/rules/` file; a template clause this repo departs from → a keyed `.claude/rules/` ruling (`Session flow`); a flaw in the template clause itself → name it to me. A fix changing `Intent`, `Decisions` or a grading check → my ruling first. Security stays with the `Security review` body; a security defect met on another lens = a finding you work alone (global `CLAUDE.md` `Subagents`). Register entries → `.agent/deferred.md` rows with acceptance checks. Collect what you need from me into one `AskUserQuestion` once the agent-side work is done, then fix what my answers unblock; finds needing me after it → one closing `AskUserQuestion` (approve or leave, per find), then fix what it approves; whatever needs me after that stays owed as a `.agent/deferred.md` row. A fix needing a session or more of another phase (`Session flow` Routing) joins that question: routed (`route.md`) after every other fix, or funded here. Ask mid-run only where proceeding would waste a unit or risk harm. `.agent/spec.md` `Intent` + `Decisions` bind; global + project `CLAUDE.md` law applies as written.

Met when: your finish line holds — for the work it covers, every check-set row in `.agent/review.md` carries a verdict, every finding is fixed with a green acceptance check, blocked on me as a `.agent/deferred.md` row, or routed (`route.md` `Met when`), and the full gate command passes on a clean working tree at the closing commit.

---

## Security review

---

<request>

My request above outranks the rest of this body; `Intent` outranks both — a conflict → ask me. Finish line = my request addressed: the work it names, else this body's whole work under its steering. State it in your first message; stop once it holds — finds past it → `.agent/deferred.md` rows. Security review of the implementation: threat surface from `.agent/spec.md` `Intent` + `Artifacts`; run the committed scanners (a stack with none earns a finding), then a manual pass over remotely reachable code on a check set fixed before reading — each untrusted input traced to every sink it reaches, against the repo's own validation + auth patterns: injection (SQL/NoSQL, shell, template, XML entities, file paths), authn/authz bypass + privilege escalation, session + token handling, secrets + crypto (hardcoded keys, weak algorithms, randomness, certificate checks), unsafe deserialization + eval, raw-HTML sinks, server-side requests to attacker-chosen hosts or schemes, data exposure (secrets + PII in logs, debug output, API responses), dependencies + supply chain; trust model: env vars + CLI flags = trusted, the server = the enforcement boundary, framework auto-escaping holds outside raw-HTML sinks; each finding carries severity, `file:line`, and a red test or repro; every finding above informational is fixed, the rest → `.agent/deferred.md` with an acceptance check. Gate green at every scoped commit. You run this body alone: security vocabulary ends a teammate's context (global `CLAUDE.md` `Subagents`).

Met when: your finish line holds — for the work it covers, every check-set row carries a verdict, every fix has a green acceptance check, and the full gate command passes on a clean working tree.

---

## Dependency upgrade

---

<request>

My request above outranks the rest of this body; `Intent` outranks both — a conflict → ask me. Finish line = my request addressed: the work it names, else this body's whole work under its steering. State it in your first message; stop once it holds — finds past it → `.agent/deferred.md` rows. Upgrade every dependency + toolchain pin to its latest release: list current vs latest per entry yourself; each major bump → its changelog's breaking changes against our call sites; adapt code, refresh lockfiles, rerun the full gate with scanners + drive each runnable `Artifacts` entry by its run command; a dependency held back earns a `.agent/deferred.md` row naming the blocker.

Met when: your finish line holds — for the work it covers, every dependency is at its latest release or holds a `.agent/deferred.md` row, and the full gate command passes on a clean working tree.

---
