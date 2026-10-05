export const MODEL = 'gpt-6-astra'
export const PING = 'echo second-advisor'
export const REBUT_TOOL = 'mcp__astra-advisor__rebut'

// Fork = blind session copy cut before the call: no tools/MCP/advisor; disableAllHooks also
// keeps every mod out (no mail per review); context window lifted past the 305K teammate pin.
export const FORK_SETTINGS = JSON.stringify({
  disableAllHooks: true,
  advisorModel: '',
  env: { CLAUDE_CODE_MAX_CONTEXT_TOKENS: '1000000' },
})

export const REVIEW_PROMPT =
  "Second advisor: the transcript above ends where the agent called its advisor tool, another model; that call and its reply are cut off by design, so judge independently. Use no tools. Review the task, the evidence in the tool results, and the agent's latest stated plan and doubt. Reply in under 300 words: your verdict on the current direction; each error, risk or gap with its evidence (file:line, command output or transcript fact); the next step you recommend."

export function rebutPrompt(earlier: string | undefined, gist: string): string {
  return `Second advisor, reconciliation round. Your earlier verdict:
${earlier ?? '(none recorded)'}

The agent's other advisor disagrees:
${gist}

Use no tools. Reply in under 250 words: the points you concede, the points you hold and why, and the one check that decides each open disagreement.`
}

const REBUT_LINE = `On a substantive disagreement, call \`${REBUT_TOOL}\` once with the advisor gist + the open question.`

function head(verdict: string): string {
  return `Second advisor (${MODEL}, blind to your advisor() reply) reviewed the session up to that call:
${verdict}

Rule on each point where the two advisors disagree by your own check`
}

export const verdictOnPing = (v: string) => `${head(v)}, then continue. ${REBUT_LINE}`
export const verdictOnCall = (v: string) =>
  `${head(v)}, then re-issue this call if it still stands. ${REBUT_LINE} Right after each advisor() call, run \`${PING}\` alone: it returns this verdict without a refused call.`
export const verdictOnStop = (v: string) => `${head(v)}, then finish. ${REBUT_LINE}`

export const HOLD = 'Held with its batch for the second advisor; the verdict arrives on a sibling call. Re-issue this call if it still stands.'
export const FAILED = `Second advisor (${MODEL}) gave no verdict for this advisor() call; continue on the advisor() reply alone.`
export const STOP_FAILED = `Second advisor (${MODEL}) gave no verdict for the last advisor() call.`

const EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max'])
export function effortOf(e: unknown): string {
  return typeof e === 'string' && EFFORTS.has(e) ? e : 'high'
}

/** `claude -p --output-format json` stdout → verdict; anything else = none. */
export function verdictOf(stdout: string): string | undefined {
  try {
    const r: unknown = JSON.parse(stdout)
    if (typeof r !== 'object' || r === null) return undefined
    const { is_error, result } = r as { is_error?: unknown; result?: unknown }
    return is_error === false && typeof result === 'string' && result.trim() ? result : undefined
  } catch {
    return undefined
  }
}

type Block = { type?: unknown; name?: unknown; id?: unknown; tool_use_id?: unknown }

/** The advisor() call id a row's blocks carry: `use` = server_tool_use, `result` = its result. */
export function advisorBlock(content: unknown, kind: 'use' | 'result'): string | undefined {
  if (!Array.isArray(content)) return undefined
  for (const b of content as Block[]) {
    if (kind === 'use' && b?.type === 'server_tool_use' && b.name === 'advisor' && typeof b.id === 'string') return b.id
    if (kind === 'result' && b?.type === 'advisor_tool_result' && typeof b.tool_use_id === 'string') return b.tool_use_id
  }
  return undefined
}

/** An empty thinking-only entry never ends a fork. */
export function isThinkingOnly(content: unknown): boolean {
  return Array.isArray(content) && content.length > 0 && (content as Block[]).every(b => b?.type === 'thinking' || b?.type === 'redacted_thinking')
}
