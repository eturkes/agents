import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Effort, Lane } from './lanes'
import { DEFAULT_MODEL, EARLY_PHASE, LANES, NUDGE, NUDGED_MODEL, REFUSED, ROLE_LANES, describeLanes, laneEffort, phaseLine, refusal } from './lanes'

// Agent ids routed to terra whose first stop has not been sent back; kept across mod reloads + resumes.
const pending = atom({ plugin: 'agent-lanes', key: 'nudge' } as const, {})
// Teammates run every request at the session's effort, Agent `effort` ignored, + a resumed turn drops it ⇒ each
// agent's call effort is pinned per agent id + set on its requests (turn.step); this mod loads before agent-flow,
// whose agent line then reads the pinned level.
const efforts = atom({ plugin: 'agent-lanes', key: 'efforts' } as const, {})
// MAIN's effort, as its own requests carry it; each lane's effort shifts from it.
const main = atom({ plugin: 'agent-lanes', key: 'main' } as const, '')
/** Agent call → its effort, until agent.spawn names the agent (same tool_use_id). */
const callEfforts = new Map<string, string>()

/** The session's project in PROTOTYPE or ITERATE; no readable spec → false (routing stays GPT either way). */
async function earlyPhase($: EngineInterface): Promise<boolean> {
  try {
    const spec = `${await $.session.cwd()}/.agent/spec.md`
    return (await $.fs.exists(spec)) && EARLY_PHASE.test(phaseLine(String(await $.fs.read(spec))) ?? '')
  } catch {
    return false
  }
}

/** The lane a call's alias names, else its role's; undefined = the default lane, which a lateOnly lane takes early. */
async function routedLane($: EngineInterface, alias: string | undefined, role: string | undefined): Promise<Lane | undefined> {
  const named = alias ?? (role === undefined ? undefined : ROLE_LANES[role])
  const lane = typeof named === 'string' ? LANES[named] : named
  return lane?.lateOnly && (await earlyPhase($)) ? undefined : lane
}

/** A GPT id passes as given (a workflow's or plugin's pick); any other model the lanes don't name is refused. */
const isGpt = (model: string) => model.startsWith('gpt-')

export const register: Register = on => {
  on('tool.describe', { tool: 'Agent' }, (_$, e, next) => next({ ...e, description: `${e.description}\n\n${describeLanes()}` }))

  // The Agent schema built with SUBAGENT_MODEL_FORCE off carries `model`; the generated types may predate it.
  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    if (e.tool !== 'Agent' || e.subagent_type === 'fork') return next(e)
    const alias = (e as { model?: string }).model
    if (alias === REFUSED) return { deny: refusal(alias) }
    const lane = await routedLane($, alias, e.subagent_type)
    const effort = e.effort ?? laneEffort(lane, await read($, main))
    if (effort !== undefined && e.tool_use_id !== undefined) callEfforts.set(e.tool_use_id, effort)
    return effort !== e.effort ? next({ ...e, effort }) : next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    if (e.fork || e.resume !== undefined) return next(e)
    if (e.model !== undefined && LANES[e.model] === undefined && !isGpt(e.model)) return { deny: refusal(e.model) }
    const pin = (await $.env.get('CLAUDE_CODE_SUBAGENT_MODEL'))?.trim()
    const model = e.model !== undefined && isGpt(e.model) ? e.model : (await routedLane($, e.model, e.subagentType))?.model ?? (pin || DEFAULT_MODEL)
    const r = await next({ ...e, model })
    const id = r.agentId
    const effort = callEfforts.get(e.tool_use_id)
    callEfforts.delete(e.tool_use_id)
    if (id !== undefined && effort !== undefined) await update($, efforts, m => ({ ...m, [id]: effort }))
    if (id !== undefined && model === NUDGED_MODEL) await update($, pending, m => ({ ...m, [id]: true as const }))
    return r
  }).catch((_$, e, next) => (next.called ? next(e) : { deny: 'agent-lanes failed before routing ⇒ spawn refused (it would run unrouted); retry the call.' }))
  // tool.call + SubagentStop fail open: agent.spawn still routes, and a missed nudge costs one stop check.

  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined && typeof e.effort === 'string' && (await read($, main)) !== e.effort) {
      const level = e.effort
      await update($, main, () => level)
    }
    const want = e.agentId === undefined ? undefined : (await read($, efforts))[e.agentId]
    return yield* next(want !== undefined && e.effort !== want ? { ...e, effort: want as Effort } : e)
  })

  on('classic.SubagentStop', async ($, e, next) => {
    const r = await next(e)
    if (e.stop_hook_active || r.block !== undefined || !(await read($, pending))[e.agent_id]) return r
    await update($, pending, ({ [e.agent_id]: _, ...rest }) => rest)
    return { ...r, block: NUDGE }
  })
}
