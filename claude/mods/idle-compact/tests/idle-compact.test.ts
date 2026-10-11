import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

type World = { polls: { session: string; quiet: boolean }[]; reports: unknown[]; compact: boolean; compactions: number; skip?: string; down: boolean }

function world(on: On): World & { advance: (ms: number) => Promise<void> } {
  const w: World = { polls: [], reports: [], compact: false, compactions: 0, down: false }
  const clock = mock.clock(on, { now: Date.UTC(2026, 9, 11, 9, 0) })
  mock.env(on, { CACHE_KEEPALIVE_URL: 'http://keeper' })
  on('session.id', () => ({ value: 's1' }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('classic.Stop', () => ({}))
  on('http.fetch', (_$, e) => {
    if (w.down) throw new Error('connection refused')
    const body = JSON.parse(e.init?.body ?? '{}')
    let reply = {}
    if (e.url === 'http://keeper/_keepalive/poll') {
      w.polls.push(body)
      reply = { compact: w.compact }
      w.compact = false
    } else w.reports.push({ url: e.url, ...body })
    return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify(reply) } }
  })
  on('session.compact', () => {
    w.compactions++
    const usage = { input_tokens: 5, cache_creation_input_tokens: 40, cache_read_input_tokens: 900, output_tokens: 300, model: 'claude-opus-5-5' }
    return (w.skip ? { skip: w.skip } : { messages: [{ role: 'user', text: 'summary', toolUses: [] }], usage }) as never
  })
  return Object.assign(w, { advance: (ms: number) => clock.advance(ms) })
}

const start = ($: Engine, isInteractive = true) => $.session.start({ cwd: '/w', surface: null, isInteractive })
const stop = ($: Engine, background_tasks: unknown[] = [], session_crons: unknown[] = []) =>
  $.classic.Stop({ stop_hook_active: false, cwd: '/w', transcript_path: '/t', background_tasks, session_crons } as never)
const complete = ($: Engine, turnId: string) =>
  $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId, reason: 'answer' } as never)

test('a quiet session is compacted once the keeper asks, and the result reported', async ($, on) => {
  const w = world(on)
  await start($)
  await w.advance(30_000)
  expect(w.polls).toEqual([{ session: 's1', quiet: true }])
  expect(w.compactions).toBe(0)
  w.compact = true
  await w.advance(30_000)
  expect(w.compactions).toBe(1)
  expect(w.reports).toMatchObject([{ url: 'http://keeper/_keepalive/compacted', session: 's1', ok: true, reason: '', usage: { cache_read_input_tokens: 900 } }])
})

test('a running turn, an open question, background work or a cron reports busy', async ($, on) => {
  const w = world(on)
  await start($)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await w.advance(30_000)
  await complete($, 't1')
  await stop($, [{ id: 'a1', type: 'subagent', status: 'running', description: 'reviewer-1' }])
  await w.advance(30_000)
  await stop($, [], [{ id: 'c1', schedule: '*/5 * * * *', recurring: true, prompt: 'check' }])
  await w.advance(30_000)
  await stop($)
  await w.advance(30_000)
  expect(w.polls.map(p => p.quiet)).toEqual([false, false, false, true])
})

test('a vetoed compaction is reported as failed', async ($, on) => {
  const w = world(on)
  w.skip = 'vetoed by a hook'
  w.compact = true
  await start($)
  await w.advance(30_000)
  expect(w.reports).toEqual([{ url: 'http://keeper/_keepalive/compacted', session: 's1', ok: false, reason: 'vetoed by a hook' }])
})

test('polling outlives an unreachable keeper', async ($, on) => {
  const w = world(on)
  w.down = true
  await start($)
  await w.advance(30_000)
  w.down = false
  await w.advance(30_000)
  expect(w.polls).toHaveLength(1)
})

test('a headless session never polls', async ($, on) => {
  const w = world(on)
  await start($, false)
  await w.advance(60_000)
  expect(w.polls).toHaveLength(0)
})
