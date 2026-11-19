/** The last main Stop left work in flight: a BUSY_TASKS task or a cron. */
export type IdleCompactBackground = boolean

/** Output tokens of the last main step: the context size's output side. */
export type IdleCompactOutput = number

/** `compact_before_wait`'s `keep` until its turn ends; '' = no call pending. */
export type IdleCompactPending = string

/** That `keep` from the call's turn end until the next main turn: the registered wait; '' = none. */
export type IdleCompactWaiting = string

declare module 'claude-code' {
  interface PluginState {
    'idle-compact': { background: IdleCompactBackground; output: IdleCompactOutput; pending: IdleCompactPending; waiting: IdleCompactWaiting }
  }
}
