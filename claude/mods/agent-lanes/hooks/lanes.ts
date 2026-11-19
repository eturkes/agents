// Lane picks (sol + astra = 6.2; launch-week boards at max effort unless named + a paired in-session check, 2026-11-18;
// each = a default under uncertainty, appraised claim by claim, not a ranking): sol = default (AA index above sol 6.1
// at every effort for 0.8–1.14× its cost per task, ahead on most code boards sampled; its max matches astra 6's index
// at 1/6 the cost per task; code vs astra 6.2: astra 0–4 points ahead on five measures (6–8 at xhigh on AA) at
// 2.5–4.6× sol's cost per task, sol ahead on code migration; leads terra on frontend builds, knowledge + per-item
// judgment; maths + machine-checked proofs: tied astra on the 6.1 boards, 6.2 unlisted); a proof sol fails → MAIN
// (Opus 5.5 leads both on proofs). astra = empirical science: ahead of sol on every science board sampled (terminal
// research workflows, mechanism recovery, biological data, physics), where sol 6.2 scores under sol 6.1 on mechanism
// recovery + physics (Vals MysteryMechanism 36.9 vs 46.4, CritPt 62.5 vs 69.5) + over it on terminal science; vs
// Fable 5.2 the science boards split by task; + statement-faithfulness judging until checked (astra 6 led the one
// benchmark; no 6.2 entry). terra = visual work, computer use + writing (tied sol 6.1 at lower cost; no rated board
// pairs it with sol 6.2 yet) + gathering (copies + abstains well, judges less; left a broken search tool unreported
// in 1% of OpenAI's cases, sol 6.2 in 9%); beats luna at every price above $0.04.
// Open-search sweeps, paired in-session check 2026-11-19 (one brief, one run per cell bar terra high ×3, distinct
// sources per run): terra high 16–21 in 9–13 min, terra xhigh 20, sol medium 29 in 21 min, sol xhigh 50 in 33 min;
// three terra-high runs together 35 (22 shared with sol xhigh, 13 only terra, 28 only sol) at under half sol xhigh's
// flat-rate token cost ⇒ breadth = parallel terra, depth per run = sol; row accuracy past quote matching = ungraded.
// Effort shifts = user rulings = starting points, none measured as an optimum (appraisal 2026-11-19): harder
// multi-step work gained with effort (Bito hard sessions, sol low → high: +8.5 rubric points, misleading claims per
// answer 0.62 → 0.23; Bug Hunt Bench, sol low…max: 36 / 45.7 / 49.7 / 49 / 54.7 of 105 planted bugs fixed), bounded
// tests split (AI Coding Daily flat low…high; AI BENCHY sol low / medium / high 58 / 64 / 67 of 69). haiku −1, floor
// medium (terra's steepest drop = medium → low); classifier −2 (one paired corpus: sol low ≈ medium in flag count +
// known-error recall, 6.1 + 6.2; the brief's boundary rules moved 6.2's flags 4× + its recall 20 → 15 of 21, effort
// 1.03×); opus +1 (astra max over xhigh: HLE-Diamond +4.9, Bug Hunt +2.7 of 105, AA index +0.5, AA Terminal-Bench
// Science −0.5, a 23-test suite level; token cost +20% … +137% by workload).
// Review = sol; a closing diff with large consequences may add one whole-diff astra reviewer beside the sol slices
// (user ruling 2026-11-19 on evidence appraised open: Bug Hunt (find + fix) at xhigh astra 60 vs sol 49, runs 59–62
// vs 46–52; one 16-bug hunt level with 2–3 false reports from astra; one bug-finding score sol ahead; no test of the
// added pass against the slices alone).
// Codex credits = 25 × API $ per model at flat per-token rates (the API's 2× rate past 272K input: OpenAI states it
// absent for subscription use of sol 6.1 alone) ⇒ $/task ≈ quota. When to pick each lane = host CLAUDE.md `Model lanes`.

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export const EFFORTS: readonly Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']
/** shift = levels from MAIN's effort; floor = the lowest it takes; lateOnly → PROTOTYPE + ITERATE route the lane to the
 *  default (cheap phases keep astra's cost out). */
export type Lane = { model: string; shift?: number; floor?: Effort; lateOnly?: true }

/** No lane named → sol, or the launch env's CLAUDE_CODE_SUBAGENT_MODEL in its place. */
export const DEFAULT_MODEL = 'gpt-6.2-sol'

/** The Agent tool's `model` enum offers Claude aliases alone ⇒ each names a GPT lane here. */
export const LANES: Readonly<Record<string, Lane>> = {
  sonnet: { model: 'gpt-6.1-terra' },
  haiku: { model: 'gpt-6.1-terra', shift: -1, floor: 'medium' },
  opus: { model: 'gpt-6.2-astra', shift: 1, lateOnly: true },
}

/** A role's lane when the call names no alias: an alias, or a lane the aliases leave out. */
export const ROLE_LANES: Readonly<Record<string, string | Lane>> = {
  operator: 'sonnet',
  scientist: 'opus',
  classifier: { model: DEFAULT_MODEL, shift: -2 },
}

/** A teammate's effort: MAIN's shifted by its lane (none = the default lane, shift 0); MAIN's unknown → undefined. */
export function laneEffort(lane: Lane | undefined, main: string | undefined): Effort | undefined {
  const i = EFFORTS.indexOf(main as Effort)
  if (i < 0) return undefined
  const shifted = Math.min(EFFORTS.length - 1, Math.max(0, i + (lane?.shift ?? 0)))
  return EFFORTS[Math.max(shifted, lane?.floor === undefined ? 0 : EFFORTS.indexOf(lane.floor))]
}

/** Terra stops before its task is done ⇒ each terra agent's first stop is sent back once. NUDGE's wording = measured
 *  on `researcher` sweeps (2026-11-19): "rows filled + checked → stop" → 0 of 6 resumed source work; a text naming
 *  the undone step kinds → 4 of 4 did (3–46 tool calls, 1–6 rows added). */
export const NUDGED_MODEL = 'gpt-6.1-terra'

export const REFUSED = 'fable'

/** `.agent/spec.md` `Phase` line 1 in spec-lint's form, `Phase: ` prefix allowed. */
export const EARLY_PHASE = /^(?:Phase: )?(?:PROTOTYPE|ITERATE) — \S/

/** First non-blank line under `## Phase`, fenced blocks skipped (spec-lint's reading). */
export function phaseLine(spec: string): string | undefined {
  let fence = false
  let phase = false
  for (const raw of spec.replace(/^\uFEFF/, '').split('\n')) {
    const line = raw.replace(/\r$/, '')
    if (/^ {0,3}(```|~~~)/.test(line)) fence = !fence
    else if (fence) continue
    else if (line.startsWith('## ')) phase = line.slice(3).trim() === 'Phase'
    else if (phase && /\S/.test(line)) return line
  }
  return undefined
}

export const refusal = (model: string) =>
  `model "${model}" → no lane: lanes = omitted (${DEFAULT_MODEL}), sonnet, haiku, opus (Agent tool description).`

export const NUDGE =
  'Stop check (terra lane, once): reread your task\'s finish line item by item + rerun the validator it names. An item still unmet, or a step the brief asks for left undone (a search not run, a source not opened, a `none-found` row ahead of its searches) → do that work now; a step you tried + could not do → named with its error. Every item met → stop with your final message.'

/** Appended to the Agent tool's description: the mapping beside the enum it reinterprets. */
export function describeLanes(): string {
  const effort = (l: Lane) =>
    l.shift ? ` at MAIN effort ${l.shift > 0 ? '+' : '−'}${Math.abs(l.shift)}${l.floor ? `, floor ${l.floor}` : ''}` : ''
  const lane = (l: Lane) => `${l.model}${effort(l)}`
  const lanes = Object.entries(LANES).map(([alias, l]) => `\`${alias}\` → ${lane(l)}`)
  const roles = Object.entries(ROLE_LANES).map(([role, r]) => `${role} → ${typeof r === 'string' ? `\`${r}\`` : lane(r)}`)
  return [
    `Model lanes (this machine): \`model\` names a GPT lane — omitted → ${DEFAULT_MODEL}; ${lanes.join('; ')}.`,
    `Role defaults: ${roles.join(', ')}. Effort, where \`effort\` is omitted = MAIN's, shifted by the lane. When to pick each = CLAUDE.md \`Model lanes\`.`,
  ].join(' ')
}
