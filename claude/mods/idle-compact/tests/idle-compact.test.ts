import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { AgentInfo, On } from 'claude-code'

type Poll = { session: string; quiet: boolean; working: boolean; tokens?: number }
type World = {
  polls: Poll[]; reports: unknown[]; notices: { tool_use_id: string; text: string | undefined }[]
  compact: boolean; compactions: number; skip?: string; down: boolean; entry: object; gate?: Promise<void>; agents: AgentInfo[]
  tokens?: number; output: number; tools: unknown[]; instructions: (string | undefined)[]; reject?: string; hold?: Promise<void>
}

function world(on: On): World & { advance: (ms: number) => Promise<void> } {
  const w: World = { polls: [], reports: [], notices: [], compact: false, compactions: 0, down: false, entry: { touches: 0, limit: 19, state: 'armed' }, agents: [], output: 1, tools: [], instructions: [] }
  const clock = mock.clock(on, { now: Date.UTC(2026, 9, 11, 9, 0) })
  mock.env(on, { CACHE_KEEPALIVE_URL: 'http://keeper' })
  on('session.id', () => ({ value: 's1' }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.step', async function* (_$, e) {
    const usage = { input_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: w.output, model: e.model }
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage }
  })
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('classic.Stop', () => ({}))
  on('agent.list', () => ({ value: w.agents }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: w.tokens, window: 1_000_000 }, rateLimits: [] } }))
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
  on('tool.register', (_$, e) => (w.tools.push(e), { value: { tool: `mcp__idle-compact__${e.name}` } }))
  on('session.compact', async (_$, e) => {
    await w.hold
    if (w.reject) throw new Error(w.reject)
    w.compactions++
    w.instructions.push(e.instructions)
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
const complete = ($: Engine, turnId: string, more: object = {}) =>
  $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId, reason: 'answer', ...more } as never)
const KEEP = 'pool run p1 (task b7, log .scratch/p1.log); its verdict decides the merge; next: read the log'
const TOOL = 'mcp__idle-compact__compact_before_wait'
const wait = ($: Engine, keep: unknown = KEEP, agentId?: string) =>
  $.tool.call({ tool: TOOL, tool_use_id: 'w1', keep, agentId } as never) as Promise<{ result?: unknown; deny?: string }>
const MESSAGES = [{ role: 'user', text: 'hi', toolUses: [] }] as never
const told = (w: World) => w.reports.map(r => (r as { url: string }).url.split('/').at(-1))
const step = async ($: Engine, turnId: string, agentId?: string) => {
  for await (const c of $.turn.step({ turnId, index: 1, model: 'claude-opus-5-5', messageCount: 3, agentId } as never)) void c
}
/** A teammate in `$.agent.list()`: `idle` once its turn ended, until a message wakes it; Stop lists it `running`. */
const teammate = (status: AgentInfo['status']): AgentInfo => ({ id: 'a1', description: 'reviewer-1', type: 'teammate', status })
const stopTask = { id: 'a1', type: 'teammate', status: 'running', description: 'reviewer-1' }
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
  await stop($)
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

test('idle + ended teammates and MCP monitors leave the session quiet; a teammate at work = busy, at each poll', async ($, on) => {
  const w = world(on)
  await start($)
  w.agents = [teammate('idle'), { ...teammate('completed'), id: 'a2' }]
  await stop($, [stopTask, { ...stopTask, id: 'a2' }, { id: 'm1', type: 'monitor', status: 'running', description: 'feed' }])
  await w.advance(30_000)
  for (const status of ['pending', 'running', 'waiting'] as const) {
    w.agents = [teammate(status)]
    await w.advance(30_000)
  }
  w.agents = [teammate('idle')]
  await w.advance(30_000)
  expect(flags(w)).toEqual(['quiet', 'busy', 'busy', 'busy', 'quiet'])
})

test('before its first main Stop (a fresh process, or a reload: no Stop re-runs) the session reports busy', async ($, on) => {
  const w = world(on)
  await start($)
  await w.advance(30_000)
  await stop($)
  await w.advance(30_000)
  expect(flags(w)).toEqual(['busy', 'quiet'])
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
    { tool_use_id: 'q1', text: 'touches 2/19' },
    { tool_use_id: 'q1', text: 'touches 2/19' },
    { tool_use_id: 'q1', text: 'touches 3/19' },
    { tool_use_id: 'q1', text: 'stopped' },
  ])
})

test('a reply without an armed entry clears the dialog line', async ($, on) => {
  const w = world(on)
  await start($)
  await stop($)
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
  await stop($)
  await w.advance(30_000)
  await step($, 'a1', 'teammate-1')
  await w.advance(30_000)
  await complete($, 'a1')
  await w.advance(30_000)
  expect(flags(w)).toEqual(['quiet', 'busy+working', 'busy+working', 'quiet', 'quiet'])
})

test('each poll reports the context size: input side + the last main step\'s output, absent before a response', async ($, on) => {
  const w = world(on)
  await start($)
  await stop($)
  await w.advance(30_000)
  expect(w.polls.at(-1)).not.toHaveProperty('tokens')
  w.tokens = 150_000
  await w.advance(30_000)
  expect(w.polls.at(-1)?.tokens).toBe(150_000)
  w.output = 4_000
  await step($, 't1')
  await complete($, 't1')
  await w.advance(30_000)
  expect(w.polls.at(-1)?.tokens).toBe(154_000)
  w.output = 9_000
  await step($, 'a1', 'teammate-1') // a teammate's output stays out of MAIN's context
  await complete($, 'a1')
  await w.advance(30_000)
  expect(w.polls.at(-1)?.tokens).toBe(154_000)
})

test('a vetoed compaction is reported as failed', async ($, on) => {
  const w = world(on)
  w.skip = 'vetoed by a hook'
  w.compact = true
  await start($)
  await stop($)
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

test('an interactive session lists compact_before_wait in front, keep required; a headless one has no tool', async ($, on) => {
  const w = world(on)
  await start($, false)
  expect(w.tools).toHaveLength(0)
  await start($)
  expect(w.tools).toMatchObject([{ name: 'compact_before_wait', isDeferred: false, inputSchema: { required: ['keep'] } }])
})

test('the call compacts at its main turn end with keep in the instructions, the keeper told before + after', async ($, on) => {
  const w = world(on)
  await start($)
  await $.turn.start({ text: 'go', turnId: 't1' })
  w.tokens = 896_000
  w.output = 0
  const r = await wait($)
  expect(r.result).toBe("Compaction set for this turn's end (context now 896K). End your turn now: a further tool call holds it until the turn ends. The work you started wakes the session.")
  await w.advance(1)
  expect(w.compactions).toBe(0)
  await step($, 'a1', 'teammate-1')
  await complete($, 'a1', { agentId: 'teammate-1' }) // a teammate's turn end is not the call's
  await w.advance(1)
  expect(w.compactions).toBe(0)
  await complete($, 't1')
  await w.advance(1)
  expect(w.compactions).toBe(1)
  expect(w.instructions[0]).toContain(`Keep verbatim: ${KEEP}`)
  expect(told(w)).toEqual(['compacting', 'compacted'])
  expect(w.reports[1]).toMatchObject({ session: 's1', ok: true, reason: '', usage: { cache_read_input_tokens: 900 } })
  await $.turn.start({ text: '<task-notification>', turnId: 't2' })
  await complete($, 't2')
  await w.advance(1)
  expect(w.compactions).toBe(1) // one call, one compaction
})

test('a call under the 200K floor compacts nothing + still sends the session to its turn end', async ($, on) => {
  const w = world(on)
  await start($)
  await $.turn.start({ text: 'go', turnId: 't1' })
  w.tokens = 199_000
  const r = await wait($)
  expect(r.result).toBe('No compaction: context now 199K, under the 200K floor, where a summary barely shrinks it. End your turn now all the same: the work you started wakes the session.')
  await complete($, 't1')
  await w.advance(1)
  expect(w.compactions).toBe(0)
  expect(w.reports).toHaveLength(0)
  await $.turn.start({ text: 'go', turnId: 't2' })
  w.output = 1_000 // 199K input side + 1K output = the floor
  await step($, 't2')
  expect((await wait($)).result).toContain('Compaction set')
  await complete($, 't2')
  await w.advance(1)
  expect(w.compactions).toBe(1)
})

test('during its own compaction the session reports busy', async ($, on) => {
  const w = world(on)
  let release = () => {}
  w.hold = new Promise<void>(resolve => (release = resolve))
  await start($)
  await stop($)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await wait($)
  await complete($, 't1')
  await w.advance(30_000)
  release()
  await w.advance(30_000)
  expect(w.compactions).toBe(1)
  // turn start, turn end (before the compaction), 30-s poll mid-compaction, its end, the next 30-s poll
  expect(flags(w)).toEqual(['busy+working', 'quiet', 'busy', 'quiet', 'quiet'])
})

test('a teammate call or an empty keep is refused + leaves nothing pending', async ($, on) => {
  const w = world(on)
  await start($)
  await $.turn.start({ text: 'go', turnId: 't1' })
  expect((await wait($, KEEP, 'teammate-1')).deny).toContain('main session only')
  expect((await wait($, '  ')).deny).toContain('keep =')
  expect((await wait($, 7)).deny).toContain('keep =')
  await complete($, 't1')
  await w.advance(1)
  expect(w.compactions).toBe(0)
})

test('an interrupted or failed turn drops the call: no compaction then or at the next turn end', async ($, on) => {
  const w = world(on)
  await start($)
  for (const [turnId, reason] of [['t1', 'aborted'], ['t2', 'error']] as const) {
    await $.turn.start({ text: 'go', turnId })
    await wait($)
    await complete($, turnId, { reason, isAborted: reason === 'aborted' })
  }
  await $.turn.start({ text: 'again', turnId: 't3' })
  await complete($, 't3')
  await w.advance(1)
  expect(w.compactions).toBe(0)
  expect(w.reports).toHaveLength(0)
})

test('an unreachable keeper never holds the compaction up', async ($, on) => {
  const w = world(on)
  w.down = true
  await start($)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await wait($)
  await complete($, 't1')
  await w.advance(1)
  expect(w.compactions).toBe(1)
})

test('a failed compaction reports failure, the keeper told before + after', async ($, on) => {
  const w = world(on)
  w.reject = 'a turn is running' // a throwing test hook is skipped ⇒ the harness core fails the call
  await start($)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await wait($)
  await complete($, 't1')
  await w.advance(1)
  expect(told(w)).toEqual(['compacting', 'compacted'])
  expect(w.reports[1]).toMatchObject({ session: 's1', ok: false, reason: expect.stringContaining('Error') })
})

test("a typed /compact or CC's threshold tells the keeper; a precompute, a subagent's own or a headless one does not", async ($, on) => {
  const w = world(on)
  await start($)
  for (const trigger of ['manual', 'auto'] as const) await $.session.compact({ trigger, messages: MESSAGES })
  await w.advance(1)
  expect(told(w)).toEqual(['compacting', 'compacted', 'compacting', 'compacted'])
  expect(w.reports[1]).toMatchObject({ session: 's1', ok: true, usage: { cache_read_input_tokens: 900 } })
  await $.session.compact({ trigger: 'precompute', messages: MESSAGES })
  await $.session.compact({ trigger: 'auto', agentId: 'a1', messages: MESSAGES })
  w.skip = 'vetoed'
  await $.session.compact({ trigger: 'manual', messages: MESSAGES })
  await w.advance(1)
  expect(told(w).slice(4)).toEqual(['compacting', 'compacted'])
  expect(w.reports[5]).toMatchObject({ ok: false, reason: 'vetoed' })
  w.reject = 'engine failure' // the harness core fails the call ⇒ the hook passes the failure on + reports it
  await expect($.session.compact({ trigger: 'manual', messages: MESSAGES })).rejects.toThrow()
  await w.advance(1)
  expect(told(w).slice(6)).toEqual(['compacting', 'compacted'])
  expect(w.reports[7]).toMatchObject({ ok: false, reason: expect.stringContaining('Error') })
})

test('a headless session reports no compaction', async ($, on) => {
  const w = world(on)
  await start($, false)
  await $.session.compact({ trigger: 'manual', messages: MESSAGES })
  await w.advance(1)
  expect(w.compactions).toBe(1)
  expect(w.reports).toHaveLength(0)
})
