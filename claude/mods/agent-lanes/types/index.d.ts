/** Agent ids routed to terra whose first stop has not been sent back. */
export type AgentLanesNudge = Record<string, true>

/** Agent id → the effort its Agent call set (explicit, else its lane's); enforced on each of its requests. */
export type AgentLanesEfforts = Record<string, string>

/** MAIN's effort level, as its last request carried it ('' before its first). */
export type AgentLanesMain = string

declare module 'claude-code' {
  interface PluginState {
    'agent-lanes': { nudge: AgentLanesNudge; efforts: AgentLanesEfforts; main: AgentLanesMain }
  }
}
