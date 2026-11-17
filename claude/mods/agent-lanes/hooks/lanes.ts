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
// in 1% of OpenAI's cases, sol 6.2 in 9%; which gathers more per budget = untested); beats luna at every price above
// $0.04.
// Effort shifts = user rulings, no board tests them: haiku −1, floor medium (terra's steepest drop = medium → low);
// classifier −2 (one paired corpus: sol low ≈ medium in flag count + known-error recall, 6.1 + 6.2; the brief's
// boundary rules moved 6.2's flags 4×, effort 1.03×); opus +1 (astra's max gains on the hardest questions: HLE-Diamond
// +4.9 over xhigh; its science gain depends on the board).
// Codex credits = 25 × API $ per model ⇒ $/task = quota. When to pick each lane = host CLAUDE.md `Model lanes`.

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

/** Terra stops before its task is done ⇒ each terra agent's first stop is sent back once. */
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
  'Stop check (terra lane, once): reread your task\'s finish line + the validator it names. Every deliverable row filled + checked → stop with your final message; otherwise continue until it holds.'

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
