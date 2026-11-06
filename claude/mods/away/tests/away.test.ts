import { expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock } from 'claude-code/testing'
import type { On, RenderPropsOf } from 'claude-code'

import { askDenied, askTeammate, askWithdrawn, endsInQuestion, logged, note, onsetPrompt, parseState, presentNote, returnPrompt, stopBlock } from '../hooks/text'

const T0 = Date.UTC(2026, 10, 6, 1, 0)
const DIR = '/h/.claude/away'
const STATE = `${DIR}/state.json`
const PERIOD = '20261106-100000'
const LEDGER = `${DIR}/${PERIOD}/s1.md`
const LABEL = '17:30 Sat 7 Nov JST'

type World = {
  clock: MockClock
  files: Map<string, string>
  submitted: string[]
  commands: unknown[]
  runs: string[][]
  last: { role: 'user' | 'assistant'; text: string }[]
  gate?: Promise<void>
  /** prompt.submit refusals left: the host refuses one raised inside a hook the turn waits on. */
  refuse: number
  /** The question dialog fails (an interrupt). */
  dialogFails: boolean
  /** Context each prompt entered with. */
  contexts: (readonly string[] | undefined)[]
  dialogs: number
}

function world(on: On): World {
  const w: World = { clock: mock.clock(on, { now: T0 }), files: new Map(), submitted: [], commands: [], runs: [], last: [], dialogs: 0, refuse: 0, dialogFails: false, contexts: [] }
  mock.env(on, { HOME: '/h' })
  on('session.id', () => ({ value: 's1' }))
  on('session.cwd', () => ({ value: '/w' }))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('session.messages', () => ({ value: w.last.map(m => ({ ...m, toolUses: [] })) }) as never)
  on('session.compact', (_$, e) => ({ messages: e.messages }) as never)
  on('fs.exists', (_$, e) => ({ value: w.files.has(e.path) }))
  on('fs.read', (_$, e) => {
    const text = w.files.get(e.path)
    if (text === undefined) throw new Error('ENOENT')
    return { value: text }
  })
  on('fs.write', (_$, e) => (w.files.set(e.path, e.text), { value: undefined }))
  on('prompt.submit', (_$, e) => {
    if (w.refuse > 0 && e.origin.kind === 'plugin') {
      w.refuse--
      throw new Error('called from a command.run hook (host check)')
    }
    w.submitted.push(e.text)
    w.contexts.push(e.context)
    return { text: e.text, context: e.context }
  })
  on('command.register', (_$, e) => (w.commands.push(e), { value: { command: e.name } }) as never)
  on('process.run', (_$, e) => {
    w.runs.push([...e.argv])
    return { value: { exitCode: 0, stdout: 'Away until x.\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('classic.Stop', () => ({}))
  on('tool.call', async (_$, e) => {
    if (e.tool !== 'AskUserQuestion') return { result: 'ok', text: 'ok' }
    w.dialogs++
    if (w.dialogFails) return { result: 'interrupted', text: 'interrupted', isError: true } as never
    await w.gate
    return { result: { questions: [], answers: { q: 'a' } }, text: 'answered' } as never
  })
  on('ui.render', () => ({ type: 'Text' as const, children: ['engine'] }))
  return w
}

const start = ($: Engine, isInteractive = true) => $.session.start({ cwd: '/w', surface: null, isInteractive } as never)
const away = (w: World, until = T0 + 3_600_000, id = PERIOD) => w.files.set(STATE, JSON.stringify({ id, since: T0, until, label: LABEL }))
const back = (w: World) => away(w, w.clock.now())
const poll = (w: World) => w.clock.advance(30_000)
const turn = ($: Engine, turnId: string) => $.turn.start({ text: 'go', turnId } as never)
const done = ($: Engine, turnId: string) => $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId, reason: 'answer' } as never)
const bash = ($: Engine, agentId?: string) => $.tool.call({ tool: 'Bash', command: 'ls', agentId } as never) as Promise<{ context?: readonly string[]; deny?: string }>
const ask = ($: Engine, agentId?: string) => $.tool.call({ tool: 'AskUserQuestion', questions: [], agentId } as never) as Promise<{ deny?: string; result?: unknown }>
const stop = ($: Engine, more: object = {}) =>
  $.classic.Stop({ stop_hook_active: false, cwd: '/w', transcript_path: '/t', last_assistant_message: 'Done.', ...more } as never) as Promise<{ block?: string }>
const HINT: RenderPropsOf['PromptHint'] = { isDraft: false, isWorking: false, hint: '? for shortcuts' }

test('not away: no note, no block, the question dialog opens', async ($, on) => {
  const w = world(on)
  await start($)
  await turn($, 't1')
  expect((await bash($)).context).toBeUndefined()
  expect((await ask($)).result).toBeDefined()
  expect((await stop($)).block).toBeUndefined()
  expect(w.dialogs).toBe(1)
  expect(w.submitted).toEqual([])
})

test('away: the first tool result of each main turn carries the note, the ledger gets its header', async ($, on) => {
  const w = world(on)
  await start($)
  away(w)
  await poll(w)
  await turn($, 't1')
  expect((await bash($)).context).toEqual([note(LABEL, LEDGER)])
  expect((await bash($)).context).toBeUndefined()
  expect((await bash($, 'a1')).context).toBeUndefined()
  expect(w.files.get(LEDGER)).toBe('# /w · session s1\n\n')
  await done($, 't1')
  await turn($, 't2')
  expect((await bash($)).context).toEqual([note(LABEL, LEDGER)])
  await $.session.compact({ trigger: 'auto', messages: [{ role: 'user', text: 'hi', toolUses: [] }] } as never)
  expect((await bash($)).context).toEqual([note(LABEL, LEDGER)])
})

test('away: AskUserQuestion is answered in the user\'s place; a teammate\'s too, without the ledger', async ($, on) => {
  const w = world(on)
  await start($)
  away(w)
  await poll(w)
  await turn($, 't1')
  expect(await ask($)).toEqual({ deny: askDenied(LABEL, LEDGER) })
  expect(await ask($, 'a1')).toEqual({ deny: askTeammate(LABEL) })
  expect(w.dialogs).toBe(0)
})

test('a dialog open when the user leaves is withdrawn at the next poll', async ($, on) => {
  const w = world(on)
  await start($)
  await turn($, 't1')
  w.gate = new Promise<void>(() => {})
  const asked = ask($)
  await w.clock.advance(1)
  expect(w.dialogs).toBe(1)
  away(w)
  await poll(w)
  expect(await asked).toEqual({ deny: askWithdrawn(LABEL, LEDGER) })
  expect(w.submitted).toEqual([]) // a running turn gets no wake prompt
})

test('away: a Stop is blocked once; again only after more tool calls, up to 5 a turn', async ($, on) => {
  const w = world(on)
  await start($)
  away(w)
  await poll(w)
  await turn($, 't1')
  expect((await stop($)).block).toBe(stopBlock(LABEL, LEDGER))
  expect((await stop($, { stop_hook_active: true })).block).toBeUndefined()
  for (let i = 0; i < 4; i++) {
    await bash($)
    expect((await stop($, { stop_hook_active: true })).block).toBe(stopBlock(LABEL, LEDGER))
  }
  await bash($)
  expect((await stop($, { stop_hook_active: true })).block).toBeUndefined()
  await done($, 't1')
  await turn($, 't2')
  expect((await stop($)).block).toBeDefined()
})

test('away: a Stop that waits on work in flight passes, unless its message asks something', async ($, on) => {
  const w = world(on)
  await start($)
  away(w)
  await poll(w)
  const shell = [{ id: 'b1', type: 'shell', status: 'running', description: 'build' }]
  await turn($, 't1')
  expect((await stop($, { background_tasks: shell })).block).toBeUndefined()
  expect((await stop($, { session_crons: [{ id: 'c1' }] })).block).toBeUndefined()
  expect((await stop($, { background_tasks: shell, last_assistant_message: 'Build running.\n\nShall I also bump the version?' })).block).toBeDefined()
  expect((await stop($, { agent_id: 'a1' })).block).toBeUndefined()
})

test('onset wakes an idle session whose last message asks something, once', async ($, on) => {
  const w = world(on)
  await start($)
  w.last = [{ role: 'user', text: 'fix it' }, { role: 'assistant', text: 'Two options:\n\n1. A\n2. B\n\nWhich do you want?' }]
  away(w)
  await poll(w)
  await poll(w)
  expect(w.submitted).toEqual([onsetPrompt(LABEL, LEDGER)])
})

test('onset leaves an idle session alone when its last message asks nothing', async ($, on) => {
  const w = world(on)
  await start($)
  w.last = [{ role: 'assistant', text: 'Done: tests pass.' }]
  away(w)
  await poll(w)
  expect(w.submitted).toEqual([])
})

test('return wakes a session that logged something or had a question answered, once', async ($, on) => {
  const w = world(on)
  await start($)
  away(w)
  await poll(w)
  w.files.set(LEDGER, '# /w · session s1\n\n- decided: a → b, c\n')
  await poll(w)
  back(w)
  await poll(w)
  await poll(w)
  expect(w.submitted).toEqual([returnPrompt(LEDGER)])
})

test('return: an answered question alone wakes; nothing logged = no wake', async ($, on) => {
  const w = world(on)
  await start($)
  away(w)
  await poll(w)
  await turn($, 't1')
  await ask($)
  await done($, 't1')
  w.files.delete(STATE) // a deleted state file ends the period too
  await poll(w)
  expect(w.submitted).toEqual([returnPrompt(LEDGER)])
})

test('return: nothing logged or asked → no wake', async ($, on) => {
  const w = world(on)
  await start($)
  away(w)
  await poll(w)
  back(w)
  await poll(w)
  expect(w.submitted).toEqual([])
})

test('return: a prompt typed here since the period ended → no wake', async ($, on) => {
  const w = world(on)
  await start($)
  away(w)
  await poll(w)
  w.files.set(LEDGER, '- open: login\n')
  back(w)
  await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } } as never)
  await poll(w)
  expect(w.submitted).toEqual(['hi'])
})

test('/away runs the script with its words and polls at once', async ($, on) => {
  const w = world(on)
  await start($)
  expect(w.commands).toMatchObject([{ name: 'away', immediate: true }])
  away(w)
  const r = await $.command.run({ command: 'away', args: 'until 17:30  2026/11/07 JST', origin: { kind: 'composer' } } as never)
  expect(r.text).toBe('Away until x.')
  expect(w.runs[0]!.slice(1)).toEqual(['until', '17:30', '2026/11/07', 'JST'])
  expect(w.runs[0]![0]!.endsWith('/bin/away')).toBe(true)
  await w.clock.advance(50) // its poll runs just after the command: a wake raised inside it would be refused
  await turn($, 't1')
  expect((await bash($)).context).toEqual([note(LABEL, LEDGER)])
})

test('the prompt hint shows the period and the logged count while away', async ($, on) => {
  const w = world(on)
  await start($)
  const ui = await $.ui.mount({ plugin: 'away', surface: 'terminal', component: 'PromptHint', props: HINT })
  const texts = async () => (await ui.findAll({ type: 'Text' })).map(x => x.text)
  expect(await texts()).toEqual(['engine'])
  away(w)
  w.files.set(LEDGER, '- decided: a → b, c\n- open: d\n')
  await poll(w)
  expect(await texts()).toContain(`Away until ${LABEL}. 2 items logged.`)
})

test('a headless session registers nothing and is never touched', async ($, on) => {
  const w = world(on)
  await start($, false)
  away(w)
  await poll(w)
  await turn($, 't1')
  expect(w.commands).toEqual([])
  expect((await bash($)).context).toBeUndefined()
  expect((await stop($)).block).toBeUndefined()
})

test('text helpers: question heuristic, ledger count, state parse', () => {
  expect(endsInQuestion('Which one?')).toBe(true)
  expect(endsInQuestion('Pick:\n- **A** or B?**\n\nNotes follow.')).toBe(true)
  expect(endsInQuestion('Done.\n```\nwhy?\n```')).toBe(false)
  expect(endsInQuestion(`Is it?\n${'line\n'.repeat(13)}`)).toBe(false)
  expect(endsInQuestion('')).toBe(false)
  expect(logged('# h\n\n- decided: a\n  more\n- open: b\n')).toBe(2)
  expect(parseState('{"id":"p","since":1,"until":2,"label":"x"}')).toEqual({ id: 'p', since: 1, until: 2, label: 'x' })
  expect(parseState('{"id":"","since":1,"until":2,"label":"x"}')).toBeUndefined()
  expect(parseState('nope')).toBeUndefined()
})

test('/away off in a session that logged something wakes it once the command returns', async ($, on) => {
  const w = world(on)
  await start($)
  away(w)
  await poll(w)
  w.files.set(LEDGER, '- decided: a → b, c\n')
  back(w)
  await $.command.run({ command: 'away', args: 'off', origin: { kind: 'composer' } } as never)
  expect(w.submitted).toEqual([])
  await w.clock.advance(50)
  expect(w.submitted).toEqual([returnPrompt(LEDGER)])
})

test('a refused wake is retried at the next poll, onset and return alike', async ($, on) => {
  const w = world(on)
  await start($)
  await w.clock.advance(50) // the start's own poll, before the period
  w.last = [{ role: 'assistant', text: 'Which do you want?' }]
  w.refuse = 1
  away(w)
  await poll(w)
  expect(w.submitted).toEqual([])
  await poll(w)
  await poll(w)
  expect(w.submitted).toEqual([onsetPrompt(LABEL, LEDGER)])
  w.files.set(LEDGER, '- decided: a → b, c\n')
  back(w)
  w.refuse = 1
  await poll(w)
  await poll(w)
  await poll(w)
  expect(w.submitted).toEqual([onsetPrompt(LABEL, LEDGER), returnPrompt(LEDGER)])
})

test('a new period after a return starts fresh: onset + return again', async ($, on) => {
  const w = world(on)
  await start($)
  w.last = [{ role: 'assistant', text: 'Which do you want?' }]
  away(w)
  await poll(w)
  w.files.set(LEDGER, '- decided: a → b, c\n')
  back(w)
  await poll(w)
  away(w, w.clock.now() + 3_600_000, 'p2')
  await poll(w)
  const second = `${DIR}/p2/s1.md`
  expect(w.submitted).toEqual([onsetPrompt(LABEL, LEDGER), returnPrompt(LEDGER), onsetPrompt(LABEL, second)])
})

const typed = ($: Engine, text: string, kind = 'composer') => $.prompt.submit({ text, wait: false, origin: { kind } } as never)

test('a prompt typed here while away takes this session out of away mode for that period, its log first', async ($, on) => {
  const w = world(on)
  await start($)
  away(w)
  await poll(w)
  w.files.set(LEDGER, '# /w · session s1\n\n- decided: a → b, c\n')
  await typed($, 'I am here: status?')
  expect(w.contexts.at(-1)).toEqual([presentNote(LABEL, LEDGER)])
  await turn($, 't1')
  expect((await bash($)).context).toBeUndefined()
  expect((await ask($)).result).toBeDefined()
  expect((await stop($)).block).toBeUndefined()
  await poll(w)
  expect((await bash($)).context).toBeUndefined() // a poll keeps it present
  await done($, 't1')
  back(w)
  await poll(w)
  expect(w.submitted).toEqual(['I am here: status?']) // its log went with the typed prompt: no return wake
  away(w, w.clock.now() + 3_600_000, 'p2')
  await poll(w)
  await turn($, 't2')
  expect((await bash($)).context).toEqual([note(LABEL, `${DIR}/p2/s1.md`)])
})

test('a typed prompt with nothing logged adds no context; the hint says the others are away', async ($, on) => {
  const w = world(on)
  await start($)
  const ui = await $.ui.mount({ plugin: 'away', surface: 'terminal', component: 'PromptHint', props: HINT })
  away(w)
  await poll(w)
  await typed($, 'quick one')
  expect(w.contexts.at(-1)).toBeUndefined()
  await poll(w)
  expect((await ui.findAll({ type: 'Text' })).map(x => x.text)).toContain(`Other sessions are away until ${LABEL}. Type /away off to end the away period.`)
})

test('a phone (bridge) prompt or a slash command leaves the session in away mode', async ($, on) => {
  const w = world(on)
  await start($)
  away(w)
  await poll(w)
  await typed($, 'from the phone', 'bridge')
  await $.prompt.submit({ text: '/away status', wait: false, origin: { kind: 'composer' }, command: { name: 'away' } } as never).catch(() => {})
  await turn($, 't1')
  expect((await bash($)).context).toEqual([note(LABEL, LEDGER)])
  expect((await ask($)).deny).toBe(askDenied(LABEL, LEDGER))
})

test('not away: a failed question dialog comes back unchanged', async ($, on) => {
  const w = world(on)
  await start($)
  w.dialogFails = true
  await turn($, 't1')
  expect(await ask($)).toMatchObject({ result: 'interrupted', text: 'interrupted', isError: true })
})
