import type { EngineInterface, Register } from 'claude-code'

import { RESPONSE_MAX, SEND, WAITING, WAKES, compose, mailable, questionsText, typedPrompt } from './mail'
import type { Mail, Question } from './mail'

const KEEP_MS = 7 * 24 * 3_600_000

// Main loop facts, refreshed as the turn runs; Stop + Notification payloads add mode, cwd + transcript.
let model = '?'
let effort = '?'
let mode = '?'
let cwd = ''
let transcript = '?'
let mainOutput = 0
let asking: readonly Question[] | undefined
// The running main turn: its prompts' origins + whether its Stop saw work in flight (teammates, background shells, wakeups).
let origins = new Set<string>()
let idle = true

/** Per session across resumes + reloads: completed-turn count and the last human prompt. */
type Held = { n: number; at: number; prompt?: string }

async function loadTurn($: EngineInterface, session: string): Promise<Held> {
  const v = (await $.store.get(`turn:${session}`)) as { n?: unknown; prompt?: unknown } | undefined
  const prompt = typeof v?.prompt === 'string' ? v.prompt : await lastHuman($)
  return { n: typeof v?.n === 'number' ? v.n : 0, at: await $.clock.now(), prompt }
}

/** Bootstrap for a session the store has not seen (resumed from before the mod): its last human row. */
async function lastHuman($: EngineInterface): Promise<string | undefined> {
  const rows = await $.session.messages()
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i]!
    const text = r.role === 'user' && !r.toolResults?.length ? typedPrompt(r.text) : ''
    if (text) return text
  }
  return undefined
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content
  return Array.isArray(content) ? content.map(b => (b?.type === 'text' && typeof b.text === 'string' ? b.text : '')).join('\n') : ''
}

function note(e: { permission_mode?: string; cwd: string; transcript_path: string; effort?: { level: string } }): void {
  mode = e.permission_mode ?? mode
  cwd = e.cwd || cwd
  transcript = e.transcript_path || transcript
  if (typeof e.effort?.level === 'string') effort = e.effort.level
}

async function prune($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  for (const key of await $.store.keys()) {
    const held = (await $.store.get(key)) as { at?: unknown } | undefined
    if (key.startsWith('turn:') && (typeof held?.at !== 'number' || now - held.at > KEEP_MS)) await $.store.delete(key)
  }
}

async function send($: EngineInterface, session: string, turn: number, prompt: string, text: string, waiting?: Mail['waiting']): Promise<void> {
  const { context } = await $.session.usage()
  const to = (await $.env.get('CLAUDE_TURN_EMAIL_TO')) || 'emir.turkes@eturkes.com'
  const mail = compose({
    to,
    from: (await $.env.get('CLAUDE_TURN_EMAIL_FROM')) || to,
    session,
    turn,
    cwd: cwd || (await $.session.cwd()),
    model,
    effort,
    mode,
    context: context.tokens === undefined ? '?' : `${Math.floor((context.tokens + mainOutput) / 1000)}K`,
    transcript,
    now: await $.clock.now(),
    prompt,
    text,
    waiting,
  })
  await $.process.run(['sh', '-c', SEND, 'sh', `session ${session} turn ${turn}`], { stdin: mail, timeoutMs: 30_000 }).catch(() => {})
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await prune($)
    return next(e)
  })

  // A human row = the turn's prompt or one folded into it; tool results, reminders + subagent rows excluded.
  on('session.append', async ($, e, next) => {
    const m = e.message
    if (e.agentId === undefined && m.type === 'user' && m.isMeta !== true && (e.door === 'prompt' || e.door === 'delivery') && !WAKES.has(e.origin.kind)) {
      const prompt = typedPrompt(textOf(m.content))
      if (prompt) {
        const session = await $.session.id()
        await $.store.set(`turn:${session}`, { ...(await loadTurn($, session)), prompt })
      }
    }
    return next(e)
  })

  on('prompt.submit', (_$, e, next) => {
    origins.add(e.origin.kind)
    return next(e)
  })

  on('turn.step', async function* (_$, e, next) {
    if (e.agentId !== undefined) return yield* next(e)
    model = e.model
    if (typeof e.effort === 'string') effort = e.effort
    const r = yield* next(e)
    if (r.usage) mainOutput = r.usage.output_tokens
    return r
  })

  on('classic.Stop', (_$, e, next) => {
    if (e.agent_id === undefined) {
      note(e)
      idle = !e.background_tasks?.length && !e.session_crons?.length
    }
    return next(e)
  })

  // turn.complete fires once per turn, after any Stop block resolved; interrupts + API errors send nothing.
  on('turn.complete', async ($, e, next) => {
    const r = await next(e)
    const text = e.answer.slice(0, RESPONSE_MAX)
    if (e.agentId !== undefined) return r
    const mail = mailable(origins, idle)
    origins = new Set()
    idle = true
    if (!mail || (e.reason !== 'answer' && e.reason !== 'refusal')) return r
    const session = await $.session.id()
    const h = await loadTurn($, session)
    if (!(h.prompt || text)) return r
    await $.store.set(`turn:${session}`, { ...h, n: h.n + 1 })
    await send($, session, h.n + 1, h.prompt ?? '', text)
    return r
  })

  on('tool.call', { tool: 'AskUserQuestion' }, async (_$, e, next) => {
    if (e.agentId !== undefined) return next(e)
    asking = e.questions
    try {
      return await next(e)
    } finally {
      asking = undefined
    }
  })

  on('classic.Notification', async ($, e, next) => {
    const r = await next(e)
    if (!WAITING.has(e.notification_type)) return r
    note(e)
    const waiting = { type: e.notification_type, message: e.message, questions: asking ? questionsText(asking) : '' }
    const h = await loadTurn($, e.session_id)
    await send($, e.session_id, h.n, h.prompt ?? '', '', waiting)
    return r
  })
}
