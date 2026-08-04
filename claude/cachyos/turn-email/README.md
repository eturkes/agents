# turn-email — per-turn mail notifications (CachyOS)

`Stop` hook → one message to `emir.turkes@eturkes.com` per completed main-thread turn. Body = prompt + full response + metadata (session, turn #, cwd, model, effort, permission mode, context, transcript path).

Main-thread scoping is structural: subagents fire `SubagentStop`, and Claude Code converts a `Stop` registration to `SubagentStop` for them, so this hook sees main turns alone.

## Deploy

| repo | destination | mode |
| --- | --- | --- |
| `turn-email` | `~/.claude/turn-email` | 755 |
| `gmail-oauth-token` | `~/.claude/gmail-oauth-token` | 755 |
| `gmail-oauth-setup` | `~/.claude/gmail-oauth-setup` | 755 |
| `msmtprc` | `~/.msmtprc` | 600 |

`pacman -S msmtp` supplies the relay. Registration lives in `../settings.json` → `hooks.Stop`. Hook definitions load at startup → restart Claude Code to activate.

## Gmail relay

The ISP blocks outbound 25 and `eturkes.com` SPF authorizes Google alone → authenticated submission on `smtp.gmail.com:587` is the delivery path. `msmtprc` holds no password: `passwordeval` shells out to `gmail-oauth-token`, which mints access tokens from a refresh token and caches each until 60 s before expiry.

Google Cloud project `claude-code-mail-504501`, OAuth client `claude-code turn-email` (type: Desktop app), Gmail API enabled. Two settings keep it durable:

- **Audience = Internal.** Workspace-only apps skip verification and issue refresh tokens that persist. External projects in Testing status expire them every 7 days.
- **Scope = `https://mail.google.com/`.** SMTP XOAUTH2 accepts this scope; the narrower `gmail.send` is rejected. The consent screen presents it as full mailbox access.

Re-authorize (new client, revoked grant, lost credential file):

```
~/.claude/gmail-oauth-setup --client-id ID --client-secret SECRET
```

Prints an authorization URL, serves the loopback redirect, writes `~/.config/claude-mail/oauth.json` (0600: client id + secret, refresh token, cached access token). Credentials stay machine-local and untracked. A client secret is visible only at creation → create a fresh client when it is lost.

## Guarantees

The send is detached and the hook always exits 0 → mail latency and SMTP failures leave turns untouched. A missing `msmtp` or `~/.msmtprc` makes it a silent no-op, so the registration is safe to leave wired on a machine without credentials.

Body is base64 `text/plain`, subject is RFC 2047: turns routinely carry non-ASCII and lines past SMTP's 998-char cap, and both survive encoding. `References: <cc.SESSION@eturkes.com>` threads a session's turns together.

Prompt and response cap at 4 000 and 100 000 chars. Transcript parsing is a single streaming `jq` reduce — sessions reach tens of MB, and slurping one costs a turn's worth of memory.

State: `~/.claude/cache/turn-email/SESSION` = turn counter, reaped after 7 d. Failures: `~/.claude/cache/turn-email.log` (hook) and `~/.claude/cache/msmtp.log` (relay, one line per send with `smtpstatus`).

Overrides: `CLAUDE_TURN_EMAIL_TO`, `CLAUDE_TURN_EMAIL_FROM`, `CLAUDE_MAIL_CRED`.

## Off switches

- Pause mail, keep the wiring → move `~/.msmtprc` aside.
- Unregister → drop `hooks.Stop` from `~/.claude/settings.json` and `../settings.json`.
- Full revert → the above, then `rm -rf ~/.config/claude-mail ~/.claude/{turn-email,gmail-oauth-token,gmail-oauth-setup} ~/.msmtprc`, revoke the grant at <https://myaccount.google.com/permissions>, and delete the Cloud project.
