import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelUsage, Register, SessionCompactResult } from 'claude-code'

// cache-keepalive decides at its mark (claude/cache-keepalive/README.md); this mod reports quiet + working + context
// size + runs the compaction.
const POLL_MS = 30_000
const KEEPER = 'http://127.0.0.1:8318'
// Quiet = no turn running + no question open (a plugin's $.ui.ask runs outside turns) + no agent at work + the last
// main Stop left nothing in flight.
// Working = a turn running + no question open ⇒ statusline `in progress`; a question wait = touches.
const running = new Set<string>()
// Open main-thread questions: the dialog hides the statusline ⇒ the touch count rides a notice under it.
const asking = new Set<string>()
// In flight = turn-email's rule (CC's busy/shell status). Stop lists an idle teammate `running` ⇒ agents count by
// `$.agent.list()` status per poll; idle teammate = waits on MAIN ⇒ quiet.
const BUSY_TASKS = new Set(['shell', 'subagent', 'workflow', 'cloud session'])
const BUSY_AGENTS = new Set(['pending', 'running', 'waiting'])
// Host state ⇒ survives a reload (no Stop re-runs); before the process's first main Stop = in flight (no stored
// request to compact yet).
const background = atom({ plugin: 'idle-compact', key: 'background' } as const, true)
let compacting = false
let interactive = false
// Context size = the engine's input side + the last main step's output = the statusline gauge (context-alert's rule);
// host state ⇒ a reload keeps the output.
const output = atom({ plugin: 'idle-compact', key: 'output' } as const, 0)
// The model's own call ahead of a wait: a poll or foreground wait re-reads the whole context per check. Compaction
// rejects while a turn runs ⇒ the call's turn end compacts; the notice of the work it started wakes the session.
// What the summary keeps, '' = none; host state ⇒ a reload between the call + its turn end keeps it.
const pending = atom({ plugin: 'idle-compact', key: 'pending' } as const, '')
const TOOL = 'compact_before_wait'
const SPEC = {
  name: TOOL,
  description:
    'Compacts this session the moment your current turn ends. Call it whenever you expect to wait a while: a long build, test, benchmark or mutation run, a pool or CI job, a teammate\'s report. First start that work so its end notifies you (Bash run_in_background, Monitor, a background agent or teammate), then call this, then end your turn: the notification wakes the compacted session. Polling or a foreground wait instead re-reads the whole context on every check. Main session only.',
  inputSchema: {
    type: 'object',
    properties: {
      keep: {
        type: 'string',
        description: 'What the summary must keep verbatim: the work in flight (task or agent ids, log + output paths), what its result decides, your next action once it arrives.',
      },
    },
    required: ['keep'],
  },
  isDeferred: false as const,
}

type Reply = { compact?: unknown; touches?: unknown; limit?: unknown; state?: unknown }

function notice(r: Reply | undefined): string | undefined {
  if (r?.state === 'done') return 'stopped'
  if (r?.state !== 'armed' || typeof r.touches !== 'number' || typeof r.limit !== 'number') return undefined
  return `touches ${r.touches}/${r.limit}`
}

async function report($: EngineInterface, path: string, body: object): Promise<unknown> {
  const url = `${(await $.env.get('CACHE_KEEPALIVE_URL')) || KEEPER}/_keepalive/${path}`
  const r = await $.http.fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return r.ok ? JSON.parse(r.text) : undefined
}

// Absent before the live window's first response (fresh or just compacted) ⇒ the keeper treats the size as unknown.
async function size($: EngineInterface): Promise<number | undefined> {
  const { context } = await $.session.usage()
  return context.tokens === undefined ? undefined : context.tokens + (await read($, output))
}

async function compact($: EngineInterface, instructions?: string): Promise<{ reason: string; usage?: ModelUsage }> {
  compacting = true
  try {
    const r = await $.session.compact(instructions === undefined ? undefined : { instructions })
    return r.skip === undefined ? { reason: '', usage: r.usage } : { reason: r.skip }
  } catch (err) {
    return { reason: String(err) }
  } finally {
    compacting = false
  }
}

async function poll($: EngineInterface): Promise<void> {
  const session = await $.session.id()
  const agents = (await $.agent.list()).some(a => BUSY_AGENTS.has(a.status))
  const quiet = running.size === 0 && asking.size === 0 && !agents && !(await read($, background)) && !compacting
  const working = running.size > 0 && asking.size === 0
  const tokens = await size($)
  const asked = (await report($, 'poll', { session, quiet, working, tokens })) as Reply | undefined
  const text = notice(asked)
  for (const id of asking) $.ui.notice(id, text) // refusal (call resolved, another plugin's $.tool.call) = engine-logged drop
  if (asked?.compact !== true) return
  const { reason, usage } = await compact($)
  await report($, 'compacted', { session, ok: !reason, reason, usage })
}

// A compaction the keeper did not ask for leaves its stored request = the pre-compaction prefix ⇒ a touch would re-read
// a dead cache. `compacting` first ⇒ the keeper drops it once `compacted` reports success; a newer stored request
// in between stays armed. Reports ride beside the compaction: an unreachable keeper never holds it up.
async function tell($: EngineInterface, run: () => Promise<{ reason: string; usage?: ModelUsage }>): Promise<void> {
  const session = await $.session.id()
  const told = report($, 'compacting', { session }).catch(() => undefined)
  const { reason, usage } = await run()
  void told.then(() => report($, 'compacted', { session, ok: !reason, reason, usage })).catch(() => {})
}

// State changes report at once: the statusline renders on its own clock, between 30-s polls.
function pollNow($: EngineInterface): void {
  if (interactive) void poll($).catch(() => {})
}

const instructions = (keep: string) =>
  `The session is waiting on work it started; that work's notification wakes it. Keep verbatim: ${keep}`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // A headless turn's end = the run's end ⇒ nothing to wait in.
    if (e.isInteractive) await $.tool.register(SPEC).catch(() => {})
    const r = await next(e)
    interactive = e.isInteractive
    if (interactive) $.clock.every(POLL_MS, () => void poll($).catch(() => {}))
    return r
  })

  on('tool.call', { tool: new RegExp(`^mcp__idle-compact__${TOOL}$`) }, async ($, e) => {
    if (e.agentId !== undefined) return { deny: `${TOOL} compacts the main session only; a teammate's context compacts on its own.` }
    const keep = (e as { keep?: unknown }).keep
    if (typeof keep !== 'string' || !keep.trim()) return { deny: 'keep = what the summary must hold: the work in flight, what its result decides, your next action.' }
    await update($, pending, () => keep.trim())
    const tokens = await size($)
    const now = tokens === undefined ? '' : ` (context now ${Math.trunc(tokens / 1000)}K)`
    return { result: `Compaction set for this turn's end${now}. End your turn now: a further tool call holds it until the turn ends. The work you started wakes the session.` }
  })

  // Typed /compact, CC's threshold, another plugin's call; this mod's own calls skip its own hook.
  on('session.compact', async ($, e, next) => {
    if (!interactive || e.trigger === 'precompute' || e.agentId !== undefined) return next(e)
    let r: SessionCompactResult | undefined
    let failure: unknown
    await tell($, async () => {
      compacting = true
      try {
        r = await next(e)
        return r.skip === undefined ? { reason: '', usage: r.usage } : { reason: r.skip }
      } catch (err) {
        failure = err
        return { reason: String(err) }
      } finally {
        compacting = false
      }
    })
    if (r === undefined) throw failure
    return r
  })

  on('turn.start', ($, e, next) => {
    running.add(e.turnId)
    pollNow($)
    return next(e)
  })

  // CC reloads a mod between main turns ⇒ a teammate turn in flight missed its turn.start; its next step brings it back.
  on('turn.step', async function* ($, e, next) {
    if (!running.has(e.turnId)) {
      running.add(e.turnId)
      pollNow($)
    }
    const r = yield* next(e)
    if (e.agentId === undefined && r.usage) {
      const out = r.usage.output_tokens
      await update($, output, () => out)
    }
    return r
  })

  on('turn.complete', async ($, e, next) => {
    running.delete(e.turnId)
    pollNow($)
    const r = await next(e)
    const keep = e.agentId === undefined ? await read($, pending) : ''
    if (keep) {
      await update($, pending, () => '')
      // An interrupt or an API error ends the turn early: the person or the failure needs the context first.
      if (e.reason === 'answer') void tell($, () => compact($, instructions(keep))).catch(() => {}).finally(() => pollNow($))
    }
    return r
  })

  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)
    asking.add(e.tool_use_id)
    pollNow($)
    try {
      return await next(e)
    } finally {
      asking.delete(e.tool_use_id)
      pollNow($)
    }
  })

  on('classic.Stop', async ($, e, next) => {
    if (e.agent_id === undefined) {
      const busy = !!e.session_crons?.length || !!e.background_tasks?.some(t => BUSY_TASKS.has(t.type))
      await update($, background, () => busy)
    }
    return next(e)
  })
}
