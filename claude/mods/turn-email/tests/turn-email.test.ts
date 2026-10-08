import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, SessionMessage } from 'claude-code'

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
function unbase64(s: string): string {
  const clean = s.replace(/[^A-Za-z0-9+/]/g, '')
  const bytes: number[] = []
  for (let i = 0; i < clean.length; i += 4) {
    const n = [0, 1, 2, 3].reduce((acc, k) => (acc << 6) | Math.max(0, B64.indexOf(clean[i + k] ?? 'A')), 0)
    bytes.push((n >> 16) & 255, (n >> 8) & 255, n & 255)
  }
  const pad = (s.match(/=+\s*$/)?.[0].trim().length ?? 0)
  return new TextDecoder().decode(new Uint8Array(bytes.slice(0, bytes.length - pad)))
}

type Sent = { subject: string; body: string; headers: string; argv: readonly string[] }

function parse(mail: string, argv: readonly string[]): Sent {
  const [headers, rest] = mail.split('\n\n') as [string, string]
  const subject = unbase64(headers.match(/^Subject: =\?UTF-8\?B\?(.*)\?=$/m)?.[1] ?? '')
  return { subject, body: unbase64(rest), headers, argv }
}

type World = { sent: Sent[]; gate?: Promise<void>; store: Map<string, unknown>; history: SessionMessage[] }

function world(on: On, store: Record<string, unknown> = {}): World {
  const w: World = { sent: [], store: new Map(Object.entries(store)), history: [] }
  mock.clock(on, { now: Date.UTC(2026, 9, 5, 9, 30) })
  on('store.get', (_$, e) => ({ value: w.store.get(e.key) }))
  on('store.set', (_$, e) => (w.store.set(e.key, e.value), { value: undefined }))
  on('store.delete', (_$, e) => (w.store.delete(e.key), { value: undefined }))
  on('store.keys', () => ({ value: [...w.store.keys()] }))
  mock.env(on, {})
  on('session.id', () => ({ value: 's1' }))
  on('session.cwd', () => ({ value: '/tmp/proj' }))
  on('session.messages', () => ({ value: w.history }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { tokens: 41_500, window: 1_000_000 }, rateLimits: [] } }))
  on('process.run', (_$, e) => {
    w.sent.push(parse(e.init?.stdin ?? '', e.argv))
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.step', async function* (_$, e) {
    const usage = { input_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 500, model: e.model }
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage }
  })
  on('turn.complete', (_$, e) => ({ text: e.answer }))
  on('classic.Stop', () => ({}))
  on('classic.Notification', () => ({}))
  on('session.start', (_$, e) => ({ cwd: e.cwd }))
  on('tool.call', async () => {
    await w.gate
    return { result: { answers: {} }, text: 'answered' }
  })
  return w
}

type TurnOpts = { reason?: string; agentId?: string; kind?: string; inFlight?: boolean }

/** One main turn: `kind` = its prompt's origin; `inFlight` = a teammate still running at Stop. */
async function turn($: Engine, prompt: string, answer: string, { reason = 'answer', agentId, kind = 'composer', inFlight }: TurnOpts = {}): Promise<void> {
  await $.prompt.submit({ text: prompt, wait: false, origin: { kind } } as never)
  await human($, 'prompt', prompt, undefined, kind === 'composer' ? 'human' : kind)
  await $.turn.start({ text: prompt, turnId: 't' })
  for await (const c of $.turn.step({ turnId: 't', index: 0, model: 'claude-opus-5-5', effort: 'xhigh', messageCount: 1 } as never)) void c
  const background_tasks = inFlight ? [{ id: 'a1', type: 'in_process_teammate', status: 'running', description: 'reviewer-1' }] : []
  await $.classic.Stop({ stop_hook_active: false, last_assistant_message: answer, permission_mode: 'bypassPermissions',
    cwd: '/tmp/proj', transcript_path: '/t/s1.jsonl', background_tasks, session_crons: [] } as never)
  await $.turn.complete({ answer, durationMs: 1, isAborted: reason === 'aborted', turnId: 't', reason, agentId,
    usage: { input_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 1, model: 'claude-opus-5-5' } } as never)
}
const question = { header: 'Scope', question: 'Ship it?', multiSelect: false,
  options: [{ label: 'Yes', description: 'go' }, { label: 'No', description: 'stop' }] }
const notify = ($: Engine, message: string) =>
  $.classic.Notification({ notification_type: 'permission_prompt', message, session_id: 's1', cwd: '/tmp/proj', transcript_path: '/t/s1.jsonl' } as never)

test('a completed turn mails its prompt and response, threaded per session', async ($, on) => {
  const w = world(on)
  await turn($, 'Run the gate<system-reminder>noise</system-reminder>', 'Done: all green.')
  await turn($, 'Again', 'Done twice.')
  const [first, second] = w.sent
  expect(first!.subject).toBe('[cc] proj #1 — Run the gate')
  expect(first!.body).toContain('Run the gate\n')
  expect(first!.body).not.toContain('noise')
  expect(first!.body).toContain('Done: all green.')
  expect(first!.body).toContain('Model     : claude-opus-5-5 · effort xhigh · bypassPermissions')
  expect(first!.body).toContain('Context   : 42K')
  expect(first!.body).toMatch(/Time      : 2026-10-0[45] \d\d:\d0:00 [+-]\d{4}\n/)
  expect(first!.body).toContain('Transcript: /t/s1.jsonl')
  expect(first!.headers).toContain('Message-ID: <cc.s1.1@eturkes.com>')
  expect(first!.headers).toContain('References: <cc.s1@eturkes.com>')
  expect(first!.headers).toContain('To: emir.turkes@eturkes.com')
  expect(second!.subject).toBe('[cc] proj #2 — Again')
})

test('interrupted, failed and subagent turns send nothing', async ($, on) => {
  const w = world(on)
  await turn($, 'x', 'partial', { reason: 'aborted' })
  await turn($, 'x', '', { reason: 'error' })
  await turn($, 'x', 'sub', { agentId: 'a1' })
  expect(w.sent).toEqual([])
})

test('a waiting question is mailed with its options; an answered one is not', async ($, on) => {
  const w = world(on)
  await turn($, 'Plan it', 'Planned.')
  let release = () => {}
  w.gate = new Promise<void>(resolve => (release = resolve))
  const asked = $.tool.call({ tool: 'AskUserQuestion', questions: [question] } as never)
  await notify($, 'Claude needs your input')
  release()
  await asked
  await notify($, 'Claude needs your permission to use Bash')
  const [, waiting, permission] = w.sent
  expect(waiting!.subject).toBe('[cc] proj #1 needs input — [Scope] Ship it?')
  expect(waiting!.body).toContain('pending: permission_prompt — Claude needs your input\n\n[Scope] Ship it?\n  - Yes: go\n  - No: stop')
  expect(waiting!.headers).toContain('Message-ID: <cc.s1.1.ask.')
  expect(permission!.subject).toBe('[cc] proj #1 needs input — Claude needs your permission to use Bash')
  expect(permission!.body).not.toContain('Ship it?')
})

test('other notifications send nothing', async ($, on) => {
  const w = world(on)
  await $.classic.Notification({ notification_type: 'idle_prompt', message: 'idle', session_id: 's1', cwd: '/tmp/proj', transcript_path: '/t' } as never)
  expect(w.sent).toEqual([])
})

test('counters older than seven days are pruned at session start', async ($, on) => {
  const now = Date.UTC(2026, 9, 5, 9, 30)
  const w = world(on, { 'turn:old': { n: 4, at: now - 8 * 86_400_000 }, 'turn:s1': { n: 6, at: now - 86_400_000 } })
  await $.session.start({ cwd: '/tmp/proj', surface: null, isInteractive: false })
  expect([...w.store.keys()]).toEqual(['turn:s1'])
  await turn($, 'Next', 'ok')
  expect(w.sent[0]!.subject).toBe('[cc] proj #7 — Next')
  await turn($, 'Again', 'ok')
  expect(w.sent[1]!.subject).toBe('[cc] proj #8 — Again')
})

test('mail goes to the relay script behind its msmtp + config guard', async ($, on) => {
  const w = world(on)
  await turn($, 'x', 'y')
  expect(w.sent[0]!.argv[2]).toContain('command -v msmtp >/dev/null 2>&1 && [ -r "$HOME/.msmtprc" ] || exit 0')
})

/** A row reaching the main conversation; the kit keeps none beneath the plugins. */
async function human($: Engine, door: string, text: string, isMeta?: true, kind = 'human'): Promise<void> {
  await $.session.append({ door, origin: { kind }, uuid: `h-${text}`,
    message: { type: 'user', role: 'user', isMeta, content: [{ type: 'text', text }] } } as never).catch((err: unknown) => {
    if (!String(err).includes('no implementation for session.append')) throw err
  })
}

test('the first waiting mail reads mode and effort from its own payload', async ($, on) => {
  const w = world(on)
  await $.classic.Notification({ notification_type: 'permission_prompt', message: 'Need permission', session_id: 's1', cwd: '/tmp/proj',
    transcript_path: '/t/s1.jsonl', permission_mode: 'bypassPermissions', effort: { level: 'max' } } as never)
  expect(w.sent[0]!.body).toContain('· effort max · bypassPermissions')
})

test('a prompt folded into the running turn becomes the mail prompt; meta rows do not', async ($, on) => {
  const w = world(on)
  await human($, 'prompt', 'Initial task')
  await $.turn.start({ text: 'Initial task', turnId: 't' })
  await human($, 'delivery', 'Revised task')
  await human($, 'delivery', 'reminder text', true)
  await $.turn.complete({ answer: 'Done.', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as never)
  expect(w.sent[0]!.subject).toBe('[cc] proj #1 — Revised task')
})

test('a resumed session keeps its last prompt for an empty continuation', async ($, on) => {
  const now = Date.UTC(2026, 9, 5, 9, 30)
  const w = world(on, { 'turn:s1': { n: 3, at: now - 60_000, prompt: 'Original task' } })
  await $.turn.start({ text: '', turnId: 't' })
  await $.turn.complete({ answer: 'Continued.', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as never)
  expect(w.sent[0]!.subject).toBe('[cc] proj #4 — Original task')
  expect(w.sent[0]!.body).toContain('\nOriginal task\n')
})

test('a session resumed before the mod knew it falls back to the last human row', async ($, on) => {
  const w = world(on)
  w.history = [
    { role: 'user', text: 'Original task<system-reminder>r</system-reminder>', toolUses: [] },
    { role: 'assistant', text: 'Working.', toolUses: [] },
    { role: 'user', text: '', toolUses: [], toolResults: [{ tool_use_id: 'x', text: 'ok', isError: false }] },
  ]
  await $.turn.start({ text: '', turnId: 't' })
  await $.turn.complete({ answer: 'Continued.', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as never)
  expect(w.sent[0]!.subject).toBe('[cc] proj #1 — Original task')
})

test('wake-started turns mail only once nothing is in flight, under the last typed prompt', async ($, on) => {
  const w = world(on)
  await turn($, 'Dispatch the reviewers', 'Dispatched.', { inFlight: true })
  await turn($, '<task-notification>\n<task-id>b1</task-id>', 'Shell done.', { kind: 'task-notification', inFlight: true })
  await turn($, 'Another Claude session sent a message: <teammate-message teammate_id="r1">', 'r1 idle.', { kind: 'unclassified', inFlight: true })
  expect(w.sent.map(m => m.subject)).toEqual(['[cc] proj #1 — Dispatch the reviewers'])
  await turn($, '<agent-message from="reviewer-1">verdicts ready</agent-message>', 'Run complete.', { kind: 'peer' })
  expect(w.sent[1]!.subject).toBe('[cc] proj #2 — Dispatch the reviewers')
  expect(w.sent[1]!.body).toContain('Run complete.')
})

test('a prompt typed into a wake-started turn mails it', async ($, on) => {
  const w = world(on)
  await turn($, '<task-notification>', 'Noted.', { kind: 'task-notification', inFlight: true })
  expect(w.sent).toEqual([])
  await $.prompt.submit({ text: 'Status?', wait: false, origin: { kind: 'task-notification' } } as never)
  await $.prompt.submit({ text: 'Status?', wait: false, turnId: 't', origin: { kind: 'composer' } } as never)
  await $.turn.complete({ answer: 'Two running.', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as never)
  expect(w.sent).toHaveLength(1)
})

test('headless claude -p turns send nothing', async ($, on) => {
  const w = world(on)
  await turn($, 'Answer from the context loaded at session start, else reply NO', 'NO', { kind: 'sdk' })
  expect(w.sent).toEqual([])
})

test('the fallback scan skips compaction summaries and wake deliveries', async ($, on) => {
  const w = world(on)
  w.history = [
    { role: 'user', text: 'Ship M9.8a', toolUses: [] },
    { role: 'user', text: 'This session is being continued from a previous conversation that ran out of context.', toolUses: [] },
    { role: 'user', text: '<task-notification>\n<task-id>b1</task-id>', toolUses: [] },
  ]
  await $.turn.start({ text: '', turnId: 't' })
  await $.turn.complete({ answer: 'Committed.', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as never)
  expect(w.sent[0]!.subject).toBe('[cc] proj #1 — Ship M9.8a')
})
