import type { ContextAlertTier } from '../types'

// Tiers sit at fixed offsets below the window ⇒ equal headroom at any window size.
const NOTICE = 100_000
const FINAL = 50_000
// CC's compaction trigger wherever it enforces one = window − 33K.
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

/**
 * `used` = last request's input + cache + output of the loop; `window` = its raw window.
 * ACW set ⇒ min(window, ACW) − 33K = trigger for every loop; unset ⇒ MAIN runs
 * collapse-managed on its raw window, an agent compacts at window − 33K.
 */
export function assess(used: number, window: number, acw: number, isAgent: boolean): Assessment | undefined {
  let w = window
  let trigger = isAgent ? w - RESERVE : w
  if (acw > 0) {
    w = Math.min(w, acw)
    trigger = w - RESERVE
  }
  const tier: ContextAlertTier | undefined = used >= w - FINAL ? 'final' : used >= w - NOTICE ? 'notice' : undefined
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
