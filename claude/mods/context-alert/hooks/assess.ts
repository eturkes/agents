import type { ContextAlertTier } from '../types'

// Offsets below the compaction trigger = slowest observed response to the tier + p99 step growth
// ⇒ that response still fits when the alert fires one step past its threshold; `agent-census` alerts derives them.
const OFFSETS = {
  main: { notice: 65_000, final: 27_000 },
  agent: { notice: 82_000, final: 35_000 },
} as const
// CC's compaction trigger for every loop = window − 33K.
const RESERVE = 33_000

const ADVICE = {
  main: {
    notice: 'Checkpoint ahead of compaction: land the current unit on a commit with its checklist current (.agent/spec.md Tasks or .scratch/tasks.md), then continue.',
    final: 'Compaction is imminent: commit now with the checklist current; after compaction, reorient from the checklist + git log and continue.',
  },
  agent: {
    notice: 'Hand off: bring your deliverable current on disk, then return its path, completion status + next action.',
    final: 'Compaction is imminent: save progress to your deliverable now, then return its path, completion status + next action.',
  },
} as const

export type Assessment = { tier: ContextAlertTier; text: string }

/** `used` = last request's input + cache + output of the loop; `window` = its raw window, clamped to ACW when set. */
export function assess(used: number, window: number, acw: number, isAgent: boolean): Assessment | undefined {
  const trigger = (acw > 0 ? Math.min(window, acw) : window) - RESERVE
  const { notice, final } = OFFSETS[isAgent ? 'agent' : 'main']
  const tier: ContextAlertTier | undefined = used >= trigger - final ? 'final' : used >= trigger - notice ? 'notice' : undefined
  if (!tier) return undefined
  const left = Math.max(0, Math.trunc((trigger - used) / 1000))
  const label = trigger % 1_000_000 === 0 ? `${trigger / 1_000_000}M` : `${Math.trunc(trigger / 1000)}K`
  const advice = ADVICE[isAgent ? 'agent' : 'main'][tier]
  return { tier, text: `Context ${Math.trunc(used / 1000)}K/${label} — ${left}K left. ${advice}` }
}

/** final covers notice ⇒ regrowth after compaction stays quiet. */
export function claimable(had: ContextAlertTier | undefined, tier: ContextAlertTier): boolean {
  return had !== 'final' && had !== tier
}
