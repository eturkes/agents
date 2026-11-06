// State file = bin/away's: one away period; `since` + `until` in ms; `label` = `until` as local `HH:MM Day D Mon TZ`.
export type AwayState = { id: string; since: number; until: number; label: string }

export function parseState(text: string): AwayState | undefined {
  try {
    const v = JSON.parse(text) as Partial<AwayState>
    const ok = typeof v.id === 'string' && v.id !== '' && typeof v.since === 'number' && typeof v.until === 'number' && typeof v.label === 'string'
    return ok ? (v as AwayState) : undefined
  } catch {
    return undefined
  }
}

export const isAway = (s: AwayState | undefined, now: number): s is AwayState => s !== undefined && now < s.until

/** Heuristic for "the message leaves a question with the user": a line ending in `?` among its last 12, code blocks aside. */
export function endsInQuestion(text: string): boolean {
  const lines = text.replace(/```[\s\S]*?```/g, '').split('\n').filter(l => l.trim())
  return lines.slice(-12).some(l => /\?[*_)\]"'`’”]*\s*$/.test(l))
}

/** Ledger entries = the model's `- decided: …` / `- open: …` lines. */
export const logged = (ledger: string): number => ledger.split('\n').filter(l => l.startsWith('- ')).length

export const header = (cwd: string, session: string) => `# ${cwd} · session ${session}\n\n`

const LOG = (ledger: string) =>
  `log it → one line appended to ${ledger}: "- decided: <question> → <choice>, <why>", or "- open: <question>" for what only the user can provide (login, access, a physical step)`

// The advisor = the best read of the user's intent ⇒ named where present.
const JUDGE = 'your best judgment (the advisor, where present = best read of their intent)'

export const note = (label: string, ledger: string) =>
  `User away until ${label} = no answers until then. Each question or choice you would put to them → decide it on ${JUDGE} + ${LOG(ledger)}; carry the work on. AskUserQuestion meanwhile returns this rule unshown.`

export const askDenied = (label: string, ledger: string) =>
  `Unshown: user away until ${label}; AskUserQuestion stays unshown until then. Pick the option you would recommend + ${LOG(ledger)} → continue the work.`

export const askWithdrawn = (label: string, ledger: string) =>
  `Withdrawn unanswered: user left, away until ${label}; AskUserQuestion stays unshown until then. Pick the option you would recommend + ${LOG(ledger)} → continue the work.`

export const askTeammate = (label: string) =>
  `Unshown: user away until ${label}; AskUserQuestion stays unshown until then. Pick the option you would recommend → state it + why in your report to your lead.`

export const stopBlock = (label: string, ledger: string) =>
  `User away until ${label}. Message asks them something or leaves them a decision → decide it + ${LOG(ledger)} → continue the work. Work done or waiting on what only they can provide → end the turn.`

export const onsetPrompt = (label: string, ledger: string) =>
  `[away] User left, away until ${label} → your last message's question stays unanswered. Decide it on ${JUDGE} + ${LOG(ledger)} → carry the work on; turn end = work done or waiting on what only they can provide.`

const REPORT = (ledger: string) =>
  `each decision taken in their place while away (${ledger} + this conversation) + what it changed + whether it can be undone, then each question still open`

export const presentNote = (label: string, ledger: string) =>
  `User back at this session; other sessions stay away until ${label} (/away off ends it everywhere). Reply opens with ${REPORT(ledger)} → then answers their message.`

export const returnPrompt = (ledger: string) =>
  `[away] User back. This turn = one message for them: ${REPORT(ledger)}.`
