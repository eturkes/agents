export type ContextAlertTier = 'notice' | 'final'

declare module 'claude-code' {
  interface PluginState {
    'context-alert': { claims: Record<string, ContextAlertTier> }
  }
}
