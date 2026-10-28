import type { AgentInfo } from 'claude-code'

import type { AgentFlowAgent } from '../types'

// Every subagent system prompt ends with the Notes line "Do NOT Write report/summary/
// findings/analysis .md files …", whose own exception reads "Files written as input to
// another tool are fine". The brief files the deliverable under that exception.
export const SPAWN_NOTE =
  'Output file named in your task = the deliverable + the input to the validator the brief names ⇒ the Notes clause "Files written as input to another tool are fine" covers it. Write it early + keep it current; final message = its path + the headline. Each claim you could not confirm → marked unconfirmed + where you looked. Work held only in this conversation ends with the run.'

// Auto-compaction can drop a brief's paths and marker; only the summary survives it.
export const COMPACT_NOTE =
  'Summary carries verbatim: every path this run must write or update, its completion marker or "Met when" condition, its write allowlist + git posture, the ids of rows still unfilled, the exact next action.'

/** CC's Write rejects a subagent's /^(REPORT|SUMMARY|FINDINGS|ANALYSIS).*\.md$/i file with this error. */
export const REPORT_REJECTION = 'Subagents should return findings as text'

export const wroteNothing = (n: number) =>
  `${n} tool calls, no Write, Edit or commit ⇒ this run's findings may live only in this conversation, which ends with it. Output file named in your task → write it now; nothing needed writing → say so in your final message.`

export function stopHold(name: string, marker: string | undefined, targets: readonly string[]): string {
  return `${name} = mid-turn → wait for its turn end + ${marker ?? 'its completion marker'}: a stop now cuts the in-flight call + any row it is still changing. Stop anyway (budget, supersession, takeover, cancellation) → TaskStop again, then re-read every file it wrote.${targets.length ? ` Write/Edit targets: ${targets.join(', ')}.` : ''}`
}

/** A short lookup answers in its message; a run this long without a write likely lost its findings. */
export const WROTE_NOTHING_MIN = 15
/** A teammate quiet this long is likely idle → its stop passes unheld (a silent long tool call is the blind spot). */
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

/** Gauge denominator = CC's compaction trigger: 33K below the ACW-clamped window. */
export function trigger(window: number, acw: number): number {
  return (acw > 0 ? Math.min(window, acw) : window) - 33_000
}

/** Statusline `h`: ≥1M ⇒ one-decimal M, `.0` dropped; else rounded K. An exact x.x5M tie rounds up where awk's rounds to even. */
export function human(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  return `${Math.floor(n / 1000 + 0.5)}K`
}

/** One entry per engine-listed running agent (idle teammates included), in list order: name, model, context against the trigger. */
export function agentEntries(list: readonly AgentInfo[], agents: Readonly<Record<string, AgentFlowAgent>>, at: number): string[] {
  return list
    .filter(x => x.status === 'running')
    .map(x => {
      const a = agents[x.id]
      const used = a?.used
      const gauge = used === undefined ? `? ?/${human(at)}` : `${Math.round((used * 100) / at)}% ${human(used)}/${human(at)}`
      return [x.name ?? a?.name ?? x.description, a?.model, a?.effort, gauge].filter(Boolean).join(' ')
    })
}
