import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelUsage, Register } from 'claude-code'

import type { AgentFlowAgent, AgentFlowTask } from '../types'
import {
  CLOSING, COMPACT_NOTE, QUIET_MS, REISSUE_MS, REPORT_REJECTION, SPAWN_NOTE, WROTE_NOTHING_MIN,
  agentEntries, isDurable, lastMarker, stopHold, trigger, wakeText, wroteNothing,
} from './text'

const agents = atom({ plugin: 'agent-flow', key: 'agents' } as const, {})
// The agent line redraws on each record write; a finish or kill writes none ⇒ a poll of the running set redraws on change.
const LIST_EVERY_MS = 5_000
let listKey: string | undefined
// CC wakes an idle teammate for its inbox, a typed message, the task list + its crons alone ⇒ its own background shell's
// or monitor's notice waits for a turn only a message starts → a 30-s check relays the notice to its inbox.
const WAKE_EVERY_MS = 30_000
// The notice is queued as the closing line lands ⇒ a request this soon after may predate it.
const NOTICE_MS = 5_000
const sessionDir = atom({ plugin: 'agent-flow', key: 'sessionDir' } as const, '')
let waking = false

function total(u: ModelUsage): number {
  return u.input_tokens + u.cache_creation_input_tokens + u.cache_read_input_tokens + u.output_tokens
}

function textOf(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.map(b => (b?.type === 'text' && typeof b.text === 'string' ? b.text : '')).join(' ')
}

async function patch($: EngineInterface, id: string, change: (a: AgentFlowAgent) => AgentFlowAgent, isActivity = true): Promise<AgentFlowAgent> {
  const now = await $.clock.now()
  const all = await update($, agents, m => {
    const a: AgentFlowAgent = m[id] ?? { targets: [], tools: 0, durable: 0, inTurn: false, activeAt: now }
    return { ...m, [id]: change(isActivity ? { ...a, activeAt: now } : a) }
  })
  return all[id]!
}

/** Teammate compaction trigger = the agent line's denominator. */
async function compactAt($: EngineInterface): Promise<number> {
  const window = Number(await $.env.get('CLAUDE_CODE_MAX_CONTEXT_TOKENS')) || 200_000
  const acw = Number(await $.env.get('CLAUDE_CODE_AUTO_COMPACT_WINDOW')) || 0
  return trigger(window, acw)
}

async function pollList($: EngineInterface): Promise<void> {
  const key = (await $.agent.list()).map(x => `${x.id}:${x.status}`).join(' ')
  if (key !== listKey) {
    listKey = key
    $.ui.invalidate('ui.render')
  }
}

/** CC refused the write by basename alone ⇒ perform it, answering as Write does. */
async function writeReport($: EngineInterface, path: string, content: string) {
  const original = (await $.fs.exists(path)) ? String(await $.fs.read(path)) : null
  await $.process.run(['mkdir', '-p', path.slice(0, path.lastIndexOf('/')) || '/'])
  await $.fs.write(path, content)
  const type = original === null ? ('create' as const) : ('update' as const)
  return { result: { type, filePath: path, content, structuredPatch: [], originalFile: original } }
}

/** A teammate's background shell or monitor, unless CC ends it with the caller's final response or wakes its owner. */
async function track($: EngineInterface, agentId: string, e: { tool: string }, result: unknown): Promise<void> {
  const r = (typeof result === 'object' && result !== null ? result : {}) as {
    backgroundTaskId?: unknown; taskId?: unknown; backgroundEndsWithFinalResponse?: unknown; backgroundWakesOwner?: unknown
  }
  const id = e.tool === 'Bash' ? r.backgroundTaskId : e.tool === 'Monitor' ? r.taskId : undefined
  if (typeof id !== 'string' || r.backgroundEndsWithFinalResponse === true || r.backgroundWakesOwner === true) return
  const input = e as { description?: unknown; command?: unknown }
  const what = String(input.description || input.command || e.tool).slice(0, 160)
  await patch($, agentId, a => ({ ...a, tasks: [...(a.tasks ?? []).filter(t => t.id !== id), { id, what }] }), false)
}

/** `<tmp>/claude-<uid>/<project>/<session id>`, found once per session (a resume in the process moves it): the hook
 * result names no output path. */
async function taskDir($: EngineInterface): Promise<string | undefined> {
  const session = await $.session.id()
  const known = await read($, sessionDir)
  if (known.endsWith(`/${session}`)) return `${known}/tasks`
  const tmp = ((await $.env.get('TMPDIR')) || '/tmp').replace(/\/+$/, '')
  const argv = ['find', tmp, '-mindepth', '3', '-maxdepth', '3', '-type', 'd', '-path', `${tmp}/claude-*/*/${session}`]
  const found = (await $.process.run(argv, { timeoutMs: 10_000 }).catch(() => undefined))?.stdout.split('\n')[0]?.trim()
  if (!found) return undefined
  await update($, sessionDir, () => found)
  return `${found}/tasks`
}

/** The closing line's write time, or undefined while the task runs (or its file is unreadable). */
async function endedAt($: EngineInterface, file: string): Promise<number | undefined> {
  const tail = await $.process.run(['tail', '-c', '200', file]).catch(() => undefined)
  if (tail?.exitCode !== 0 || !CLOSING.test(tail.stdout)) return undefined
  return (await $.fs.stat(file).catch(() => undefined))?.mtimeMs
}

/** Ended task + idle owner + no request of its since the end → one inbox message; a gone owner's tasks drop. */
async function wakeIdle($: EngineInterface): Promise<void> {
  const owners = Object.entries(await read($, agents)).filter(([, a]) => a.tasks?.length)
  if (owners.length === 0) return
  const list = await $.agent.list()
  for (const [id, a] of owners) {
    const status = list.find(x => x.id === id)?.status
    if (status === 'pending' || status === 'running' || status === 'waiting') continue // its next request reads the notice
    const done = new Set<string>()
    const ended: (AgentFlowTask & { file: string })[] = []
    const dir = status === 'idle' ? await taskDir($) : undefined
    for (const t of a.tasks ?? []) {
      if (status !== 'idle') {
        done.add(t.id)
        continue
      }
      if (dir === undefined) continue
      const file = `${dir}/${t.id}.output`
      const end = await endedAt($, file)
      if (end === undefined) continue
      done.add(t.id)
      if ((a.stepAt ?? 0) <= end + NOTICE_MS) ended.push({ ...t, file })
    }
    if (done.size === 0) continue
    await patch($, id, x => ({ ...x, tasks: (x.tasks ?? []).filter(t => !done.has(t.id)) }), false)
    if (ended.length > 0) await $.session.send({ to: { agentId: id }, text: wakeText(ended) }).catch(() => {})
  }
}

/** A mid-turn teammate's first TaskStop is held: a stop cuts its in-flight call and rows. */
async function holdStop($: EngineInterface, asked: string): Promise<string | undefined> {
  const now = await $.clock.now()
  const [found] = Object.entries(await read($, agents))
    .filter(([id, a]) => a.name === asked || id === asked)
    .sort(([, x], [, y]) => y.activeAt - x.activeAt)
  if (!found) return undefined
  const [id, a] = found
  const isMidTurn = a.inTurn && now - a.activeAt < QUIET_MS
  const isReissue = a.heldAt !== undefined && now - a.heldAt < REISSUE_MS
  const held = isMidTurn && !isReissue ? now : undefined
  await patch($, id, x => ({ ...x, heldAt: held }), false)
  return held === undefined ? undefined : stopHold(asked, a.marker, a.targets)
}

export const register: Register = on => {
  on('session.start', ($, e, next) => {
    $.clock.every(LIST_EVERY_MS, () => void pollList($))
    $.clock.every(WAKE_EVERY_MS, () => {
      if (waking) return
      waking = true
      void wakeIdle($).catch(() => {}).finally(() => (waking = false))
    })
    return next(e)
  })

  // The plugin status row truncates to one line ⇒ this PromptHint site, in that row's warning colour; entries wrap whole.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const entries = agentEntries(await $.agent.list(), await read($, agents), await compactAt($))
    if (entries.length === 0) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {await next(e)}
        <Box flexWrap="wrap" columnGap={1}>
          {entries.map((x, i) => <Text color="warning">{i < entries.length - 1 ? `${x} ·` : x}</Text>)}
        </Box>
      </Box>
    )
  })

  on('agent.spawn', async ($, e, next) => {
    const r = await next({ ...e, prompt: `${e.prompt}\n\n${SPAWN_NOTE}` })
    if (r.agentId !== undefined) await patch($, r.agentId, a => ({ ...a, name: e.name ?? a.name, inTurn: true }))
    return r
  })

  // Agent({ name }) spawns a teammate past agent.spawn ⇒ its brief = its first user row, seen before any other event of its loop.
  // A loop tracked before this hook loaded (hot reload) gains its name on its next row, never the note.
  on('session.append', async ($, e, next) => {
    if (e.agentId === undefined || e.message.type !== 'user') return next(e)
    const id = e.agentId
    const marker = lastMarker(textOf(e.message.content))
    const known = (await read($, agents))[id]
    const teammate = known?.listed ? undefined : (await $.agent.list()).find(x => x.id === id && x.type === 'teammate')
    if (!known?.listed || marker !== undefined) {
      await patch($, id, a => ({ ...a, listed: true, name: teammate?.name ?? a.name, marker: marker ?? a.marker }))
    }
    if (known !== undefined || teammate === undefined) return next(e)
    return next({ ...e, message: { ...e.message, content: [...e.message.content, { type: 'text', text: SPAWN_NOTE }] } })
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) return yield* next(e)
    const id = e.agentId
    const now = await $.clock.now()
    await patch($, id, a => ({ ...a, inTurn: true, stepAt: now, model: a.model ?? e.model, effort: e.effort === undefined ? a.effort : String(e.effort) }))
    const r = yield* next(e)
    if (r.usage) {
      const used = total(r.usage)
      const model = r.usage.model || e.model
      await patch($, id, a => ({ ...a, used, model }))
    }
    return r
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) await patch($, e.agentId, a => ({ ...a, inTurn: false }))
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId === undefined) {
      if (e.tool !== 'TaskStop') return next(e)
      const hold = await holdStop($, (e.task_id ?? e.shell_id ?? '').replace(/@.*/s, ''))
      return hold === undefined ? next(e) : { deny: hold }
    }
    const input = e as { file_path?: unknown; notebook_path?: unknown; command?: unknown }
    const target = e.tool === 'NotebookEdit' ? input.notebook_path : e.tool === 'Write' || e.tool === 'Edit' ? input.file_path : undefined
    const isWrite = isDurable(e.tool, input) ? 1 : 0
    await patch($, e.agentId, a => ({
      ...a,
      tools: a.tools + 1,
      durable: a.durable + isWrite,
      targets: typeof target === 'string' ? [target, ...a.targets.filter(t => t !== target)] : a.targets,
    }))
    const r = await next(e)
    if (e.tool === 'Write' && r.deny === undefined && r.isError === true && r.text?.includes(REPORT_REJECTION)) {
      return writeReport($, e.file_path, e.content)
    }
    if (r.deny === undefined && r.isError !== true) await track($, e.agentId, e, r.result).catch(() => {})
    return r
  })

  on('classic.SubagentStop', async ($, e, next) => {
    const r = await next(e)
    if (e.stop_hook_active) return r
    const a = (await read($, agents))[e.agent_id]
    if (a === undefined || a.durable > 0 || a.tools < WROTE_NOTHING_MIN) return r
    return { ...r, additionalContext: [...(r.additionalContext ?? []), wroteNothing(a.tools)] }
  })

  on('session.compact', (_$, e, next) =>
    next({ ...e, instructions: e.instructions ? `${e.instructions}\n\n${COMPACT_NOTE}` : COMPACT_NOTE }))
}
