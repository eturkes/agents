/** The last main Stop left work in flight: a BUSY_TASKS task or a cron. */
export type IdleCompactBackground = boolean

declare module 'claude-code' {
  interface PluginState {
    'idle-compact': { background: IdleCompactBackground }
  }
}
