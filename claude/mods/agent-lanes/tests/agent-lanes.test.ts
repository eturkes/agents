import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { DEFAULT_MODEL, NUDGE, describeLanes, refusal } from '../hooks/lanes'

type World = { spawned: { model?: string; subagentType: string; name?: string }[]; calls: Record<string, unknown>[] }

function world(on: On, env: Record<string, string> = {}): World {
  const w: World = { spawned: [], calls: [] }
  mock.env(on, env)
  on('agent.spawn', (_$, e) => {
    w.spawned.push({ model: e.model, subagentType: e.subagentType, name: e.name })
    return { model: e.model ?? 'parent', agentId: `id-${e.name ?? w.spawned.length}` }
  })
  on('tool.call', (_$, e) => {
    w.calls.push(e as Record<string, unknown>)
    return { result: 'ok', text: 'ok' }
  })
  on('tool.describe', (_$, e) => ({ description: e.description }))
  on('classic.SubagentStop', () => ({}))
  return w
}

const spawn = ($: Engine, subagentType: string, model?: string, name?: string, extra: Record<string, unknown> = {}) =>
  $.agent.spawn({ prompt: 'p', description: 'd', subagentType, model, name, ...extra } as never)
const agentCall = ($: Engine, input: Record<string, unknown>) =>
  $.tool.call({ tool: 'Agent', description: 'd', prompt: 'p', ...input } as never)
const stop = ($: Engine, agent_id: string, stop_hook_active = false) =>
  $.classic.SubagentStop({ agent_id, stop_hook_active, agent_transcript_path: '/t.jsonl', agent_type: 'reviewer' } as never)

test('each alias spawns its lane model; no alias spawns sol', async ($, on) => {
  const w = world(on)
  await spawn($, 'reviewer')
  await spawn($, 'general-purpose', 'sonnet')
  await spawn($, 'researcher', 'haiku')
  await spawn($, 'consultant', 'opus')
  expect(w.spawned.map(s => s.model)).toEqual([DEFAULT_MODEL, 'gpt-6.1-terra', 'gpt-6.1-terra', 'gpt-6-astra'])
})

test('roles default to their lane; a named alias outranks the role', async ($, on) => {
  const w = world(on)
  await spawn($, 'operator')
  await spawn($, 'scientist')
  await spawn($, 'scientist', 'sonnet')
  expect(w.spawned.map(s => s.model)).toEqual(['gpt-6.1-terra', 'gpt-6-astra', 'gpt-6.1-terra'])
})

test('the launch pin replaces the default lane alone', async ($, on) => {
  const w = world(on, { CLAUDE_CODE_SUBAGENT_MODEL: 'gpt-6-luna' })
  await spawn($, 'reviewer')
  await spawn($, 'operator')
  await spawn($, 'general-purpose', 'opus')
  expect(w.spawned.map(s => s.model)).toEqual(['gpt-6-luna', 'gpt-6.1-terra', 'gpt-6-astra'])
})

test('a GPT id passes; fable, inherit and Claude ids are refused; forks + resumes pass untouched', async ($, on) => {
  const w = world(on)
  await spawn($, 'general-purpose', 'gpt-6-luna')
  for (const m of ['fable', 'inherit', 'claude-opus-5-5']) expect(await spawn($, 'general-purpose', m)).toEqual({ deny: refusal(m) })
  await spawn($, 'fork', undefined, undefined, { fork: true })
  await spawn($, 'reviewer', 'haiku', 'reviewer-1', { resume: { agentId: 'id-reviewer-1' } })
  expect(w.spawned.map(s => s.model)).toEqual(['gpt-6-luna', undefined, 'haiku'])
})

test('Agent calls gain the lane effort when they name none, keep their own, and fable is refused', async ($, on) => {
  const w = world(on)
  await agentCall($, { model: 'haiku' })
  await agentCall($, { model: 'opus', effort: 'high' })
  await agentCall($, { subagent_type: 'scientist' })
  await agentCall($, { model: 'sonnet' })
  await agentCall($, {})
  await agentCall($, { subagent_type: 'fork', model: 'opus' })
  expect(w.calls.map(c => c.effort)).toEqual(['medium', 'high', 'max', undefined, undefined, undefined])
  expect(await agentCall($, { model: 'fable' })).toEqual({ deny: refusal('fable') })
  expect(w.calls).toHaveLength(6)
})

test('the Agent tool description carries the lanes', async ($, on) => {
  world(on)
  const r = await $.tool.describe({ tool: 'Agent', description: 'Launch a new agent.' } as never)
  expect(r.description).toBe(`Launch a new agent.\n\n${describeLanes()}`)
  expect(r.description).toContain('`haiku` → gpt-6.1-terra at medium effort')
})

test('a terra agent is sent back once at its first stop; others stop freely', async ($, on) => {
  world(on)
  await spawn($, 'operator', undefined, 'operator-1')
  await spawn($, 'reviewer', undefined, 'reviewer-1')
  expect(await stop($, 'id-operator-1')).toEqual({ block: NUDGE })
  expect(await stop($, 'id-operator-1')).toEqual({})
  expect(await stop($, 'id-reviewer-1')).toEqual({})
})

test('a stop already re-prompted by a hook is not sent back', async ($, on) => {
  world(on)
  await spawn($, 'researcher', 'haiku', 'researcher-1')
  expect(await stop($, 'id-researcher-1', true)).toEqual({})
  expect(await stop($, 'id-researcher-1')).toEqual({ block: NUDGE })
})
