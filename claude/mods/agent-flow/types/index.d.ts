/** One subagent loop as agent-flow tracks it, keyed by agentId. */
export type AgentFlowAgent = {
  name?: string
  /** Last `<name>-DONE-<i>` token sent to it (brief or message). */
  marker?: string
  /** Write/Edit/NotebookEdit targets, newest first. */
  targets: string[]
  tools: number
  durable: number
  inTurn: boolean
  activeAt: number
  heldAt?: number
  /** Last request's input + cache + output. */
  used?: number
}

declare module 'claude-code' {
  interface PluginState {
    'agent-flow': { agents: Record<string, AgentFlowAgent> }
  }
}
