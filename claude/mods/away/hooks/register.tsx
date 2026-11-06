import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { askDenied, askTeammate, askWithdrawn, endsInQuestion, header, isAway, logged, note, onsetPrompt, parseState, presentNote, returnPrompt, stopBlock } from './text'
import type { AwayState } from './text'
import type { AwaySeen } from '../types'

// Away state = one file every session reads (bin/away + /away write it) ⇒ a session started mid-away complies too.
const POLL_MS = 30_000
// In flight = turn-email's rule: a Stop that leaves work running ends in a wait, not a question.
const BUSY_TASKS = new Set(['shell', 'subagent', 'workflow', 'cloud session'])
// A blocked Stop re-blocks only after tool calls since ⇒ no loop; the cap bounds a turn that keeps working.
const MAX_BLOCKS = 5
// $.prompt.submit inside command.run = host-refused (it waits on the turn the hook holds) ⇒ hook-raised polls (command.run,
// session.start) run from a timer just after.
const SOON_MS = 50

// Per-period flags (AwaySeen); host state ⇒ a reload neither re-wakes nor re-returns.
const seen = atom({ plugin: 'away', key: 'seen' } as const, { id: '', label: '', asked: 0, woke: '', returned: '', present: '' } as AwaySeen)

let interactive = false
let ticking = false
let again = false
let state: AwayState | undefined
// A prompt typed at this terminal while away = the user is here: this session leaves away mode for that period;
// a phone (bridge) prompt does not, being how one reaches in while away.
let present = ''
const here = (): AwayState | undefined => (state !== undefined && state.id !== present ? state : undefined)
let count = 0
let running = false
let mainTurn = ''
let tools = 0
let noted = ''
let blocks = { turn: '', n: 0, tools: -1 }
let typedAt = 0
// Open main-thread AskUserQuestion dialogs: onset answers them in the user's place.
const waiters = new Set<() => void>()

async function dir($: EngineInterface): Promise<string> {
  return (await $.env.get('CLAUDE_AWAY_DIR')) || `${await $.env.get('HOME')}/.claude/away`
}

async function ledgerPath($: EngineInterface, id: string): Promise<string> {
  return `${await dir($)}/${id}/${await $.session.id()}.md`
}

async function ledger($: EngineInterface, s: AwayState): Promise<string> {
  const path = await ledgerPath($, s.id)
  if (!(await $.fs.exists(path))) await $.fs.write(path, header(await $.session.cwd(), await $.session.id()))
  return path
}

async function lastAssistant($: EngineInterface): Promise<string> {
  const last = (await $.session.messages()).at(-1)
  return last?.role === 'assistant' ? last.text : ''
}

/** Resolves once the prompt is queued (it runs once the session is idle); false = refused ⇒ the next poll retries. */
async function submit($: EngineInterface, text: string): Promise<boolean> {
  return $.prompt.submit({ text }).then(() => true, () => false)
}

/** Onset: open dialogs answer themselves; an idle session whose last message asks something is woken. True = done. */
async function onset($: EngineInterface, s: AwayState): Promise<boolean> {
  for (const wake of waiters) wake()
  if (running || !endsInQuestion(await lastAssistant($))) return true
  return submit($, onsetPrompt(s.label, await ledger($, s)))
}

/** Return: a session that logged something or had a question answered posts it. True = done. */
async function giveBack($: EngineInterface, was: AwaySeen, endedAt: number): Promise<boolean> {
  const path = await ledgerPath($, was.id)
  const entries = logged(await $.fs.read(path).catch(() => ''))
  // Typed here since the end = the user is already in this session.
  if ((entries === 0 && was.asked === 0) || typedAt >= endedAt) return true
  return submit($, returnPrompt(path))
}

async function poll($: EngineInterface): Promise<void> {
  const now = await $.clock.now()
  const file = parseState(await $.fs.read(`${await dir($)}/state.json`).catch(() => ''))
  const s = isAway(file, now) ? file : undefined
  let was = await read($, seen)
  const before = `${state?.id}|${state?.label}|${count}|${present}`
  state = s
  if (s !== undefined) {
    if (was.id !== s.id) was = await update($, seen, () => ({ id: s.id, label: s.label, asked: 0, woke: '', returned: '', present: '' }))
    else if (was.label !== s.label) was = await update($, seen, x => ({ ...x, label: s.label }))
    present = was.present
    count = logged(await $.fs.read(await ledgerPath($, s.id)).catch(() => ''))
    if (was.woke !== s.id && (await onset($, s))) await update($, seen, x => ({ ...x, woke: s.id }))
  } else {
    count = 0
    const endedAt = file !== undefined && file.id === was.id ? file.until : now
    if (was.id !== '' && was.returned !== was.id && (await giveBack($, was, endedAt))) await update($, seen, x => ({ ...x, returned: x.id }))
  }
  if (`${state?.id}|${state?.label}|${count}|${present}` !== before) $.ui.invalidate('ui.render')
}

async function tick($: EngineInterface): Promise<void> {
  if (ticking) {
    again = true
    return
  }
  ticking = true
  do {
    again = false
    await poll($).catch(() => {})
  } while (again)
  ticking = false
}

const soon = ($: EngineInterface) => void $.clock.after(SOON_MS, () => void tick($))

async function asked($: EngineInterface): Promise<void> {
  await update($, seen, x => ({ ...x, asked: x.asked + 1 }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    if (e.isInteractive) {
      await $.command
        .register({ name: 'away', description: 'Tell all sessions that you are away until a time, or that you are back', argumentHint: 'until <time> | for <duration> | off | status | digest', immediate: true })
        .catch(() => {})
    }
    const r = await next(e)
    interactive = e.isInteractive
    if (interactive) {
      $.clock.every(POLL_MS, () => void tick($))
      soon($)
    }
    return r
  })

  on('command.run', { command: 'away' }, async ($, e) => {
    const argv = [`${$.plugin.root}/bin/away`, ...e.args.split(/\s+/).filter(Boolean)]
    const run = await $.process.run(argv, { timeoutMs: 15_000 }).catch((err: unknown) => ({ exitCode: 1, stdout: '', stderr: String(err) }))
    soon($)
    return { text: `${run.stdout}${run.stderr}`.trim() || `away exited ${run.exitCode}` }
  })

  on('prompt.submit', async ($, e, next) => {
    const typed = !e.command && (e.origin.kind === 'composer' || e.origin.kind === 'bridge')
    if (typed) typedAt = await $.clock.now()
    const s = here()
    if (!interactive || !typed || e.origin.kind !== 'composer' || s === undefined) return next(e)
    present = s.id
    const was = await update($, seen, x => ({ ...x, present: s.id, returned: s.id }))
    $.ui.invalidate('ui.render')
    const path = await ledgerPath($, s.id)
    if (logged(await $.fs.read(path).catch(() => '')) === 0 && was.asked === 0) return next(e)
    return next({ ...e, context: [...(e.context ?? []), presentNote(s.label, path)] })
  })

  on('turn.start', (_$, e, next) => {
    if (e.agentId === undefined) {
      running = true
      mainTurn = e.turnId
      tools = 0
    }
    return next(e)
  })

  on('turn.complete', (_$, e, next) => {
    if (e.agentId === undefined) running = false
    return next(e)
  })

  // A summary may drop the note ⇒ the next tool result carries it again.
  on('session.compact', async (_$, e, next) => {
    const r = await next(e)
    if (e.agentId === undefined) noted = ''
    return r
  })

  on('tool.call', async ($, e, next) => {
    if (!interactive) return next(e)
    if (e.tool === 'AskUserQuestion') {
      const s = here()
      if (e.agentId !== undefined) return s ? { deny: askTeammate(s.label) } : next(e)
      if (s) {
        await asked($)
        return { deny: askDenied(s.label, await ledger($, s)) }
      }
      let wake = () => {}
      const left = new Promise<'left'>(resolve => (wake = () => resolve('left')))
      waiters.add(wake)
      try {
        const answer = next(e)
        answer.catch(() => {}) // settled first ⇒ the dialog beneath is abandoned
        const r = await Promise.race([answer, left])
        const now = here()
        if (r !== 'left' || now === undefined) return r === 'left' ? await answer : r
        await asked($)
        return { deny: askWithdrawn(now.label, await ledger($, now)) }
      } finally {
        waiters.delete(wake)
      }
    }
    if (e.agentId !== undefined) return next(e)
    tools++
    const r = await next(e)
    const s = here()
    const key = `${mainTurn}|${s?.id}|${s?.label}`
    if (s === undefined || noted === key || r.deny !== undefined) return r
    noted = key
    return { ...r, context: [...(r.context ?? []), note(s.label, await ledger($, s))] }
  })

  on('classic.Stop', async ($, e, next) => {
    const r = await next(e)
    const s = here()
    if (!interactive || e.agent_id !== undefined || s === undefined || r.block !== undefined) return r
    const waiting = !!e.session_crons?.length || !!e.background_tasks?.some(t => BUSY_TASKS.has(t.type))
    if (waiting && !endsInQuestion(e.last_assistant_message ?? '')) return r
    if (blocks.turn === mainTurn && (blocks.tools === tools || blocks.n >= MAX_BLOCKS)) return r
    blocks = { turn: mainTurn, n: blocks.turn === mainTurn ? blocks.n + 1 : 1, tools }
    return { ...r, block: stopBlock(s.label, await ledger($, s)) }
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const s = state
    if (s === undefined) return next(e)
    const items = `${count} ${count === 1 ? 'item' : 'items'} logged.`
    const line = s.id === present ? `Other sessions are away until ${s.label}. Type /away off to end the away period.` : `Away until ${s.label}.${count ? ` ${items}` : ''}`
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {await next(e)}
        <Text color="warning">{line}</Text>
      </Box>
    )
  })
}
