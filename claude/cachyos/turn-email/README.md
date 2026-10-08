# Per-turn email notifications on CachyOS

The `turn-email` mod (`../../mods/turn-email`) sends one email to `emir.turkes@eturkes.com` after each completed main-thread turn that you start. Each message contains the prompt, response, session metadata, context usage, and transcript path. Subagent turns, interrupted turns, and turns that end on an API error send no email.

Teammate messages, background-task notifications, and scheduled wakeups also start turns. Such a turn sends an email only when no work stays in flight: no teammate, background shell, or scheduled wakeup. Thus a run sends one email when its last work ends. An idle teammate stays in flight until `TaskStop` ends it. Headless turns from `claude -p` and the Agent SDK send no email.

The mod also handles the `Notification` event. When a dialog waits for you, it sends one email with the pending question and its options. A turn that waits at an `AskUserQuestion` dialog does not end, so this email is the signal that the session needs you. The mod sends this email for `permission_prompt`, `elicitation_dialog`, and `agent_needs_input`. The message threads under the last completed turn of the session.

## Deploy

| Repository file | Destination | Mode |
| --- | --- | --- |
| `gmail-oauth-token` | `~/.claude/gmail-oauth-token` | 755 |
| `gmail-oauth-setup` | `~/.claude/gmail-oauth-setup` | 755 |
| `msmtprc` | `~/.msmtprc` | 600 |

Install the relay with `sudo pacman -S msmtp`. Deploy the mod as `../../mods/README.md` describes. The settings `env` key `CLAUDE_CODE_PLUGIN_DIRS` in `../settings.json` loads it.

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

The mod writes each mail to a spool file and starts the relay in the background. Turn completion continues during relay delays or failures, and a relay outlives the exit of a `claude -p` process.

The mod sends nothing when `msmtp` or `~/.msmtprc` is absent. You can keep the mod loaded before credential setup.

The body uses base64 `text/plain`, and the subject uses RFC 2047. These encodings preserve non-ASCII text and lines beyond SMTP's 998-character limit. `References: <cc.SESSION@eturkes.com>` threads all turns from one session.

A notification mail includes an `AskUserQuestion` only while that question waits for an answer. Other notifications report their message.

A lock file serializes token refreshes, so overlapping sends share one refresh.

The prompt and response limits are 4,000 and 100,000 characters. The `Time` line shows local time with its UTC offset.

The mod keeps the turn counter and the last human prompt in its store, one key per session. A resumed session continues its count, and a turn without a typed prompt shows the last one. Compaction summaries and delivered messages never become the prompt. A prompt that you type while a turn runs becomes the prompt of that turn. The mod removes counters after seven days. Relay failures go to `~/.claude/cache/turn-email.log`. Relay results go to `~/.claude/cache/msmtp.log`, with one `smtpstatus` line per send.

Environment overrides:

- `CLAUDE_TURN_EMAIL_TO`
- `CLAUDE_TURN_EMAIL_FROM`
- `CLAUDE_MAIL_CRED`

## Test

Run the offline suites from this directory. They use test doubles and a local token endpoint, so they send no mail:

```sh
claude plugin test ../../mods/turn-email
./check-gmail-oauth-token
```

## Disable or remove

1. To pause mail while the mod stays loaded, move `~/.msmtprc` aside.
2. To unload the mod, remove `~/.claude/mods/turn-email` from `CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json` and `../settings.json`.
3. For full removal, unload the mod first.
4. Run `rm -rf ~/.config/claude-mail ~/.claude/{mods/turn-email,gmail-oauth-token,gmail-oauth-setup} ~/.msmtprc`.
5. Revoke the grant at <https://myaccount.google.com/permissions>.
6. Delete the Google Cloud project.
