import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { DEFAULT_MODEL, EARLY_PHASE, EFFORTS, LANES, NUDGE, ROLE_LANES, describeLanes, laneEffort, phaseLine, refusal } from '../hooks/lanes'
import type { Lane } from '../hooks/lanes'

type World = { spawned: { model?: string; subagentType: string; name?: string }[]; calls: Record<string, unknown>[]; steps: unknown[] }

function world(on: On, env: Record<string, string> = {}, spec?: string): World {
  const w: World = { spawned: [], calls: [], steps: [] }
  mock.env(on, env)
  on('session.cwd', () => ({ value: '/w' }))
  on('fs.exists', (_$, e) => ({ value: spec !== undefined && e.path === '/w/.agent/spec.md' }))
  on('fs.read', () => ({ value: spec ?? '' }))
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
  on('turn.step', async function* (_$, e) {
    w.steps.push(e.effort)
    const usage = { input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0, model: e.model }
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage }
  })
  return w
}

const spawn = ($: Engine, subagentType: string, model?: string, name?: string, extra: Record<string, unknown> = {}) =>
  $.agent.spawn({ prompt: 'p', description: 'd', subagentType, model, name, ...extra } as never)
const agentCall = ($: Engine, input: Record<string, unknown>) =>
  $.tool.call({ tool: 'Agent', description: 'd', prompt: 'p', ...input } as never)
const stop = ($: Engine, agent_id: string, stop_hook_active = false) =>
  $.classic.SubagentStop({ agent_id, stop_hook_active, agent_transcript_path: '/t.jsonl', agent_type: 'reviewer' } as never)

async function step($: Engine, agentId: string | undefined, effort = 'xhigh'): Promise<void> {
  for await (const chunk of $.turn.step({ turnId: 't', index: 0, model: 'm', effort, messageCount: 1, agentId } as never)) void chunk
}

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
  await spawn($, 'classifier')
  await spawn($, 'scientist', 'sonnet')
  expect(w.spawned.map(s => s.model)).toEqual(['gpt-6.1-terra', 'gpt-6-astra', 'gpt-6.1-sol', 'gpt-6.1-terra'])
})

test('the launch pin replaces the default lane alone', async ($, on) => {
  const w = world(on, { CLAUDE_CODE_SUBAGENT_MODEL: 'gpt-6-luna' })
  await spawn($, 'reviewer')
  await spawn($, 'operator')
  await spawn($, 'classifier')
  await spawn($, 'general-purpose', 'opus')
  expect(w.spawned.map(s => s.model)).toEqual(['gpt-6-luna', 'gpt-6.1-terra', 'gpt-6.1-sol', 'gpt-6-astra'])
})

test('a GPT id passes; fable, inherit and Claude ids are refused; forks + resumes pass untouched', async ($, on) => {
  const w = world(on)
  await spawn($, 'general-purpose', 'gpt-6-luna')
  for (const m of ['fable', 'inherit', 'claude-opus-5-5']) expect(await spawn($, 'general-purpose', m)).toEqual({ deny: refusal(m) })
  await spawn($, 'fork', undefined, undefined, { fork: true })
  await spawn($, 'reviewer', 'haiku', 'reviewer-1', { resume: { agentId: 'id-reviewer-1' } })
  expect(w.spawned.map(s => s.model)).toEqual(['gpt-6-luna', undefined, 'haiku'])
})

test('each lane shifts MAIN\'s effort, clamped to the ladder, raised to its floor; MAIN\'s unknown → none', () => {
  const lanes: (Lane | undefined)[] = [undefined, LANES.sonnet, LANES.haiku, ROLE_LANES.classifier as Lane, LANES.opus]
  expect(EFFORTS.map(m => lanes.map(l => laneEffort(l, m)))).toEqual([
    ['low', 'low', 'medium', 'low', 'medium'],
    ['medium', 'medium', 'medium', 'low', 'high'],
    ['high', 'high', 'medium', 'low', 'xhigh'],
    ['xhigh', 'xhigh', 'high', 'medium', 'max'],
    ['max', 'max', 'xhigh', 'high', 'max'],
  ])
  expect(['', undefined, 'ultra'].map(m => laneEffort(LANES.haiku, m))).toEqual([undefined, undefined, undefined])
})

test('Agent calls gain their lane\'s effort from MAIN\'s, keep their own, and fable is refused', async ($, on) => {
  const w = world(on)
  await step($, undefined, 'xhigh')
  await agentCall($, { model: 'haiku' })
  await agentCall($, { model: 'opus', effort: 'high' })
  await agentCall($, { subagent_type: 'scientist' })
  await agentCall($, { subagent_type: 'classifier' })
  await agentCall($, { model: 'sonnet' })
  await agentCall($, {})
  await agentCall($, { subagent_type: 'fork', model: 'opus' })
  expect(w.calls.map(c => c.effort)).toEqual(['high', 'high', 'max', 'medium', 'xhigh', 'xhigh', undefined])
  expect(await agentCall($, { model: 'fable' })).toEqual({ deny: refusal('fable') })
  expect(w.calls).toHaveLength(7)
})

test('before MAIN\'s first request, Agent calls keep their own effort or none', async ($, on) => {
  const w = world(on)
  await agentCall($, { model: 'haiku' })
  await agentCall($, { model: 'opus', effort: 'low' })
  expect(w.calls.map(c => c.effort)).toEqual([undefined, 'low'])
})

test('the Agent tool description carries the lanes', async ($, on) => {
  world(on)
  const r = await $.tool.describe({ tool: 'Agent', description: 'Launch a new agent.' } as never)
  expect(r.description).toBe(`Launch a new agent.\n\n${describeLanes()}`)
  expect(r.description).toContain('`haiku` → gpt-6.1-terra at MAIN effort −1, floor medium')
  expect(r.description).toContain('classifier → gpt-6.1-sol at MAIN effort −2')
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

const spec = (phase: string) => `## Intent\n\nx\n\n## Phase\n\n${phase}\n> request\n`

test('phaseLine reads the first non-blank Phase line past a BOM + fenced blocks', () => {
  expect(phaseLine(`\uFEFF${spec('PROTOTYPE — ui')}`)).toBe('PROTOTYPE — ui')
  expect(phaseLine('## Phase\n```\n## Phase\nITERATE — x\n```\nIMPLEMENT — core\r\n')).toBe('IMPLEMENT — core')
  expect(phaseLine('## Intent\nPROTOTYPE — ui\n')).toBeUndefined()
  expect(['PROTOTYPE — ui', 'Phase: ITERATE — x', 'IMPLEMENT — core', 'ITERATE —'].map(l => EARLY_PHASE.test(l))).toEqual([true, true, false, false])
})

test('PROTOTYPE + ITERATE route opus + scientist to the default lane at MAIN\'s effort', async ($, on) => {
  const w = world(on, {}, spec('Phase: ITERATE — ui'))
  await step($, undefined, 'xhigh')
  await spawn($, 'general-purpose', 'opus')
  await spawn($, 'scientist')
  await spawn($, 'operator')
  await agentCall($, { model: 'opus' })
  await agentCall($, { subagent_type: 'scientist' })
  await agentCall($, { model: 'haiku' })
  expect(w.spawned.map(s => s.model)).toEqual([DEFAULT_MODEL, DEFAULT_MODEL, 'gpt-6.1-terra'])
  expect(w.calls.map(c => c.effort)).toEqual(['xhigh', 'xhigh', 'high'])
})

test('IMPLEMENT keeps astra one effort above MAIN', async ($, on) => {
  const w = world(on, {}, spec('IMPLEMENT — core'))
  await step($, undefined, 'high')
  await spawn($, 'scientist')
  await agentCall($, { model: 'opus' })
  expect(w.spawned.map(s => s.model)).toEqual(['gpt-6-astra'])
  expect(w.calls.map(c => c.effort)).toEqual(['xhigh'])
})

test('each agent runs every request at its call effort, whatever the session\'s teammate default; MAIN keeps its own', async ($, on) => {
  const w = world(on)
  await step($, undefined, 'medium')
  await agentCall($, { model: 'haiku', name: 'swarm-1', tool_use_id: 'c1' })
  await spawn($, 'researcher', 'haiku', 'swarm-1', { tool_use_id: 'c1' })
  await agentCall($, { model: 'haiku', effort: 'high', name: 'swarm-2', tool_use_id: 'c2' })
  await spawn($, 'researcher', 'haiku', 'swarm-2', { tool_use_id: 'c2' })
  await agentCall($, { name: 'rev-1', tool_use_id: 'c3' })
  await spawn($, 'reviewer', undefined, 'rev-1', { tool_use_id: 'c3' })
  for (const id of ['id-swarm-1', 'id-swarm-1', 'id-swarm-2', 'id-rev-1']) await step($, id, 'high')
  expect(w.steps).toEqual(['medium', 'medium', 'medium', 'high', 'medium'])
})

test('a MAIN effort change reaches agents spawned after it; earlier agents keep theirs', async ($, on) => {
  const w = world(on)
  await step($, undefined, 'medium')
  await agentCall($, { model: 'haiku', name: 'swarm-1', tool_use_id: 'c1' })
  await spawn($, 'researcher', 'haiku', 'swarm-1', { tool_use_id: 'c1' })
  await step($, undefined, 'max')
  await agentCall($, { model: 'haiku', name: 'swarm-2', tool_use_id: 'c2' })
  await spawn($, 'researcher', 'haiku', 'swarm-2', { tool_use_id: 'c2' })
  for (const id of ['id-swarm-1', 'id-swarm-2']) await step($, id, 'high')
  expect(w.steps).toEqual(['medium', 'max', 'medium', 'xhigh'])
})
