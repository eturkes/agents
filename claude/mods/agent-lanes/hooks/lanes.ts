// Picks = Artificial Analysis Intelligence Index v5 per model × effort: sol = best index per cost medium → max; astra
// beats sol max at max alone (high/xhigh 55 = sol max at 2.5-2.9× cost), its lead = science + research-level reasoning;
// terra medium (38 @ $0.17) beats luna at every price above $0.04 + hallucinates least (65% non-hallucination at max).
// Codex credits = 25 × API $ per model ⇒ $/task = quota. When to pick each lane = host CLAUDE.md `Model lanes`.

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'
/** lateOnly → PROTOTYPE + ITERATE route the lane to the default (cheap phases keep astra's cost out). */
export type Lane = { model: string; effort?: Effort; lateOnly?: true }

/** No lane named → sol, or the launch env's CLAUDE_CODE_SUBAGENT_MODEL in its place. */
export const DEFAULT_MODEL = 'gpt-6.1-sol'

/** The Agent tool's `model` enum offers Claude aliases alone ⇒ each names a GPT lane here; ranks match the alias ladder. */
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
    `\`${alias}\` → ${l.model}${l.effort ? ` at ${l.effort} effort` : ''}${l.lateOnly ? ' (PROTOTYPE + ITERATE: the omitted lane)' : ''}`)
  const roles = Object.entries(ROLE_LANES).map(([role, alias]) => `${role} → \`${alias}\``)
  return [
    `Model lanes (this machine): \`model\` names a GPT lane — omitted → ${DEFAULT_MODEL}; ${lanes.join('; ')}; \`${REFUSED}\` → refused.`,
    `Role defaults: ${roles.join(', ')}. A lane's effort applies where \`effort\` is omitted; forks run your own model.`,
    `When to pick each = CLAUDE.md \`Model lanes\`.`,
  ].join(' ')
}
