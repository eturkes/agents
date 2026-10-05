import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { FAILED, HOLD, STOP_FAILED, verdictOnCall, verdictOnPing, verdictOnStop } from '../hooks/text'

const CALL = 'srvtoolu_01AAA'
const VERDICT = 'Direction holds; the fixture lacks a red run.'
const REBUT = 'mcp__astra-advisor__rebut'

type World = {
  runs: { argv: readonly string[]; cwd?: string; timeoutMs?: number }[]
  deny?: string
  mode: 'ok' | 'error' | 'crash'
  result: string
  toasts: string[]
  cwdExists: boolean
}

function world(on: On, over: Partial<World> = {}): World {
  const w: World = { runs: [], mode: 'ok', result: VERDICT, toasts: [], cwdExists: true, ...over }
  on('session.id', () => ({ value: 'session-1' }))
  on('session.cwd', () => ({ value: '/work' }))
  on('fs.exists', () => ({ value: w.cwdExists }))
  on('process.run', (_$, e) => {
    w.runs.push({ argv: e.argv, cwd: e.init?.cwd, timeoutMs: e.init?.timeoutMs })
    if (w.mode === 'crash') return { deny: 'cannot start' }
    const stdout = JSON.stringify({ type: 'result', is_error: w.mode === 'error', result: w.result })
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('tool.register', (_$, e) => ({ value: { tool: `mcp__astra-advisor__${e.name}` } }))
  on('ui.toast', (_$, e) => {
    w.toasts.push(e.text)
    return { value: undefined }
  })
  on('tool.call', () => (w.deny === undefined ? { result: { stdout: 'ok' }, text: 'ok' } : { deny: w.deny }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.step', async function* (_$, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'tool_use' as const, usage: null }
  })
  on('classic.Stop', () => ({}))
  return w
}

let seq = 0
async function turn($: Engine): Promise<void> {
  await $.turn.start({ text: 'Go.', turnId: `turn-${++seq}` })
}
async function step($: Engine, effort: unknown = 'max', agentId?: string): Promise<void> {
  const input = { turnId: 't', index: 0, model: 'm', messageCount: 1, effort, agentId } as never
  for await (const chunk of $.turn.step(input)) void chunk
}
// The kit keeps no conversation beneath the plugins: the plugin reads the row, then the bottom refuses it.
async function append($: Engine, input: unknown): Promise<void> {
  await $.session.append(input as never).catch((err: unknown) => {
    if (!String(err).includes('no implementation for session.append')) throw err
  })
}
async function row($: Engine, uuid: string, content: unknown[], agentId?: string): Promise<void> {
  await append($, { door: 'response', origin: { kind: 'model', model: 'm' }, uuid, message: { type: 'assistant', role: 'assistant', content }, agentId })
}
const text = (t: string) => [{ type: 'text', text: t }]
const thinking = [{ type: 'thinking', thinking: '', signature: 's' }]
async function advisor($: Engine, call = CALL, agentId?: string): Promise<void> {
  await row($, `use-${call}`, [{ type: 'server_tool_use', id: call, name: 'advisor', input: {} }], agentId)
  await row($, `res-${call}`, [{ type: 'advisor_tool_result', tool_use_id: call, content: { type: 'advisor_redacted_result' } }], agentId)
}
/** prompt → step → plan text (u1) → empty thinking (u2) → advisor(): cut = u1. */
async function setup($: Engine, effort: unknown = 'max'): Promise<void> {
  await turn($)
  await step($, effort)
  await row($, 'u1', text('Plan: ship; doubt: the cut.'))
  await row($, 'u2', thinking)
  await advisor($)
}
const bash = ($: Engine, command = 'make') => $.tool.call({ tool: 'Bash', command })
const ping = ($: Engine) => bash($, ' echo second-advisor\n')
const flag = (argv: readonly string[], name: string) => argv[argv.indexOf(name) + 1]
const stop = ($: Engine) => $.classic.Stop({ stop_hook_active: false, last_assistant_message: 'Done.' } as never)

test('no advisor call passes quietly', async ($, on) => {
  const w = world(on)
  await turn($)
  await step($)
  await row($, 'u1', text('x'))
  expect(await bash($)).toEqual({ result: { stdout: 'ok' }, text: 'ok' })
  expect(w.runs).toEqual([])
})

test('next call held with the blind fork verdict', async ($, on) => {
  const w = world(on)
  await setup($)
  expect(await bash($)).toEqual({ deny: verdictOnCall(VERDICT) })
  const [run] = w.runs
  expect(w.runs.length).toBe(1)
  const argv = run!.argv
  expect(run!.cwd).toBe('/work')
  expect(argv[0]).toBe('claude')
  for (const [name, value] of [['--resume', 'session-1'], ['--resume-session-at', 'u1'], ['--model', 'gpt-6-astra'],
    ['--effort', 'max'], ['--tools', ''], ['--output-format', 'json']] as const) expect(flag(argv, name)).toBe(value)
  for (const name of ['-p', '--fork-session', '--no-session-persistence', '--strict-mcp-config']) expect(argv).toContain(name)
  const settings = JSON.parse(flag(argv, '--settings')!)
  expect(settings.disableAllHooks).toBe(true)
  expect(settings.advisorModel).toBe('')
  expect(argv[argv.length - 1]).toContain('cut off by design')
})

test('ping runs with the verdict attached', async ($, on) => {
  const w = world(on)
  await setup($)
  const r = await ping($)
  expect(r.deny === undefined ? r.context : r).toEqual([verdictOnPing(VERDICT)])
  expect(w.runs.length).toBe(1)
})

test('ping review spares a later step and the stop', async ($, on) => {
  const w = world(on)
  await setup($)
  await ping($)
  await step($)
  expect((await bash($)).deny).toBeUndefined()
  expect(await stop($)).toEqual({})
  expect(w.runs.length).toBe(1)
})

test('ping sibling of a claimed batch passes; idle ping passes', async ($, on) => {
  const w = world(on)
  await setup($)
  expect(await bash($)).toEqual({ deny: verdictOnCall(VERDICT) })
  const sibling = await ping($)
  expect(sibling.deny === undefined ? sibling.context : sibling).toBeUndefined()
  await turn($)
  await step($)
  const idle = await ping($)
  expect(idle.deny === undefined ? idle.context : idle).toBeUndefined()
  expect(w.runs.length).toBe(1)
})

test('serial sibling held; re-issue in a later step passes', async ($, on) => {
  const w = world(on)
  await setup($)
  expect([await bash($), await bash($)]).toEqual([{ deny: verdictOnCall(VERDICT) }, { deny: HOLD }])
  await step($)
  expect((await bash($)).deny).toBeUndefined()
  expect(w.runs.length).toBe(1)
})

test('concurrent batch: one verdict, the rest held', async ($, on) => {
  const w = world(on)
  await setup($)
  const all = await Promise.all([bash($), bash($), bash($)])
  expect(all.map(r => JSON.stringify(r)).sort()).toEqual(
    [{ deny: verdictOnCall(VERDICT) }, { deny: HOLD }, { deny: HOLD }].map(r => JSON.stringify(r)).sort())
  expect(w.runs.length).toBe(1)
})

test('cut at the tool result when the call opens a response', async ($, on) => {
  const w = world(on)
  await turn($)
  await step($)
  await row($, 'u0', [{ type: 'tool_use', id: 'toolu_0', name: 'Bash', input: {} }])
  await append($, { door: 'tool-result', origin: { kind: 'tool', tool: 'Bash' }, uuid: 'u1',
    message: { type: 'user', role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_0', content: 'ok' }] } })
  await step($)
  await row($, 'u2', thinking)
  await advisor($)
  await bash($)
  expect(flag(w.runs[0]!.argv, '--resume-session-at')).toBe('u1')
})

test('a later advisor call gets its own review', async ($, on) => {
  const w = world(on)
  await setup($)
  await bash($)
  await step($)
  await row($, 'u5', text('Second plan.'))
  await advisor($, 'srvtoolu_01BBB')
  expect(await bash($)).toEqual({ deny: verdictOnCall(VERDICT) })
  expect(w.runs.map(r => flag(r.argv, '--resume-session-at'))).toEqual(['u1', 'u5'])
})

test('back-to-back advisor calls: one review of the latest', async ($, on) => {
  const w = world(on)
  await setup($)
  await row($, 'u6', text('More.'))
  await advisor($, 'srvtoolu_01CCC')
  await bash($)
  expect(w.runs.map(r => flag(r.argv, '--resume-session-at'))).toEqual(['u6'])
})

test('a call from an earlier turn stays quiet', async ($, on) => {
  const w = world(on)
  await setup($)
  await turn($)
  await step($)
  expect((await bash($)).deny).toBeUndefined()
  expect(w.runs).toEqual([])
})

test('teammate rows and calls stay quiet', async ($, on) => {
  const w = world(on)
  await turn($)
  await step($)
  await row($, 'u1', text('x'))
  await advisor($, CALL, 'a1')
  expect((await bash($)).deny).toBeUndefined()
  await advisor($)
  const teammate = await $.tool.call({ tool: 'Bash', command: 'make', agentId: 'a1' } as never)
  expect(teammate.deny).toBeUndefined()
  expect(w.runs).toEqual([])
})

test('stop blocks with the verdict; a new call after the block earns one review', async ($, on) => {
  const w = world(on)
  await setup($)
  expect(await stop($)).toEqual({ block: verdictOnStop(VERDICT) })
  await step($)
  await row($, 'u7', text('Reconsidered.'))
  await advisor($, 'srvtoolu_01DDD')
  expect(await stop($)).toEqual({ block: verdictOnStop(VERDICT) })
  expect(await stop($)).toEqual({})
  expect(w.runs.length).toBe(2)
})

test('a claimed call leaves the stop quiet', async ($, on) => {
  const w = world(on)
  await setup($)
  await bash($)
  expect(await stop($)).toEqual({})
  expect(w.runs.length).toBe(1)
})

for (const mode of ['error', 'crash'] as const) {
  test(`failed review (${mode}) passes once`, async ($, on) => {
    world(on, { mode })
    await setup($)
    const first = await bash($)
    expect(first.deny === undefined ? first.context : first).toEqual([FAILED])
    const second = await bash($)
    expect(second.deny === undefined ? second.context : second).toBeUndefined()
  })
}

test('failed review at stop toasts and passes', async ($, on) => {
  const w = world(on, { mode: 'error' })
  await setup($)
  expect(await stop($)).toEqual({})
  expect(w.toasts).toEqual([STOP_FAILED])
})

test('no fork point fails closed', async ($, on) => {
  const w = world(on)
  await turn($)
  await step($)
  await advisor($)
  const r = await bash($)
  expect(r.deny === undefined ? r.context : r).toEqual([FAILED])
  const rebut = await $.tool.call({ tool: REBUT, gist: 'Fable: x.' } as never)
  expect(rebut.deny === undefined ? rebut.result : rebut).toBe('astra-advisor: no fork point before an advisor() call.')
  expect(w.runs).toEqual([])
})

test('effort follows the main step; unknown → high', async ($, on) => {
  const w = world(on)
  for (const effort of ['low', 'bogus', 7, null]) {
    await setup($, effort)
    await bash($)
  }
  expect(w.runs.map(r => flag(r.argv, '--effort'))).toEqual(['low', 'high', 'high', 'high'])
})

test('missing cwd forks from /', async ($, on) => {
  const w = world(on, { cwdExists: false })
  await setup($)
  await bash($)
  expect(w.runs[0]!.cwd).toBe('/')
})

test('rebut relays the gist and the earlier verdict at the same cut', async ($, on) => {
  const w = world(on)
  await setup($, 'xhigh')
  await bash($)
  await step($)
  w.result = 'I concede the cache point.'
  const r = await $.tool.call({ tool: REBUT, gist: 'Fable: the cache is cold.' } as never)
  expect(r.deny === undefined ? r.result : r).toBe('I concede the cache point.')
  const argv = w.runs[1]!.argv
  expect([flag(argv, '--resume'), flag(argv, '--resume-session-at'), flag(argv, '--effort')]).toEqual(['session-1', 'u1', 'xhigh'])
  expect(argv[argv.length - 1]).toContain('Fable: the cache is cold.')
  expect(argv[argv.length - 1]).toContain(VERDICT)
})

test('rebut after a failed review has no earlier verdict', async ($, on) => {
  const w = world(on, { mode: 'error' })
  await setup($)
  await bash($)
  w.mode = 'ok'
  await $.tool.call({ tool: REBUT, gist: 'Fable: x.' } as never)
  expect(w.runs[1]!.argv[w.runs[1]!.argv.length - 1]).toContain('Your earlier verdict:\n(none recorded)')
})

test('rebut requires a gist', async ($, on) => {
  const w = world(on)
  await setup($)
  await bash($)
  await step($)
  const r = await $.tool.call({ tool: REBUT, gist: '  ' } as never)
  expect(r.deny === undefined ? r.result : r).toBe('astra-advisor: give `gist`, the advisor() reply gist + the open question.')
  expect(w.runs.length).toBe(1)
})

test('the fork has a hard time bound', async ($, on) => {
  const w = world(on)
  await setup($)
  await bash($)
  expect(w.runs[0]!.timeoutMs).toBe(540_000)
})

test('rebut before the ping reviews the newer call first, then rebuts at its cut', async ($, on) => {
  const w = world(on)
  await setup($)
  await ping($)
  await step($)
  await row($, 'u8', text('Second plan.'))
  await advisor($, 'srvtoolu_01EEE')
  const first = await $.tool.call({ tool: REBUT, gist: 'Fable: x.' } as never)
  expect(first).toEqual({ deny: verdictOnCall(VERDICT) })
  await step($)
  await $.tool.call({ tool: REBUT, gist: 'Fable: x.' } as never)
  expect(w.runs.map(r => flag(r.argv, '--resume-session-at'))).toEqual(['u1', 'u8', 'u8'])
})

test('a ping refused beneath still carries the verdict', async ($, on) => {
  const w = world(on, { deny: 'blocked by policy' })
  await setup($)
  expect(await ping($)).toEqual({ deny: `blocked by policy\n\n${verdictOnPing(VERDICT)}` })
})
