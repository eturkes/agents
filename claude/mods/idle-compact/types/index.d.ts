/** The last main Stop left work in flight: a BUSY_TASKS task or a cron. */
export type IdleCompactBackground = boolean

/** Output tokens of the last main step: the context size's output side. */
export type IdleCompactOutput = number

declare module 'claude-code' {
  interface PluginState {
    'idle-compact': { background: IdleCompactBackground; output: IdleCompactOutput }
  }
}
