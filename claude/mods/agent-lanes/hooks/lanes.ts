// Lane picks = Artificial Analysis Intelligence Index v5 (2026-10-28) per model × effort + the user's rulings:
// sol leads index per cost from medium to max; astra beats sol max at max alone (high/xhigh = 55 = sol max at 2.5-2.9×
// cost), its lead = science + research-level reasoning; terra medium (38 @ $0.17) beats luna at every price above $0.04,
// least GPT hallucination (65% non-hallucination at max). Codex credits = 25 × API $ for each model ⇒ $/task = quota.

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type Lane = { model: string; effort?: Effort; use: string }

/** No lane named → sol, or the launch env's CLAUDE_CODE_SUBAGENT_MODEL in its place. */
export const DEFAULT_MODEL = 'gpt-6.1-sol'
export const DEFAULT_USE = 'coding + general'

/** The Agent tool's `model` enum offers Claude aliases alone ⇒ each names a GPT lane here; ranks match the alias ladder. */
export const LANES: Readonly<Record<string, Lane>> = {
  sonnet: { model: 'gpt-6.1-terra', use: 'visual work, computer use, technical writing' },
  haiku: { model: 'gpt-6.1-terra', effort: 'medium', use: 'fan-outs: thoroughness by count, mass information gathering' },
  opus: { model: 'gpt-6-astra', effort: 'max', use: 'science + research-level reasoning (maths, physics, statistics, proofs); hard coding stays on sol; never an advisor fit' },
}

/** A role's lane when the call names none. */
export const ROLE_LANES: Readonly<Record<string, string>> = { operator: 'sonnet', scientist: 'opus' }

/** Terra stops before its task is done ⇒ each terra agent's first stop is sent back once. */
export const NUDGED_MODEL = 'gpt-6.1-terra'

export const REFUSED = 'fable'

export const refusal = (model: string) =>
  `model "${model}" = no lane on this machine (teammates run GPT alone): omit model (${DEFAULT_MODEL}) or name sonnet, haiku or opus; lanes = the Agent tool description.`

export const NUDGE =
  'Stop check (terra lane, once): reread your task\'s finish line + the validator it names. Every deliverable row filled + checked → stop with your final message; otherwise continue until it holds.'

const effortOf = (l: Lane) => (l.effort ? ` at ${l.effort} effort` : '')

/** Appended to the Agent tool's description: the lanes beside the enum they reinterpret. */
export function describeLanes(): string {
  const lanes = Object.entries(LANES).map(([alias, l]) => `\`${alias}\` → ${l.model}${effortOf(l)}: ${l.use}`)
  const roles = Object.entries(ROLE_LANES).map(([role, alias]) => `${role} → \`${alias}\``)
  return [
    `Model lanes (this machine): every teammate runs a GPT model ⇒ \`model\` names a lane, never a Claude model.`,
    `Omitted → ${DEFAULT_MODEL}: ${DEFAULT_USE}; ${lanes.join('; ')}; \`${REFUSED}\` → refused.`,
    `A role without a named lane: ${roles.join(', ')}. A lane's effort applies when \`effort\` is omitted. Forks run your own model.`,
  ].join(' ')
}
