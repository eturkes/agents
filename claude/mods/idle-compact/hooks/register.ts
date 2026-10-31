import type { EngineInterface, ModelUsage, Register } from 'claude-code'

// cache-keepalive decides at its mark (claude/cache-keepalive/README.md); this mod reports quiet + working + runs the compaction.
const POLL_MS = 30_000
const KEEPER = 'http://127.0.0.1:8318'
// Quiet = no turn running (an AskUserQuestion wait included) + the last main Stop left no background task or cron.
// Working = a turn running + no question open ⇒ statusline `working`; a question wait = touches.
const running = new Set<string>()
// Open main-thread questions: the dialog hides the statusline ⇒ the touch count rides a notice under it.
const asking = new Set<string>()
let background = false
let compacting = false
let interactive = false

type Reply = { compact?: unknown; touches?: unknown; limit?: unknown; state?: unknown }

function notice(r: Reply | undefined): string | undefined {
  if (r?.state === 'done') return 'cache keepalive stopped'
  if (r?.state !== 'armed' || typeof r.touches !== 'number' || typeof r.limit !== 'number') return undefined
  return `cache touches ${r.touches}/${r.limit}`
}

async function report($: EngineInterface, path: string, body: object): Promise<unknown> {
  const url = `${(await $.env.get('CACHE_KEEPALIVE_URL')) || KEEPER}/_keepalive/${path}`
  const r = await $.http.fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return r.ok ? JSON.parse(r.text) : undefined
}

async function poll($: EngineInterface): Promise<void> {
  const session = await $.session.id()
  const quiet = running.size === 0 && asking.size === 0 && !background && !compacting
  const working = running.size > 0 && asking.size === 0
  const asked = (await report($, 'poll', { session, quiet, working })) as Reply | undefined
  const text = notice(asked)
  for (const id of asking) $.ui.notice(id, text) // refusal (call resolved, another plugin's $.tool.call) = engine-logged drop
  if (asked?.compact !== true) return
  let reason = ''
  let usage: ModelUsage | undefined
  compacting = true
  try {
    const r = await $.session.compact()
    if (r.skip === undefined) usage = r.usage
    else reason = r.skip
  } catch (err) {
    reason = String(err)
  } finally {
    compacting = false
  }
  await report($, 'compacted', { session, ok: !reason, reason, usage })
}

// State changes report at once: the statusline renders on its own clock, between 30-s polls.
function pollNow($: EngineInterface): void {
  if (interactive) void poll($).catch(() => {})
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    interactive = e.isInteractive
    if (interactive) $.clock.every(POLL_MS, () => void poll($).catch(() => {}))
    return r
  })

  on('turn.start', ($, e, next) => {
    running.add(e.turnId)
    pollNow($)
    return next(e)
  })

  // A reload lands between main turns ("it reloads when your turn ends") ⇒ a teammate turn in flight missed its
  // turn.start; its next step brings it back.
  on('turn.step', async function* ($, e, next) {
    if (!running.has(e.turnId)) {
      running.add(e.turnId)
      pollNow($)
    }
    return yield* next(e)
  })

  on('turn.complete', ($, e, next) => {
    running.delete(e.turnId)
    pollNow($)
    return next(e)
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

  on('classic.Stop', (_$, e, next) => {
    if (e.agent_id === undefined) background = !!(e.background_tasks?.length || e.session_crons?.length)
    return next(e)
  })
}
