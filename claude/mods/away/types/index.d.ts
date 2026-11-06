/** The away period this session saw (`id` '' = none yet), its label, questions the mod answered; `woke` / `returned` = the period whose onset / return was handled; `present` = the period the user typed in this session (it leaves away mode). */
export type AwaySeen = { id: string; label: string; asked: number; woke: string; returned: string; present: string }

declare module 'claude-code' {
  interface PluginState {
    away: { seen: AwaySeen }
  }
}
