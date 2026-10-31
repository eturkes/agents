import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

type Poll = { session: string; quiet: boolean; working: boolean }
type World = {
  polls: Poll[]; reports: unknown[]; notices: { tool_use_id: string; text: string | undefined }[]
  compact: boolean; compactions: number; skip?: string; down: boolean; entry: object; gate?: Promise<void>
}

function world(on: On): World & { advance: (ms: number) => Promise<void> } {
  const w: World = { polls: [], reports: [], notices: [], compact: false, compactions: 0, down: false, entry: { touches: 0, limit: 19, state: 'armed' } }
  const clock = mock.clock(on, { now: Date.UTC(2026, 9, 11, 9, 0) })
  mock.env(on, { CACHE_KEEPALIVE_URL: 'http://keeper' })
  on('session.id', () => ({ value: 's1' }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.step', async function* (_$, e) {
    const usage = { input_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 1, model: e.model }
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage }
  })
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('classic.Stop', () => ({}))
  on('http.fetch', (_$, e) => {
    if (w.down) throw new Error('connection refused')
    const body = JSON.parse(e.init?.body ?? '{}')
    let reply = {}
    if (e.url === 'http://keeper/_keepalive/poll') {
      w.polls.push(body)
      reply = { compact: w.compact, ...w.entry }
      w.compact = false
    } else w.reports.push({ url: e.url, ...body })
    return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify(reply) } }
  })
  on('session.compact', () => {
    w.compactions++
    const usage = { input_tokens: 5, cache_creation_input_tokens: 40, cache_read_input_tokens: 900, output_tokens: 300, model: 'claude-opus-5-5' }
    return (w.skip ? { skip: w.skip } : { messages: [{ role: 'user', text: 'summary', toolUses: [] }], usage }) as never
  })
  on('ui.notice', (_$, e) => (w.notices.push(e), { value: undefined }))
  on('tool.call', async () => {
    await w.gate
    return { result: { answers: {} }, text: 'answered' }
  })
  return Object.assign(w, { advance: (ms: number) => clock.advance(ms) })
}

const start = ($: Engine, isInteractive = true) => $.session.start({ cwd: '/w', surface: null, isInteractive })
const stop = ($: Engine, background_tasks: unknown[] = [], session_crons: unknown[] = []) =>
  $.classic.Stop({ stop_hook_active: false, cwd: '/w', transcript_path: '/t', background_tasks, session_crons } as never)
const complete = ($: Engine, turnId: string) =>
  $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId, reason: 'answer' } as never)
const step = async ($: Engine, turnId: string, agentId?: string) => {
  for await (const c of $.turn.step({ turnId, index: 1, model: 'claude-opus-5-5', messageCount: 3, agentId } as never)) void c
}
const flags = (w: World) => w.polls.map(p => `${p.quiet ? 'quiet' : 'busy'}${p.working ? '+working' : ''}`)
function ask($: Engine, w: World): () => Promise<unknown> {
  let release = () => {}
  w.gate = new Promise<void>(resolve => (release = resolve))
  const asked = $.tool.call({ tool: 'AskUserQuestion', tool_use_id: 'q1', questions: [] } as never)
  return () => (release(), asked)
}

test('a quiet session is compacted once the keeper asks, and the result reported', async ($, on) => {
  const w = world(on)
  await start($)
  await w.advance(30_000)
  expect(w.polls).toEqual([{ session: 's1', quiet: true, working: false }])
  expect(w.compactions).toBe(0)
  w.compact = true
  await w.advance(30_000)
  expect(w.compactions).toBe(1)
  expect(w.reports).toMatchObject([{ url: 'http://keeper/_keepalive/compacted', session: 's1', ok: true, reason: '', usage: { cache_read_input_tokens: 900 } }])
})

test('a running turn, background work or a cron reports busy; a turn alone reports working, at its start + end', async ($, on) => {
  const w = world(on)
  await start($)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await w.advance(30_000)
  await stop($, [{ id: 'a1', type: 'subagent', status: 'running', description: 'reviewer-1' }])
  await complete($, 't1')
  await w.advance(30_000)
  await stop($, [], [{ id: 'c1', schedule: '*/5 * * * *', recurring: true, prompt: 'check' }])
  await w.advance(30_000)
  await stop($)
  await w.advance(30_000)
  expect(flags(w)).toEqual(['busy+working', 'busy+working', 'busy', 'busy', 'busy', 'quiet'])
})

test('an open question = busy, not working, with the touch count under its dialog', async ($, on) => {
  const w = world(on)
  await start($)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await w.advance(1) // turn.start's poll replies before the question opens
  w.entry = { touches: 2, limit: 19, state: 'armed' }
  const answer = ask($, w)
  await w.advance(30_000)
  w.entry = { touches: 3, limit: 19, state: 'armed' }
  await w.advance(30_000)
  w.entry = { touches: 19, limit: 19, state: 'done' }
  await w.advance(30_000)
  await answer()
  await w.advance(30_000)
  expect(flags(w)).toEqual(['busy+working', 'busy', 'busy', 'busy', 'busy', 'busy+working', 'busy+working'])
  expect(w.notices).toEqual([
    { tool_use_id: 'q1', text: 'cache touches 2/19' },
    { tool_use_id: 'q1', text: 'cache touches 2/19' },
    { tool_use_id: 'q1', text: 'cache touches 3/19' },
    { tool_use_id: 'q1', text: 'cache keepalive stopped' },
  ])
})

test('a reply without an armed entry clears the dialog line', async ($, on) => {
  const w = world(on)
  await start($)
  w.entry = {}
  const answer = ask($, w)
  w.entry = { touches: 0, limit: 19, state: 'compacted' }
  await w.advance(30_000)
  await answer()
  await w.advance(1)
  expect(w.notices).toEqual([{ tool_use_id: 'q1', text: undefined }, { tool_use_id: 'q1', text: undefined }])
  expect(flags(w)).toEqual(['busy', 'busy', 'quiet']) // a question outside any turn (a plugin's $.ui.ask) = busy
})

test('a teammate turn in flight at a reload returns at its next step', async ($, on) => {
  const w = world(on)
  await start($)
  await w.advance(30_000)
  await step($, 'a1', 'teammate-1')
  await w.advance(30_000)
  await complete($, 'a1')
  await w.advance(30_000)
  expect(flags(w)).toEqual(['quiet', 'busy+working', 'busy+working', 'quiet', 'quiet'])
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
  await $.turn.start({ text: 'go', turnId: 't1' })
  await ask($, w)()
  await complete($, 't1')
  await w.advance(60_000)
  expect(w.polls).toHaveLength(0)
  expect(w.notices).toHaveLength(0)
})
