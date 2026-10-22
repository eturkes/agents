# Per-turn email notifications on CachyOS

The `turn-email` mod (`../../mods/turn-email`) sends one email from `emiru.tarukesu@gmail.com` to itself after each completed main-thread turn that you start. Each message contains the prompt, response, session metadata, context usage, and transcript path. Subagent turns, interrupted turns, and turns that end on an API error send no email.

Teammate messages, background-task notifications, and scheduled wakeups also start turns. Such a turn sends an email only when no work stays in flight: no teammate, background shell, or scheduled wakeup. Thus a run sends one email when its last work ends. An idle teammate stays in flight until `TaskStop` ends it. Headless turns from `claude -p` and the Agent SDK send no email.

The mod also handles the `Notification` event. When a dialog waits for you, it sends one email with the pending question and its options. A turn that waits at an `AskUserQuestion` dialog does not end, so this email is the signal that the session needs you. The mod sends this email for `permission_prompt`, `elicitation_dialog`, and `agent_needs_input`. The message threads under the last completed turn of the session.

## Deploy

| Repository file | Destination | Mode |
| --- | --- | --- |
| `msmtprc` | `~/.msmtprc` | 600 |

Install the relay with `sudo pacman -S msmtp`. Deploy the mod as `../../mods/README.md` describes. The settings `env` key `CLAUDE_CODE_PLUGIN_DIRS` in `../settings.json` loads it.

## Gmail relay

`emiru.tarukesu@gmail.com` is the mailbox for Claude mail alone. Gmail puts the sender's copy of each mail in the sender's inbox. Thus this mailbox also sends the mail, and no copy reaches `emir.turkes@eturkes.com`.

Use authenticated submission through `smtp.gmail.com:587`. This route matches the ISP egress policy.

`msmtprc` signs in with an app password of that account. App passwords need 2-Step Verification on the account. Create one at <https://myaccount.google.com/apppasswords>. Store it from your own terminal, outside a Claude session. A password typed into a session goes into its transcript and its mail.

```sh
mkdir -m 700 -p ~/.config/claude-mail
read -rsp 'App password: ' p && (umask 077; printf '%s\n' "$p" > ~/.config/claude-mail/app-password); unset p
```

To use an editor, turn off its swap and history files. Then set the file mode to 600:

```sh
nvim -n -i NONE ~/.config/claude-mail/app-password
chmod 600 ~/.config/claude-mail/app-password
```

`passwordeval` strips the spaces Google prints between groups. If you revoke the password or change the account password, create and store a new one. Keep the file machine-local and untracked.

## Delivery behavior

The mod writes each mail to a spool file and starts the relay in the background. Turn completion continues during relay delays or failures, and a relay outlives the exit of a `claude -p` process.

The mod sends nothing when `msmtp` or `~/.msmtprc` is absent. You can keep the mod loaded before credential setup.

The body uses base64 `text/plain`, and the subject uses RFC 2047. These encodings preserve non-ASCII text and lines beyond SMTP's 998-character limit. `References: <cc.SESSION@eturkes.com>` threads all turns from one session.

A notification mail includes an `AskUserQuestion` only while that question waits for an answer. Other notifications report their message.

The prompt and response limits are 4,000 and 100,000 characters. The `Time` line shows local time with its UTC offset.

The mod keeps the turn counter and the last human prompt in its store, one key per session. A resumed session continues its count, and a turn without a typed prompt shows the last one. Compaction summaries and delivered messages never become the prompt. A prompt that you type while a turn runs becomes the prompt of that turn. The mod removes counters after seven days. Relay failures go to `~/.claude/cache/turn-email.log`. Relay results go to `~/.claude/cache/msmtp.log`, with one `smtpstatus` line per send.

Environment overrides:

- `CLAUDE_TURN_EMAIL_TO`
- `CLAUDE_TURN_EMAIL_FROM`

## Test

Run the offline suite from this directory. It uses test doubles, so it sends no mail:

```sh
claude plugin test ../../mods/turn-email
```

To check the relay itself, send one mail:

```sh
printf 'Subject: turn-email relay check\n\nok\n' | msmtp emiru.tarukesu@gmail.com
```

## Disable or remove

1. To pause mail while the mod stays loaded, move `~/.msmtprc` aside.
2. To unload the mod, remove `~/.claude/mods/turn-email` from `CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json` and `../settings.json`.
3. For full removal, unload the mod first.
4. Run `rm -rf ~/.config/claude-mail ~/.claude/mods/turn-email ~/.msmtprc`.
5. Revoke the app password at <https://myaccount.google.com/apppasswords>.
