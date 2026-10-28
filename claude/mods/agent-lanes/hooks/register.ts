import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Lane } from './lanes'
import { DEFAULT_MODEL, LANES, NUDGE, NUDGED_MODEL, REFUSED, ROLE_LANES, describeLanes, refusal } from './lanes'

// Agent ids routed to terra whose first stop has not been sent back; kept across mod reloads + resumes.
const pending = atom({ plugin: 'agent-lanes', key: 'nudge' } as const, {})

/** The lane a call's alias names, else its role's; undefined = the default lane. */
function laneOf(alias: string | undefined, role: string | undefined): Lane | undefined {
  const name = alias ?? (role === undefined ? undefined : ROLE_LANES[role])
  return name === undefined ? undefined : LANES[name]
}

/** A GPT id passes as given (a workflow's or plugin's pick); any other model the lanes don't name is refused. */
const isGpt = (model: string) => model.startsWith('gpt-')

export const register: Register = on => {
  on('tool.describe', { tool: 'Agent' }, (_$, e, next) => next({ ...e, description: `${e.description}\n\n${describeLanes()}` }))

  // The Agent schema built with SUBAGENT_MODEL_FORCE off carries `model`; the generated types may predate it.
  on('tool.call', { tool: 'Agent' }, (_$, e, next) => {
    if (e.tool !== 'Agent' || e.subagent_type === 'fork') return next(e)
    const alias = (e as { model?: string }).model
    if (alias === REFUSED) return { deny: refusal(alias) }
    const lane = laneOf(alias, e.subagent_type)
    return lane?.effort !== undefined && e.effort === undefined ? next({ ...e, effort: lane.effort }) : next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    if (e.fork || e.resume !== undefined) return next(e)
    if (e.model !== undefined && LANES[e.model] === undefined && !isGpt(e.model)) return { deny: refusal(e.model) }
    const pin = (await $.env.get('CLAUDE_CODE_SUBAGENT_MODEL'))?.trim()
    const model = e.model !== undefined && isGpt(e.model) ? e.model : laneOf(e.model, e.subagentType)?.model ?? (pin || DEFAULT_MODEL)
    const r = await next({ ...e, model })
    const id = r.agentId
    if (id !== undefined && model === NUDGED_MODEL) await update($, pending, m => ({ ...m, [id]: true as const }))
    return r
  }).catch((_$, e, next) => (next.called ? next(e) : { deny: 'agent-lanes failed before routing ⇒ spawn refused (it would run unrouted); retry the call.' }))
  // tool.call + SubagentStop fail open: agent.spawn still routes, and a missed nudge costs one stop check.

  on('classic.SubagentStop', async ($, e, next) => {
    const r = await next(e)
    if (e.stop_hook_active || r.block !== undefined || !(await read($, pending))[e.agent_id]) return r
    await update($, pending, ({ [e.agent_id]: _, ...rest }) => rest)
    return { ...r, block: NUDGE }
  })
}
