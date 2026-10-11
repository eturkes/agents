import type { EngineInterface, ModelUsage, Register } from 'claude-code'

// cache-keepalive decides at its mark (claude/cache-keepalive/README.md); this mod reports quiet + runs the compaction.
const POLL_MS = 30_000
const KEEPER = 'http://127.0.0.1:8318'
// Quiet = no turn running (an AskUserQuestion wait included) + the last main Stop left no background task or cron.
const running = new Set<string>()
let background = false
let compacting = false

async function report($: EngineInterface, path: string, body: object): Promise<unknown> {
  const url = `${(await $.env.get('CACHE_KEEPALIVE_URL')) || KEEPER}/_keepalive/${path}`
  const r = await $.http.fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return r.ok ? JSON.parse(r.text) : undefined
}

async function poll($: EngineInterface): Promise<void> {
  const session = await $.session.id()
  const quiet = running.size === 0 && !background && !compacting
  const asked = (await report($, 'poll', { session, quiet })) as { compact?: unknown } | undefined
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

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    if (e.isInteractive) $.clock.every(POLL_MS, () => void poll($).catch(() => {}))
    return r
  })

  on('turn.start', (_$, e, next) => {
    running.add(e.turnId)
    return next(e)
  })

  on('turn.complete', (_$, e, next) => {
    running.delete(e.turnId)
    return next(e)
  })

  on('classic.Stop', (_$, e, next) => {
    if (e.agent_id === undefined) background = !!(e.background_tasks?.length || e.session_crons?.length)
    return next(e)
  })
}
