import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelUsage, Register } from 'claude-code'

import type { ContextAlertTier } from '../types'
import { assess, claimable } from './assess'

// Keys `<session>/<loop>`: a /clear starts fresh claims. Each win is saved per session in
// $.store ⇒ a resumed process stays quiet on tiers it already announced.
const claims = atom({ plugin: 'context-alert', key: 'claims' } as const, {})
const KEEP_MS = 7 * 86_400_000
// Last request per loop. MAIN's input side comes from the engine: an advisor turn's
// step usage sums every executor pass, the engine's figure = the last pass alone.
const agentUsed = new Map<string, number>()
let mainOutput = 0
// A tool runs while its step still streams: usage lands at the stream's end, so a fast
// tool waits for it. The next request needs that end anyway ⇒ the wait costs no turn time.
const streaming = new Map<string, Promise<void>>()
const STEP_WAIT_MS = 5_000
// Saves run one at a time, each from the latest host state: a slow save never lands a stale snapshot.
let saving: Promise<void> = Promise.resolve()

function total(u: ModelUsage): number {
  return u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens + u.output_tokens
}

function tierOf(v: unknown): ContextAlertTier | undefined {
  return v === 'notice' || v === 'final' ? v : undefined
}

async function claim($: EngineInterface, loop: string, tier: ContextAlertTier): Promise<boolean> {
  const session = await $.session.id()
  const key = `${session}/${loop}`
  let had = (await read($, claims))[key]
  if (had === undefined) {
    const saved = (await $.store.get(`claims:${session}`)) as { claims?: Record<string, unknown> } | undefined
    had = tierOf(saved?.claims?.[loop])
  }
  let won = false
  await update($, claims, m => {
    const prior = m[key] ?? had
    won = claimable(prior, tier)
    const kept = won ? tier : prior
    return kept === undefined || m[key] === kept ? m : { ...m, [key]: kept }
  })
  if (won) {
    const save = saving.then(async () => {
      const prefix = `${session}/`
      const all = await read($, claims)
      const mine = Object.fromEntries(Object.entries(all).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]))
      await $.store.set(`claims:${session}`, { at: await $.clock.now(), claims: mine })
    })
    saving = save.catch(() => {})
    await save
  }
  return won
}

async function alert($: EngineInterface, agentId: string | undefined, signal: AbortSignal): Promise<string | undefined> {
  const step = streaming.get(agentId ?? 'main')
  if (step && !signal.aborted) {
    const stop = new AbortController()
    const quit = () => stop.abort()
    signal.addEventListener('abort', quit, { once: true })
    await Promise.race([step, $.clock.sleep(STEP_WAIT_MS, { signal: stop.signal }).catch(() => {})])
    signal.removeEventListener('abort', quit)
    stop.abort()
  }
  if (signal.aborted) return undefined
  let used: number | undefined
  let window: number
  if (agentId === undefined) {
    const { context } = await $.session.usage()
    used = context.tokens === undefined ? undefined : context.tokens + mainOutput
    window = context.window
  } else {
    used = agentUsed.get(agentId)
    window = Number(await $.env.get('CLAUDE_CODE_MAX_CONTEXT_TOKENS')) || 200_000
  }
  if (used === undefined) return undefined
  const acw = Number(await $.env.get('CLAUDE_CODE_AUTO_COMPACT_WINDOW')) || 0
  const found = assess(used, window, acw, agentId !== undefined)
  if (!found) return undefined
  return (await claim($, agentId ?? 'main', found.tier)) ? found.text : undefined
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const now = await $.clock.now()
    for (const key of await $.store.keys()) {
      if (!key.startsWith('claims:')) continue
      const saved = (await $.store.get(key)) as { at?: unknown } | undefined
      if (typeof saved?.at !== 'number' || now - saved.at > KEEP_MS) await $.store.delete(key)
    }
    return next(e)
  })

  on('turn.step', async function* (_$, e, next) {
    const loop = e.agentId ?? 'main'
    let done = () => {}
    streaming.set(loop, new Promise<void>(resolve => (done = resolve)))
    try {
      const r = yield* next(e)
      if (r.usage) {
        if (e.agentId === undefined) mainOutput = r.usage.output_tokens
        else agentUsed.set(e.agentId, total(r.usage))
      }
      return r
    } finally {
      streaming.delete(loop)
      done()
    }
  })

  on('tool.call', async ($, e, next) => {
    const r = await next(e)
    if (r.deny !== undefined) return r
    const text = await alert($, e.agentId, next.signal)
    return text === undefined ? r : { ...r, context: [...(r.context ?? []), text] }
  })
}
