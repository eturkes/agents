Continue this project (fresh session). Task present ⇒ execute exactly it; edit the roadmap when the task directs. Task empty ⇒ run MODE for the active milestone (first awaiting DONE/REVIEWED).

Load `.agent/roadmap.md` (ledger + active detail), then `.agent/memory.md`; `CLAUDE.md` auto-injects. Read step-implicated files.

MODE ← active-milestone status (state-changing closes use a scoped commit; an unchanged BLOCKED recheck closes read-only; convention below):
- UNPLANNED (incl. a still-unsplit future milestone) → PLANNING
- IN-PROGRESS (has an OPEN unit) → WORK-UNIT (lowest OPEN unit)
- IN-PROGRESS (OPEN=0; BLOCKED>0) → WORK-UNIT (lowest BLOCKED, gate recheck)
- IMPLEMENTED (all units DONE; review pending) → MILESTONE-REVIEW

Execution map:
- PLANNING + MILESTONE-REVIEW → dynamic workflows.
- WORK-UNIT implementation + cohesive implementation-fix batches → `Agent` subagents.
- MAIN → scope, coordinate, independently verify. Context recording → implemented WORK-UNIT close only.

Roles:
- MAIN owns acceptance restatement, precondition confirmation, SIZE-CHECK/respec, Agent task definition, diff inspection, decisive gate reruns, context recording + close.
- MAIN alone creates repository commits; AGENT returns working-tree changes.
- AGENT owns implementation of the accepted scope, required quality gates, durable-guidance routing, and returns the diff + evidence.
- WORKFLOW LENS = analysis; implementation findings return to MAIN for Agent routing.

PLANNING — split scope into milestones as needed; plan the next milestone.
- Read the prior milestone's commit range and recorded `impl=` context; for the first planned milestone, read the scope-seed commit(s) named by the roadmap. Size future units from implementation usage; treat `main=` as coordination overhead.
- MAIN confirms each milestone precondition through project pipeline/tooling with permitted real inputs. Met ⇒ clear stale standing block + continue. Unmet ⇒ record standing block + evidence; changed record ⇒ commit `roadmap (M<m> block): …`; unchanged record ⇒ read-only close.
- Run a dynamic workflow + web search; discover code via tokensave (`tokensave_context` first, within its per-project call cap), then reconcile `git status`.
- Break the milestone into units that project to fit one compaction-free Agent context = 252K effective (raw 272K − 20K output reserve), hard block 249K → aim ~200K, reserve ~49K for variance, verification + closure. Sequence gate-independent prep first; mark a gated unit BLOCKED until its precondition is met.
- Close: set the milestone IN-PROGRESS (units enumerated), commit `roadmap (M<m> plan): …`.

WORK-UNIT.
- Read the last completed unit's commit(s), or the planning commit(s) for the milestone's first unit. A banked FAST-PATH/recipe block supersedes that discovery read: use the block + named authority commit as unit context.
- MAIN restates the accepted unit scope + acceptance checks in one line.
- Precondition transition: recheck BLOCKED first. Met ⇒ clear block, set OPEN, continue. Unmet ⇒ retain BLOCKED; materially changed evidence ⇒ update + commit `roadmap (M<m>.<u> block): …`; stable evidence ⇒ read-only close. OPEN + unmet ⇒ set BLOCKED, record condition/evidence, make block commit, close. Accepted evidence traces permitted real inputs.
- MAIN performs SIZE-CHECK before implementation: score scope + required read cost against one compaction-free Agent context (252K effective, hard block 249K), aiming ~200K with ~49K reserved for variance, verification + closure. A projection that would breach that reserve ⇒ respec-split at a confirmed seam into fresh self-contained units; bank prose decisions + confirmed facts + reading pointers, delete session wip, and commit `roadmap (M<m>.<u> respec): …`. Post-respec score source = the implementing Agent's fresh 252K budget; main-session compaction (240K) governs coordinator closure alone.
- MAIN dispatches one Agent with accepted scope, locations, constraints, quality gates + acceptance checks. AGENT implements, reuses project modules/style, runs required lint/format/type-check/tests, confirms touched scripts exit cleanly, routes durable guidance, and returns diff + evidence; MAIN retains commit ownership.
- MAIN inspects the diff and reruns decisive gates independently. Accepted evidence must trace permitted real inputs.
- Close (implemented unit): record `main=<.agent/context.sh full pct used/window>` and `impl=<implementing Agent transcript final pct used/252K>` in the roadmap; planning sizes from `impl` and treats `main` as coordination overhead. Set the unit DONE and, once all units are DONE, the milestone IMPLEMENTED; commit `<scope> (M<m>.<u>): …`.
- Close (respec-only): replacement units remain OPEN/BLOCKED according to their gates; end at the respec commit.

Closure signal = the `context-alert` hook, arriving at the ~200K aim + again near each limit (MAIN 220K → compaction 240K; AGENT 230K → hard block 249K). Work until it arrives, then fix scope + close.

MILESTONE-REVIEW — dynamic workflow; exempt from the ~200K aim and may continue across automatic compactions. MAIN creates a coherent checkpoint before compaction and continues afterward.
- Read every milestone commit, planning commits included.
- Run analysis-only review lenses for: correctness/spec; cross-unit integration; instruction/memory conformance; token-efficiency/obsolescence. Each finding supplies severity + `file:line` + divergence + impact + acceptance check.
- MAIN validates + deduplicates findings. Accepted implementation findings become one Agent task per cohesive fix batch under the same MAIN-commit contract, carrying locations + acceptance checks; each Agent returns diff + evidence, and MAIN independently inspects + reruns decisive gates.
- A requirement-changing design reaches the user before any scope-source edit.
- Close: set the milestone REVIEWED, commit `<scope> (M<m> review): …`. The next session plans the next milestone.

Commit convention — scoped (`<scope>: …`), trace key in parens: unit `(M<m>.<u>)`, block `(M<m> block)` / `(M<m>.<u> block)`, plan `(M<m> plan)`, respec `(M<m>.<u> respec)`, review `(M<m> review)`. Grep a milestone's history: `git log --grep "(M<m>[. ]"`.

Task: $ARGUMENTS
