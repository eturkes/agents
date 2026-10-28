/** Agent ids routed to terra whose first stop has not been sent back. */
export type AgentLanesNudge = Record<string, true>

declare module 'claude-code' {
  interface PluginState {
    'agent-lanes': { nudge: AgentLanesNudge }
  }
}
