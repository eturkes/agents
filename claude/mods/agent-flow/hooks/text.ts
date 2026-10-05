import type { AgentInfo } from 'claude-code'

import type { AgentFlowAgent } from '../types'

// Every subagent system prompt ends with the Notes line "Do NOT Write report/summary/
// findings/analysis .md files …", whose own exception reads "Files written as input to
// another tool are fine". The brief files the deliverable under that exception.
export const SPAWN_NOTE =
  'When your task names an output file, that file is the deliverable and the input to the validator the brief names, so the Notes clause "Files written as input to another tool are fine" covers it. Write it early, keep it current, then point your final message at it with the headline. Mark each claim you could not confirm as unconfirmed, naming where you looked. Work held only in this conversation ends with the run.'

// Auto-compaction can drop a brief's paths and marker; only the summary survives it.
export const COMPACT_NOTE =
  'The summary must carry verbatim: every path this run must write or update, the completion marker or "Met when" condition it was given, its write allowlist and git posture, the ids of any rows still unfilled, and the exact next action.'

/** CC's Write rejects a subagent's /^(REPORT|SUMMARY|FINDINGS|ANALYSIS).*\.md$/i file with this error. */
export const REPORT_REJECTION = 'Subagents should return findings as text'

export const wroteNothing = (n: number) =>
  `No Write, Edit or commit call appears across your ${n} tool calls, so the findings of this run may exist only in this conversation, which ends with it. If your task named an output file, write it now. If the correct outcome is that nothing needed writing, state that in your final message.`

export function stopHold(name: string, marker: string | undefined, targets: readonly string[]): string {
  return `${name} is mid-turn. Wait for its turn to end with ${marker ?? 'its completion marker'}: a stop now cuts the in-flight call and any row it is still changing. To stop it anyway (budget, supersession, takeover, cancellation), call TaskStop again, then re-read every file it wrote.${targets.length ? ` Its Write/Edit targets: ${targets.join(', ')}.` : ''}`
}

/** A short lookup answers in its message; a run this long without a write likely lost its findings. */
export const WROTE_NOTHING_MIN = 15
/** A stop of a teammate quiet this long cuts nothing in flight. */
export const QUIET_MS = 15 * 60_000
/** A TaskStop re-issued within this window = the deliberate stop. */
export const REISSUE_MS = 10 * 60_000

const MARKER = /[A-Za-z0-9][A-Za-z0-9_-]*-DONE-[0-9]+/g

/** Last completion marker in a text; leads write the name verbatim or uppercased. */
export function lastMarker(text: string): string | undefined {
  return text.match(MARKER)?.at(-1)
}

const DURABLE_BASH = /git commit|git add|>>|\btee\b/

/** Durable call = Write/Edit/NotebookEdit or Bash commit/add/>>/tee; a plain > redirect passes uncounted. */
export function isDurable(tool: string, input: { command?: unknown }): boolean {
  if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') return true
  return tool === 'Bash' && typeof input.command === 'string' && DURABLE_BASH.test(input.command)
}

/** Gauge denominator = the compaction trigger: ACW set ⇒ min(window, ACW) − 33K, else window − 33K. */
export function trigger(window: number, acw: number): number {
  return (acw > 0 ? Math.min(window, acw) : window) - 33_000
}

/** Statusline `h`: ≥1M ⇒ one-decimal M, `.0` dropped; else rounded K. An exact x.x5M tie rounds up where awk's rounds to even. */
export function human(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  return `${Math.floor(n / 1000 + 0.5)}K`
}

/** Statusline gauge colours on the rounded percent. */
export function tint(pct: number): string | undefined {
  return pct >= 92 ? 'red' : pct >= 75 ? 'yellow' : pct >= 50 ? 'green' : undefined
}

export type BandRow = { name: string; isIdle: boolean; isViewed: boolean; gauge: string; color?: string }

/** Band = engine-listed running agents (idle teammates included), in list order; usage + turn state from agent-flow's record. */
export function bandRows(list: readonly AgentInfo[], agents: Readonly<Record<string, AgentFlowAgent>>, at: number, viewed?: string): BandRow[] {
  return list
    .filter(x => x.status === 'running')
    .map(x => {
      const a = agents[x.id]
      const used = a?.used
      const pct = used === undefined ? undefined : Math.round((used * 100) / at)
      return {
        name: x.name ?? a?.name ?? x.description,
        isIdle: a?.inTurn !== true,
        isViewed: x.id === viewed,
        gauge: used === undefined || pct === undefined ? `? ?/${human(at)}` : `${pct}% ${human(used)}/${human(at)}`,
        color: pct === undefined ? undefined : tint(pct),
      }
    })
}
