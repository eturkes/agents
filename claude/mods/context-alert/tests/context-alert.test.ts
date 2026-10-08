import { expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock } from 'claude-code/testing'
import type { On } from 'claude-code'

import { assess } from '../hooks/assess'

const NOTICE_MAIN = 'Checkpoint ahead of compaction: land the current unit on a commit with its checklist current (.agent/spec.md Tasks or .scratch/tasks.md), then continue.'
const FINAL_MAIN = 'Compaction is imminent: commit now with the checklist current; after compaction, reorient from the checklist + git log and continue.'
const NOTICE_AGENT = 'Hand off: bring your deliverable current on disk, then return its path, completion status + next action.'
const FINAL_AGENT = 'Compaction is imminent: save progress to your deliverable now, then return its path, completion status + next action.'

type World = { tokens?: number; window: number; output?: number; deny?: string; sid?: string; store?: Map<string, unknown>; gate?: Promise<void>; clock?: MockClock }

function world(on: On, w: World, env: Record<string, string> = {}): World {
  w.store ??= new Map()
  const store = w.store
  mock.env(on, env)
  w.clock = mock.clock(on, { now: 1_000_000 })
  on('session.id', () => ({ value: w.sid ?? 's1' }))
  on('store.get', (_$, e) => ({ value: store.get(e.key) }))
  on('store.set', async (_$, e) => {
    const gate = w.gate
    w.gate = undefined
    await gate
    store.set(e.key, e.value)
    return { value: undefined }
  })
  on('store.delete', (_$, e) => (store.delete(e.key), { value: undefined }))
  on('store.keys', () => ({ value: [...store.keys()] }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: w.tokens, window: w.window }, rateLimits: [] } }))
  on('tool.call', () => (w.deny === undefined ? { result: { stdout: 'ok' }, text: 'ok' } : { deny: w.deny }))
  on('turn.step', async function* (_$, e) {
    const usage = { input_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: w.output ?? 0, model: 'm' }
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'tool_use' as const, usage }
  })
  return w
}

async function step($: Engine): Promise<void> {
  for await (const chunk of $.turn.step({ turnId: 't', index: 0, model: 'm', messageCount: 1 })) void chunk
}

async function call($: Engine): Promise<readonly string[] | undefined> {
  const r = await $.tool.call({ tool: 'Bash', command: 'ls' })
  return r.deny === undefined ? r.context : undefined
}

test('main reads the engine fill against its raw window', async ($, on) => {
  world(on, { tokens: 980_000, window: 1_000_000 })
  expect(await call($)).toEqual([`Context 980K/1M — 20K left. ${FINAL_MAIN}`])
})

test('main tier boundaries', async ($, on) => {
  const w = world(on, { tokens: 945_999, window: 1_000_000 })
  expect(await call($)).toBeUndefined()
  w.tokens = 946_000
  expect(await call($)).toEqual([`Context 946K/1M — 54K left. ${NOTICE_MAIN}`])
  w.tokens = 974_999
  expect(await call($)).toBeUndefined()
  w.tokens = 975_000
  expect(await call($)).toEqual([`Context 975K/1M — 25K left. ${FINAL_MAIN}`])
})

test('once per tier; final subsumes notice after compaction', async ($, on) => {
  const w = world(on, { tokens: 980_000, window: 1_000_000 })
  expect(await call($)).toEqual([`Context 980K/1M — 20K left. ${FINAL_MAIN}`])
  expect(await call($)).toBeUndefined()
  w.tokens = 946_000
  expect(await call($)).toBeUndefined()
})

test('concurrent calls claim a tier once', async ($, on) => {
  world(on, { tokens: 946_000, window: 1_000_000 })
  const all = await Promise.all(Array.from({ length: 16 }, () => call($)))
  expect(all.filter(c => c !== undefined)).toEqual([[`Context 946K/1M — 54K left. ${NOTICE_MAIN}`]])
})

test('no response yet is quiet', async ($, on) => {
  world(on, { window: 1_000_000 })
  expect(await call($)).toBeUndefined()
})

test('main output tokens count toward the fill', async ($, on) => {
  world(on, { tokens: 945_000, window: 1_000_000, output: 1_000 })
  await step($)
  expect(await call($)).toEqual([`Context 946K/1M — 54K left. ${NOTICE_MAIN}`])
})

test('a refused call passes through untouched', async ($, on) => {
  world(on, { tokens: 960_000, window: 1_000_000, deny: 'no' })
  expect(await $.tool.call({ tool: 'Bash', command: 'ls' })).toEqual({ deny: 'no' })
})

test('agent tiers on its own window minus the reserve', () => {
  expect(assess(182_999, 305_000, 0, true)).toBeUndefined()
  expect(assess(183_000, 305_000, 0, true)).toEqual({ tier: 'notice', text: `Context 183K/272K — 89K left. ${NOTICE_AGENT}` })
  expect(assess(241_999, 305_000, 0, true)?.tier).toBe('notice')
  expect(assess(242_000, 305_000, 0, true)).toEqual({ tier: 'final', text: `Context 242K/272K — 30K left. ${FINAL_AGENT}` })
  expect(assess(290_000, 305_000, 0, true)).toEqual({ tier: 'final', text: `Context 290K/272K — 0K left. ${FINAL_AGENT}` })
})

test('ACW clamps window and trigger for every loop', () => {
  expect(assess(190_000, 1_000_000, 240_000, false)?.text).toBe(`Context 190K/207K — 17K left. ${FINAL_MAIN}`)
  expect(assess(190_000, 273_000, 240_000, true)?.text).toBe(`Context 190K/207K — 17K left. ${FINAL_AGENT}`)
})

test('default agent window 200K', () => {
  expect(assess(100_000, 200_000, 0, true)?.text).toBe(`Context 100K/167K — 67K left. ${NOTICE_AGENT}`)
})

test('message rounds down', () => {
  expect(assess(953_456, 1_000_000, 0, false)?.text).toBe(`Context 953K/1M — 46K left. ${NOTICE_MAIN}`)
})

test('agent loop reads its own step usage', async ($, on) => {
  const w = world(on, { tokens: 100_000, window: 1_000_000 }, { CLAUDE_CODE_MAX_CONTEXT_TOKENS: '305000' })
  w.output = 210_000
  for await (const chunk of $.turn.step({ turnId: 't', index: 0, model: 'm', messageCount: 1, agentId: 'a1' })) void chunk
  const r = await $.tool.call({ tool: 'Bash', command: 'ls', agentId: 'a1' } as never)
  expect(r.deny === undefined ? r.context : 'denied').toEqual([`Context 210K/272K — 61K left. ${NOTICE_AGENT}`])
})

test('a tool that finishes mid-stream waits for its step usage', async ($, on) => {
  mock.clock(on)
  mock.store(on)
  mock.env(on, { CLAUDE_CODE_MAX_CONTEXT_TOKENS: '305000' })
  on('session.id', () => ({ value: 's1' }))
  let release = () => {}
  const gate = new Promise<void>(resolve => (release = resolve))
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 1_000_000 }, rateLimits: [] } }))
  on('tool.call', () => ({ result: { stdout: 'ok' }, text: 'ok' }))
  on('turn.step', async function* (_$, e) {
    await gate
    const usage = { input_tokens: 230_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0, model: 'm' }
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'tool_use' as const, usage }
  })
  const streamed = (async () => {
    for await (const chunk of $.turn.step({ turnId: 't', index: 0, model: 'm', messageCount: 1, agentId: 'a2' })) void chunk
  })()
  const called = $.tool.call({ tool: 'Bash', command: 'ls', agentId: 'a2' } as never)
  release()
  await streamed
  const r = await called
  expect(r.deny === undefined ? r.context : 'denied').toEqual([`Context 230K/272K — 42K left. ${NOTICE_AGENT}`])
})

test('a resumed process keeps the session claims; the win is saved', async ($, on) => {
  const w = world(on, { tokens: 980_000, window: 1_000_000, store: new Map([['claims:s1', { at: 1_000_000, claims: { main: 'final' } }]]) })
  expect(await call($)).toBeUndefined()
  w.sid = 's2'
  expect(await call($)).toEqual([`Context 980K/1M — 20K left. ${FINAL_MAIN}`])
  expect(w.store!.get('claims:s2')).toEqual({ at: 1_000_000, claims: { main: 'final' } })
})

test('main and two agents claim independently in one session', async ($, on) => {
  const w = world(on, { tokens: 946_000, window: 1_000_000 }, { CLAUDE_CODE_MAX_CONTEXT_TOKENS: '305000' })
  w.output = 210_000
  for (const agentId of ['a1', 'a2']) {
    for await (const chunk of $.turn.step({ turnId: 't', index: 0, model: 'm', messageCount: 1, agentId } as never)) void chunk
  }
  const of = async (agentId?: string) => {
    const r = await $.tool.call({ tool: 'Bash', command: 'ls', agentId } as never)
    return r.deny === undefined ? r.context : 'denied'
  }
  expect([await of('a1'), await of(), await of('a2'), await of('a1')]).toEqual([
    [`Context 210K/272K — 61K left. ${NOTICE_AGENT}`],
    [`Context 946K/1M — 54K left. ${NOTICE_MAIN}`],
    [`Context 210K/272K — 61K left. ${NOTICE_AGENT}`],
    undefined,
  ])
})

test('session claims older than seven days are pruned at session start', async ($, on) => {
  const w = world(on, { tokens: 0, window: 1_000_000, store: new Map([
    ['claims:old', { at: 1_000_000 - 8 * 86_400_000, claims: { main: 'final' } }],
    ['claims:s1', { at: 1_000_000 - 86_400_000, claims: { main: 'notice' } }],
  ]) })
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/w', surface: null, isInteractive: false })
  expect([...w.store!.keys()]).toEqual(['claims:s1'])
})

test('a slow save of one loop never erases a later loop\'s claim', async ($, on) => {
  const w = world(on, { tokens: 0, window: 1_000_000 }, { CLAUDE_CODE_MAX_CONTEXT_TOKENS: '305000' })
  w.output = 210_000
  for (const agentId of ['a1', 'a2']) {
    for await (const chunk of $.turn.step({ turnId: 't', index: 0, model: 'm', messageCount: 1, agentId } as never)) void chunk
  }
  let release = () => {}
  w.gate = new Promise<void>(resolve => (release = resolve))
  const first = $.tool.call({ tool: 'Bash', command: 'ls', agentId: 'a1' } as never)
  await w.clock!.settle()
  const second = $.tool.call({ tool: 'Bash', command: 'ls', agentId: 'a2' } as never)
  await w.clock!.settle()
  release()
  await Promise.all([first, second])
  expect(w.store!.get('claims:s1')).toEqual({ at: 1_000_000, claims: { a1: 'notice', a2: 'notice' } })
})
