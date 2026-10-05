import { expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock } from 'claude-code/testing'
import type { AgentInfo, ApiContentBlock, On, ToolCallResult } from 'claude-code'

import { COMPACT_NOTE, SPAWN_NOTE, stopHold, wroteNothing } from '../hooks/text'

const REJECTION = '<tool_use_error>Subagents should return findings as text, not write report files. Include this content in your final response instead.</tool_use_error>'

type World = {
  clock: MockClock
  files: Map<string, string>
  prompts: string[]
  instructions: (string | undefined)[]
  status: (string | undefined)[]
  mkdirs: string[]
  agents: AgentInfo[]
  rows: ApiContentBlock[][]
  answer: (e: { tool: string }) => ToolCallResult
}

function world(on: On): World {
  const w: World = {
    clock: mock.clock(on, { now: 1_000_000 }),
    files: new Map(),
    prompts: [],
    instructions: [],
    status: [],
    mkdirs: [],
    agents: [],
    rows: [],
    answer: () => ({ result: 'ok', text: 'ok' }),
  }
  mock.env(on, { CLAUDE_CODE_MAX_CONTEXT_TOKENS: '305000' })
  on('agent.spawn', (_$, e) => {
    w.prompts.push(e.prompt)
    return { model: 'm', agentId: `id-${e.name ?? 'anon'}` }
  })
  on('tool.call', (_$, e) => w.answer(e))
  on('turn.step', async function* (_$, e) {
    const usage = { input_tokens: 136_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0, model: 'm' }
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'tool_use' as const, usage }
  })
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('session.compact', (_$, e) => {
    w.instructions.push(e.instructions)
    return { messages: e.messages }
  })
  on('classic.SubagentStop', () => ({}))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('fs.exists', (_$, e) => ({ value: w.files.has(e.path) }))
  on('fs.read', (_$, e) => ({ value: w.files.get(e.path) ?? '' }))
  on('fs.write', (_$, e) => {
    w.files.set(e.path, e.text)
    return { value: undefined }
  })
  on('process.run', (_$, e) => {
    w.mkdirs.push(e.argv.join(' '))
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('agent.list', () => ({ value: w.agents }))
  on('session.append', (_$, e, next) => {
    w.rows.push(e.message.content)
    return next(e)
  })
  on('ui.status', (_$, e) => {
    w.status.push(e.text)
    return { value: undefined }
  })
  return w
}

async function spawn($: Engine, name: string, prompt = 'Do it.'): Promise<string> {
  const r = await $.agent.spawn({ prompt, description: 'd', subagentType: 'reviewer', name } as never)
  return r.agentId ?? ''
}
/** A message reaching the teammate's conversation; the kit keeps no conversation beneath the plugins. */
async function tell($: Engine, agentId: string, text: string): Promise<void> {
  await $.session.append({ door: 'delivery', origin: { kind: 'engine' }, uuid: `m-${text.length}`, agentId,
    message: { type: 'user', role: 'user', content: [{ type: 'text', text }] } } as never).catch((err: unknown) => {
    if (!String(err).includes('no implementation for session.append')) throw err
  })
}
async function step($: Engine, agentId: string): Promise<void> {
  for await (const chunk of $.turn.step({ turnId: 't', index: 0, model: 'm', messageCount: 1, agentId } as never)) void chunk
}
const call = ($: Engine, agentId: string, input: Record<string, unknown>) => $.tool.call({ ...input, agentId } as never)
const done = ($: Engine, agentId: string) => $.turn.complete({ answer: 'finished', durationMs: 1, isAborted: false, turnId: 't', agentId, reason: 'answer' } as never)
const taskStop = ($: Engine, task_id: string) => $.tool.call({ tool: 'TaskStop', task_id })
const subagentStop = ($: Engine, agent_id: string, stop_hook_active = false) =>
  $.classic.SubagentStop({ agent_id, stop_hook_active, agent_transcript_path: '/t.jsonl', agent_type: 'reviewer' } as never)

test('the brief carries the deliverable note', async ($, on) => {
  const w = world(on)
  await spawn($, 'rev-1', 'Audit x.')
  expect(w.prompts).toEqual([`Audit x.\n\n${SPAWN_NOTE}`])
})

test('a teammate brief carries the note once; the TaskStop hold knows it by name', async ($, on) => {
  const w = world(on)
  const sub = await spawn($, 'rev-1', 'Audit x.')
  w.agents = [{ id: 'tm-1', description: 'd', type: 'teammate', status: 'running', name: 'rev-3' }]
  await tell($, sub, 'Audit x.')
  await tell($, 'tm-1', 'Audit y; end with rev-3-DONE-1.')
  await tell($, 'tm-1', 'Also z.')
  expect(w.rows).toEqual([
    [{ type: 'text', text: 'Audit x.' }],
    [{ type: 'text', text: 'Audit y; end with rev-3-DONE-1.' }, { type: 'text', text: SPAWN_NOTE }],
    [{ type: 'text', text: 'Also z.' }],
  ])
  await step($, 'tm-1')
  expect(await taskStop($, 'rev-3@team')).toEqual({ deny: stopHold('rev-3', 'rev-3-DONE-1', []) })
})

test('a teammate already tracked before its row keeps the row as sent', async ($, on) => {
  const w = world(on)
  w.agents = [{ id: 'tm-1', description: 'd', type: 'teammate', status: 'running', name: 'rev-3' }]
  await step($, 'tm-1')
  await tell($, 'tm-1', 'Also z.')
  expect(w.rows).toEqual([[{ type: 'text', text: 'Also z.' }]])
})

test('compaction carries the deliverable line beside any typed instructions', async ($, on) => {
  const w = world(on)
  const messages = [{ role: 'user', text: 'x', toolUses: [] }]
  await $.session.compact({ trigger: 'auto', messages } as never)
  await $.session.compact({ trigger: 'manual', instructions: 'keep it short', messages } as never)
  expect(w.instructions).toEqual([COMPACT_NOTE, `keep it short\n\n${COMPACT_NOTE}`])
})

test('a rejected report Write is performed and answered as Write', async ($, on) => {
  const w = world(on)
  const id = await spawn($, 'rev-1')
  w.answer = e => (e.tool === 'Write' ? { result: REJECTION, text: REJECTION, isError: true } : { result: 'ok', text: 'ok' })
  const created = await call($, id, { tool: 'Write', file_path: '/x/out/REPORT.md', content: 'v1' })
  expect(created).toEqual({ result: { type: 'create', filePath: '/x/out/REPORT.md', content: 'v1', structuredPatch: [], originalFile: null } })
  const updated = await call($, id, { tool: 'Write', file_path: '/x/out/REPORT.md', content: 'v2' })
  expect(updated).toEqual({ result: { type: 'update', filePath: '/x/out/REPORT.md', content: 'v2', structuredPatch: [], originalFile: 'v1' } })
  expect(w.files.get('/x/out/REPORT.md')).toBe('v2')
  expect(w.mkdirs).toEqual(['mkdir -p /x/out', 'mkdir -p /x/out'])
})

test('other Write errors pass through', async ($, on) => {
  const w = world(on)
  const id = await spawn($, 'rev-1')
  const error = { result: 'File has not been read yet', text: 'File has not been read yet', isError: true as const }
  w.answer = () => error
  expect(await call($, id, { tool: 'Write', file_path: '/x/REPORT.md', content: 'v1' })).toEqual(error)
  expect(w.files.size).toBe(0)
})

test('a long run with no durable write gets the wrote-nothing notice once', async ($, on) => {
  world(on)
  const id = await spawn($, 'res-1')
  for (let i = 0; i < 15; i++) await call($, id, { tool: 'Read', file_path: `/x/${i}` })
  expect(await subagentStop($, id)).toEqual({ additionalContext: [wroteNothing(15)] })
  expect(await subagentStop($, id, true)).toEqual({})
})

test('a durable call or a short run stays quiet', async ($, on) => {
  world(on)
  const short = await spawn($, 'res-1')
  for (let i = 0; i < 14; i++) await call($, short, { tool: 'Read', file_path: `/x/${i}` })
  expect(await subagentStop($, short)).toEqual({})
  for (const durable of [{ tool: 'Edit', file_path: '/x/a' }, { tool: 'Bash', command: 'git commit -m x' }, { tool: 'Bash', command: 'echo x >> log' }]) {
    const id = await spawn($, `w-${JSON.stringify(durable).length}`)
    for (let i = 0; i < 15; i++) await call($, id, { tool: 'Read', file_path: `/x/${i}` })
    await call($, id, durable)
    expect(await subagentStop($, id)).toEqual({})
  }
  const plain = await spawn($, 'plain')
  for (let i = 0; i < 15; i++) await call($, plain, { tool: 'Bash', command: 'echo x > out' })
  expect(await subagentStop($, plain)).toEqual({ additionalContext: [wroteNothing(15)] })
})

for (const [name, sent, marker] of [
  ['rev-9', ['I am still working; wait for rev-9-DONE-1.'], 'rev-9-DONE-1'],
  ['Map_2', ['Wait for Map_2-DONE-3.'], 'Map_2-DONE-3'],
  ['impl-2', ['Wait for IMPL-2-DONE-1.'], 'IMPL-2-DONE-1'],
  ['rev-9', ['Initial brief: rev-9-DONE-1.', 'Updated brief: rev-9-DONE-2.'], 'rev-9-DONE-2'],
  ['rev-8', ['Was rev-8-DONE-1; now rev-8-DONE-2.'], 'rev-8-DONE-2'],
  ['rev-9', ['Brief includes rev-9-done-1 and <NAME>-DONE-<i> only.'], undefined],
] as const) {
  test(`TaskStop on mid-turn ${name} names ${marker ?? 'the fallback'}`, async ($, on) => {
    world(on)
    const id = await spawn($, name)
    for (const text of sent) await tell($, id, text)
    await step($, id)
    expect(await taskStop($, name)).toEqual({ deny: stopHold(name, marker, []) })
  })
}

test('TaskStop hold lists Write/Edit targets newest first; a re-issue within 10 min passes', async ($, on) => {
  const w = world(on)
  const id = await spawn($, 'rev-9')
  await step($, id)
  await call($, id, { tool: 'Write', file_path: '/x/a.md', content: '' })
  await call($, id, { tool: 'Edit', file_path: '/x/b.md', old_string: 'a', new_string: 'b' })
  await call($, id, { tool: 'Edit', file_path: '/x/a.md', old_string: 'a', new_string: 'b' })
  expect(await taskStop($, 'rev-9@team')).toEqual({ deny: stopHold('rev-9', undefined, ['/x/a.md', '/x/b.md']) })
  await w.clock.advance(9 * 60_000)
  expect((await taskStop($, 'rev-9')).deny).toBeUndefined()
})

test('TaskStop passes for an ended turn, a quiet teammate and an unknown task', async ($, on) => {
  const w = world(on)
  const ended = await spawn($, 'rev-1')
  await step($, ended)
  await done($, ended)
  expect((await taskStop($, 'rev-1')).deny).toBeUndefined()
  const quiet = await spawn($, 'rev-2')
  await step($, quiet)
  await w.clock.advance(16 * 60_000)
  expect((await taskStop($, 'rev-2')).deny).toBeUndefined()
  expect((await taskStop($, 'bash-7')).deny).toBeUndefined()
})

test('status gauge shows running teammates against the compaction trigger', async ($, on) => {
  const w = world(on)
  const a = await spawn($, 'rev-1')
  await step($, a)
  const b = await spawn($, 'res-2')
  await step($, b)
  await done($, a)
  await done($, b)
  expect(w.status).toEqual(['teammates: rev-1 50%', 'teammates: rev-1 50% · res-2 50%', 'teammates: res-2 50%', undefined])
})

test('the gauge drops a teammate gone quiet with no further events', async ($, on) => {
  const w = world(on)
  await $.session.start({ cwd: '/w', surface: null, isInteractive: false })
  const id = await spawn($, 'rev-1')
  await step($, id)
  await w.clock.advance(16 * 60_000)
  expect(w.status).toEqual(['teammates: rev-1 50%', undefined])
})
