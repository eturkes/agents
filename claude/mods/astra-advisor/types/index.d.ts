/** The latest reviewed advisor() call: its fork point, effort and verdict (absent = none given). */
export type AstraLast = { call: string; cut?: string; effort: string; verdict?: string }

/** The current turn's latest advisor() call; `claimStep` = the batch whose call claimed its review, `verdict` null = none given. */
export type AstraPending = { call: string; cut?: string; effort: string; claimStep?: number; verdict?: string | null }

/** Main loop cursor: step counter (= batch), effort, last chain row, cut taken at the call, pending review. */
export type AstraTrack = { step: number; effort: string; lastRow?: string; cutAtCall?: string; pending?: AstraPending }

declare module 'claude-code' {
  interface PluginState {
    'astra-advisor': { last: AstraLast | null; track: AstraTrack }
  }
}
