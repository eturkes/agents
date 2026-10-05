export const PROMPT_MAX = 4_000
export const RESPONSE_MAX = 100_000
/** Dialogs that hold a turn: AskUserQuestion + permission prompts emit no Stop ⇒ the mail is the signal. */
export const WAITING = new Set(['permission_prompt', 'elicitation_dialog', 'agent_needs_input'])

// Spooled + backgrounded with its pipes closed: the run returns at once and the relay outlives
// a -p process exit. Missing client/config ⇒ silent no-op; failures land in the cache log.
export const SEND = `command -v msmtp >/dev/null 2>&1 && [ -r "$HOME/.msmtprc" ] || exit 0
log=$HOME/.claude/cache/turn-email.log
mkdir -p "\${log%/*}"
mail=$(mktemp "\${TMPDIR:-/tmp}/cc-mail.XXXXXX") || exit 0
cat >"$mail"
(msmtp --read-recipients <"$mail" 2>>"$log" ||
  printf '%s turn-email: send failed (%s)\\n' "$(date -Is)" "$1" >>"$log"
 rm -f "$mail") </dev/null >/dev/null 2>&1 &`

export type Question = { header?: string; question?: string; options?: readonly { label?: string; description?: string }[] }

export function cleanPrompt(text: string): string {
  return text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim().slice(0, PROMPT_MAX)
}

export function questionsText(qs: readonly Question[]): string {
  return qs.map(q => [`[${q.header}] ${q.question}`, ...(q.options ?? []).map(o => `  - ${o.label}: ${o.description}`)].join('\n')).join('\n')
}

const firstLine = (s: string) => s.split('\n')[0]!.slice(0, 72)

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
export function base64(text: string): string {
  const b = new TextEncoder().encode(text)
  let out = ''
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i]! << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0)
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]! + (i + 1 < b.length ? B64[(n >> 6) & 63]! : '=') + (i + 2 < b.length ? B64[n & 63]! : '=')
  }
  return out
}

/** Local time: 2026-10-05 18:30:00 +0900 */
export function stamp(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  const off = -d.getTimezoneOffset()
  const zone = `${off < 0 ? '-' : '+'}${p(Math.trunc(Math.abs(off) / 60))}${p(Math.abs(off) % 60)}`
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} ${zone}`
}

export type Mail = {
  to: string
  from: string
  session: string
  turn: number
  cwd: string
  model: string
  effort: string
  mode: string
  context: string
  transcript: string
  now: number
  prompt: string
  /** A completed turn's response, or the waiting dialog's text. */
  text: string
  waiting?: { type: string; message: string; questions: string }
}

/** RFC 5322 message: base64 text/plain body + RFC 2047 subject; References threads a session's turns. */
export function compose(m: Mail): string {
  const proj = m.cwd.replace(/\/+$/, '').split('/').at(-1) || 'home'
  const w = m.waiting
  const subject = w
    ? `[cc] ${proj} #${m.turn} needs input — ${firstLine(w.questions || w.message) || '(dialog)'}`
    : `[cc] ${proj} #${m.turn} — ${firstLine(m.prompt) || '(no prompt)'}`
  const id = w ? `cc.${m.session}.${m.turn}.ask.${Math.floor(m.now / 1000)}` : `cc.${m.session}.${m.turn}`
  const label = w ? 'input' : 'response'
  const text = w ? `pending: ${w.type} — ${w.message}${w.questions ? `\n\n${w.questions}` : ''}` : m.text
  const body = [
    `Session   : ${m.session} (turn ${m.turn})`,
    `Directory : ${m.cwd || '?'}`,
    `Model     : ${m.model} · effort ${m.effort} · ${m.mode}`,
    `Context   : ${m.context}`,
    `Time      : ${stamp(m.now)}`,
    `Transcript: ${m.transcript}`,
    '',
    '───────────────────────────── prompt ─────────────────────────────',
    '',
    m.prompt || '(none)',
    '',
    `──────────────────────────── ${label} ────────────────────────────`,
    '',
    text || '(none)',
    '',
  ].join('\n')
  return [
    `From: ${m.from}`,
    `To: ${m.to}`,
    `Subject: =?UTF-8?B?${base64(subject)}?=`,
    `Date: ${new Date(m.now).toUTCString()}`,
    `Message-ID: <${id}@eturkes.com>`,
    `References: <cc.${m.session}@eturkes.com>`,
    `In-Reply-To: <cc.${m.session}@eturkes.com>`,
    'Auto-Submitted: auto-generated',
    `X-Claude-Session: ${m.session}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    ...(base64(body).match(/.{1,76}/g) ?? []),
    '',
  ].join('\n')
}
