# Per-turn email notifications on CachyOS

The `Stop` hook sends one email to `emir.turkes@eturkes.com` after each completed main-thread turn. Each message contains the prompt, response, session metadata, context usage, and transcript path.

Claude Code uses `Stop` for main turns and `SubagentStop` for subagents. Therefore, this hook receives main-thread turns.

## Deploy

| Repository file | Destination | Mode |
| --- | --- | --- |
| `turn-email` | `~/.claude/turn-email` | 755 |
| `gmail-oauth-token` | `~/.claude/gmail-oauth-token` | 755 |
| `gmail-oauth-setup` | `~/.claude/gmail-oauth-setup` | 755 |
| `msmtprc` | `~/.msmtprc` | 600 |

Install the relay with `sudo pacman -S msmtp`. The hook registration is in `../settings.opus.json` and `../settings.fable.json` under `hooks.Stop`. After you change hook definitions, restart Claude Code.

## Gmail relay

Use authenticated submission through `smtp.gmail.com:587`. This route matches the ISP egress policy and the `eturkes.com` SPF authorization.

`msmtprc` uses `passwordeval` to call `gmail-oauth-token`. The helper creates access tokens from the refresh token. It caches each token until 60 seconds before expiry.

Use an Internal Workspace OAuth desktop client with the Gmail API enabled.

- Set **Audience** to **Internal**. Workspace-only apps issue durable refresh tokens without external verification. External apps in Testing status expire refresh tokens after seven days.
- Request the `https://mail.google.com/` scope. SMTP XOAUTH2 requires this scope and rejects `gmail.send`. The consent screen describes full mailbox access.

## Authorize OAuth

After a client change, revoked grant, or lost credential file, run:

```sh
~/.claude/gmail-oauth-setup --client-id ID --client-secret SECRET
```

The command prints an authorization URL and serves the loopback redirect. It writes `~/.config/claude-mail/oauth.json` with mode 0600. The file contains the client credentials, refresh token, and cached access token. Keep this file machine-local and untracked.

Save the client secret when you create the client. If the secret becomes unavailable, create a new client.

## Delivery behavior

The hook starts mail delivery in a detached process and exits with status 0. Turn completion continues during relay delays or failures.

The hook becomes a silent no-op when `msmtp` or `~/.msmtprc` is absent. You can keep the registration before credential setup.

The body uses base64 `text/plain`, and the subject uses RFC 2047. These encodings preserve non-ASCII text and lines beyond SMTP's 998-character limit. `References: <cc.SESSION@eturkes.com>` threads all turns from one session.

The prompt and response limits are 4,000 and 100,000 characters. A streaming `jq` reduction bounds memory while parsing the transcript.

The turn counter is `~/.claude/cache/turn-email/SESSION`. The hook removes counters after seven days. Hook failures go to `~/.claude/cache/turn-email.log`. Relay results go to `~/.claude/cache/msmtp.log`, with one `smtpstatus` line per send.

Environment overrides:

- `CLAUDE_TURN_EMAIL_TO`
- `CLAUDE_TURN_EMAIL_FROM`
- `CLAUDE_MAIL_CRED`

## Disable or remove

1. To pause mail while retaining the hook, move `~/.msmtprc` aside.
2. To unregister the hook, remove `hooks.Stop` from `~/.claude/settings.json`, `../settings.opus.json` and `../settings.fable.json`.
3. For full removal, unregister the hook first.
4. Run `rm -rf ~/.config/claude-mail ~/.claude/{turn-email,gmail-oauth-token,gmail-oauth-setup} ~/.msmtprc`.
5. Revoke the grant at <https://myaccount.google.com/permissions>.
6. Delete the Google Cloud project.
