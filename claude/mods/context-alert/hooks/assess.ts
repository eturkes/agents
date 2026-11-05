import type { ContextAlertTier } from '../types'

// Offsets below the compaction trigger = slowest observed response to the tier + p99 step growth
// ⇒ that response still fits when the alert fires one step past its threshold; `agent-census` alerts derives them.
// Main = one tier, advice = carry on: urgent wording there → early turn ends + skipped gates.
type Loop = 'main' | 'agent'
const OFFSETS: Record<Loop, Partial<Record<ContextAlertTier, number>>> = {
  main: { notice: 65_000 },
  agent: { notice: 82_000, final: 35_000 },
}
// CC's compaction trigger for every loop = window − 33K.
const RESERVE = 33_000

// `agent-census` parses both tables ⇒ advice = single-quoted + apostrophe-free; label = text before its first colon.
const ADVICE: Record<Loop, Partial<Record<ContextAlertTier, string>>> = {
  main: {
    notice: 'Compaction is automatic: the session continues from its summary → keep the checklist current (.agent/spec.md Tasks or .scratch/tasks.md) + carry the work on as planned, every step, gate, wait + turn end unchanged.',
  },
  agent: {
    notice: 'Hand off: deliverable current on disk (open items marked open + their next step) → return its path, completion status + next action.',
    final: 'Hand off now: deliverable current on disk (open items marked open) → return its path, completion status + next action.',
  },
}
// Highest tier first.
const ORDER = ['final', 'notice'] as const

export type Assessment = { tier: ContextAlertTier; text: string }

/** `used` = last request's input + cache + output of the loop; `window` = its raw window, clamped to ACW when set. */
export function assess(used: number, window: number, acw: number, isAgent: boolean): Assessment | undefined {
  const trigger = (acw > 0 ? Math.min(window, acw) : window) - RESERVE
  const loop: Loop = isAgent ? 'agent' : 'main'
  const tier = ORDER.find(t => {
    const offset = OFFSETS[loop][t]
    return offset !== undefined && used >= trigger - offset
  })
  const advice = tier && ADVICE[loop][tier]
  if (!tier || !advice) return undefined
  const left = Math.max(0, Math.trunc((trigger - used) / 1000))
  const label = trigger % 1_000_000 === 0 ? `${trigger / 1_000_000}M` : `${Math.trunc(trigger / 1000)}K`
  return { tier, text: `Context ${Math.trunc(used / 1000)}K/${label} — ${left}K left. ${advice}` }
}

/** Each tier once per loop, final covering notice ⇒ regrowth after compaction stays quiet. */
export function claimable(had: ContextAlertTier | undefined, tier: ContextAlertTier): boolean {
  return had !== 'final' && had !== tier
}
