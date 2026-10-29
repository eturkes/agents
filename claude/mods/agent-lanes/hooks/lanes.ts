// Picks = Artificial Analysis Intelligence Index v5 per model × effort: sol = best index per cost medium → max; astra
// beats sol max at max alone (high/xhigh 55 = sol max at 2.5-2.9× cost), its lead = empirical science (Vals
// TB-Science 62.9 vs 52.9 same harness, MysteryMechanism 53.2 vs 46.4) at 5.6-6×; maths + machine-checked proofs tie sol
// at 4-7× (Vals ProofBench 99/99, Verity Rust 75/75, MathArena ArXivLean 37.7/35.9 ±13, FrontierMath T1-3 93.7/93.7),
// Opus 5.5 ahead of both on proofs (Verity Rust 84, ArXivLean 47.2); FaithAlign statement faithfulness: astra first,
// sol 6.1 untested;
// terra beats luna at every price above $0.04; haiku = terra medium = lowest effort a gathering fan-out tolerates: low →
// medium = OSWorld +12.9, factual errors 16.7 → 10.1%; medium rows held under MAIN's rematch. Terra vs sol: computer use ties (OSWorld 2.1 sol
// +4-7 per effort; Agents' Last Exam + Coarena computer board terra ahead), MMMU-Pro + NC Bench writing tie; terra's
// $/task = 0.2-0.8× sol's through xhigh, 0.5-1.0× at max; frontend builds → sol (Arena WebDev 1751 vs 1673, Vibe Code
// 88.9 vs 84.0 at equal $); terra knows less + abstains more (AA-Omniscience medium accuracy 47 vs 60; its hallucination
// rate counts abstention); per-item judgment from row text: sol medium recall 18/21 + precision 34% ≈ sol low vs terra
// medium 13/21 + 10%, terra's flags unstable run to run; sol low = sol's weakest point (OSWorld 60.9 vs 73.5 medium,
// factual errors 14.7 vs 12.0%) ⇒ per-item judgment at medium.
// Codex credits = 25 × API $ per model ⇒ $/task = quota. When to pick each lane = host CLAUDE.md `Model lanes`.

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
/** lateOnly → PROTOTYPE + ITERATE route the lane to the default (cheap phases keep astra's cost out). */
export type Lane = { model: string; effort?: Effort; lateOnly?: true }

/** No lane named → sol, or the launch env's CLAUDE_CODE_SUBAGENT_MODEL in its place. */
export const DEFAULT_MODEL = 'gpt-6.1-sol'

/** The Agent tool's `model` enum offers Claude aliases alone ⇒ each names a GPT lane here. */
export const LANES: Readonly<Record<string, Lane>> = {
  sonnet: { model: 'gpt-6.1-terra' },
  haiku: { model: 'gpt-6.1-terra', effort: 'medium' },
  opus: { model: 'gpt-6-astra', effort: 'max', lateOnly: true },
}

/** A role's lane when the call names none. */
export const ROLE_LANES: Readonly<Record<string, string>> = { operator: 'sonnet', scientist: 'opus' }

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
  const lanes = Object.entries(LANES).map(([alias, l]) =>
    `\`${alias}\` → ${l.model}${l.effort ? ` at ${l.effort} effort` : ''}`)
  const roles = Object.entries(ROLE_LANES).map(([role, alias]) => `${role} → \`${alias}\``)
  return [
    `Model lanes (this machine): \`model\` names a GPT lane — omitted → ${DEFAULT_MODEL}; ${lanes.join('; ')}.`,
    `Role defaults: ${roles.join(', ')}. A lane's effort applies where \`effort\` is omitted. When to pick each = CLAUDE.md \`Model lanes\`.`,
  ].join(' ')
}
