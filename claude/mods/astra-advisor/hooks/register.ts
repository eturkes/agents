import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AstraPending } from '../types'
import {
  FAILED, FORK_SETTINGS, HOLD, MODEL, PING, REVIEW_PROMPT, STOP_FAILED,
  advisorBlock, effortOf, isThinkingOnly, rebutPrompt, verdictOf, verdictOnCall, verdictOnPing, verdictOnStop,
} from './text'

const last = atom({ plugin: 'astra-advisor', key: 'last' } as const, null)
// Host state, never module variables: a watched reload mid-turn keeps the pending review.
// Main loop only. A step's tool calls all arrive before the next step starts ⇒ step = batch.
const track = atom({ plugin: 'astra-advisor', key: 'track' } as const, { step: 0, effort: 'high' })
const FORK_MS = 540_000

async function fork($: EngineInterface, cut: string, effort: string, prompt: string): Promise<string | undefined> {
  try {
    const session = await $.session.id()
    const cwd = await $.session.cwd()
    const r = await $.process.run(
      ['claude', '-p', '--resume', session, '--resume-session-at', cut, '--fork-session', '--no-session-persistence',
        '--model', MODEL, '--effort', effort, '--strict-mcp-config', '--tools', '', '--settings', FORK_SETTINGS,
        '--output-format', 'json', prompt],
      { cwd: (await $.fs.exists(cwd)) ? cwd : '/', timeoutMs: FORK_MS },
    )
    return verdictOf(r.stdout)
  } catch {
    return undefined
  }
}

/** One review per advisor() call: the first caller to claim it awaits the fork as its own `$` call. */
async function claim($: EngineInterface): Promise<{ won: boolean; pending?: AstraPending; step: number }> {
  let won = false
  const t = await update($, track, x => {
    const p = x.pending
    won = p !== undefined && p.claimStep === undefined
    return won && p ? { ...x, pending: { ...p, claimStep: x.step } } : x
  })
  return { won, pending: t.pending, step: t.step }
}

async function review($: EngineInterface, p: AstraPending): Promise<string | undefined> {
  const verdict = p.cut === undefined ? undefined : await fork($, p.cut, p.effort, REVIEW_PROMPT)
  await update($, track, x => (x.pending?.call === p.call ? { ...x, pending: { ...x.pending, verdict: verdict ?? null } } : x))
  await update($, last, () => ({ call: p.call, cut: p.cut, effort: p.effort, verdict }))
  return verdict
}

async function rebut($: EngineInterface, gist: string): Promise<string> {
  const prior = await read($, last)
  if (prior?.cut === undefined) return 'astra-advisor: no fork point before an advisor() call.'
  const out = await fork($, prior.cut, prior.effort, rebutPrompt(prior.verdict, gist))
  return out ?? `astra-advisor: ${MODEL} returned no verdict.`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'rebut',
      description: `One reconciliation round with the second advisor (${MODEL}) on a substantive disagreement between its verdict and your advisor() reply. Returns its concessions, the points it holds, and the check that decides each open point.`,
      inputSchema: {
        type: 'object',
        properties: { gist: { type: 'string', description: 'The advisor() reply gist + the open question.' } },
        required: ['gist'],
      },
    })
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await update($, track, x => ({ ...x, pending: undefined }))
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) await update($, track, x => ({ ...x, step: x.step + 1, effort: effortOf(e.effort) }))
    return yield* next(e)
  })

  on('session.append', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    const { content } = e.message
    const used = advisorBlock(content, 'use')
    const done = advisorBlock(content, 'result')
    if (used !== undefined) await update($, track, x => ({ ...x, cutAtCall: x.lastRow }))
    else if (done !== undefined) await update($, track, x => ({ ...x, pending: { call: done, cut: x.cutAtCall, effort: x.effort } }))
    else if (!isThinkingOnly(content)) await update($, track, x => ({ ...x, lastRow: e.uuid }))
    return next(e)
  })

  // Registered ahead of the rebut tool: a rebut issued before the ping first gets the newer call's review.
  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    const seen = (await read($, track)).pending
    if (seen === undefined) return next(e)
    const isPing = e.tool === 'Bash' && e.command.trim() === PING
    const { won, pending: p, step } = seen.claimStep === undefined ? await claim($) : { won: false, pending: seen, step: (await read($, track)).step }
    if (p === undefined) return next(e)
    if (!won) {
      // The claiming batch stays held while its review runs or once it gave a verdict;
      // a ping sibling, a failed review and every later step pass.
      if (step !== p.claimStep || isPing || p.verdict === null) return next(e)
      return { deny: HOLD }
    }
    const verdict = await review($, p)
    if (verdict !== undefined && !isPing) return { deny: verdictOnCall(verdict) }
    const note = verdict === undefined ? FAILED : verdictOnPing(verdict)
    const r = await next(e)
    if (r.deny !== undefined) return { deny: `${r.deny}\n\n${note}` }
    return { ...r, context: [...(r.context ?? []), note] }
  })

  on('tool.call', { tool: 'mcp__astra-advisor__rebut' }, async ($, e) => {
    const gist = typeof e.gist === 'string' ? e.gist.trim() : ''
    if (e.agentId !== undefined) return { result: 'astra-advisor: the second advisor serves the main loop alone.' }
    return { result: gist ? await rebut($, gist) : 'astra-advisor: give `gist`, the advisor() reply gist + the open question.' }
  })

  on('classic.Stop', async ($, e, next) => {
    const seen = (await read($, track)).pending
    if (e.agent_id !== undefined || seen === undefined || seen.claimStep !== undefined) return next(e)
    const { won, pending: p } = await claim($)
    if (!won || p === undefined) return next(e)
    const verdict = await review($, p)
    if (verdict !== undefined) return { block: verdictOnStop(verdict) }
    $.ui.toast(STOP_FAILED)
    return next(e)
  })
}
