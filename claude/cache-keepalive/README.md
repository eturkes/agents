# cache-keepalive

Keeps a waiting CC session's prompt cache warm + compacts a finished session before its cache expires; without it, a prompt after >1 h re-sends the whole conversation as an uncached write.

HTTP relay between CC + CLIProxyAPI; settings `env` `ANTHROPIC_BASE_URL` points CC at it:

```text
Claude Code → cache-keepalive 127.0.0.1:8318 → CLIProxyAPI 127.0.0.1:8317
```

CachyOS = systemd user service; aeon = foreground in a terminal, like CLIProxyAPI there.

## Why

- Behind a proxy CC writes the 5-min cache TTL; the 1-h TTL needs CC's own claude.ai sign-in. Settings `env` `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` restores 1 h for the main thread.
- CC's built-in keepalive runs only with `ANTHROPIC_BASE_URL` unset or `api.anthropic.com` ⇒ off here.

## Mechanics

- Relay = every request + response body forwarded unchanged; upstream `Host` set; hop-by-hop headers dropped.
- Block-stop hold: a streamed chunk ending in `content_block_stop` → that event held + sent with the next chunk. CC writes an in-process teammate's transcript entries every 100 ms + adds final usage + `stop_reason` on `message_delta`; CLIProxyAPI can send `message_delta` >100 ms after the last `content_block_stop` ⇒ unheld, the entry reaches disk without final usage.
- Stored request = all of: `POST /v1/messages` with a `claude` model; header `x-claude-code-request-class: main` (sent only under settings `env` `CLAUDE_CODE_GATEWAY_HINT_HEADERS=1`); an `X-Claude-Code-Session-Id` header + a cache breakpoint with `ttl: "1h"`; upstream status 200. Per session = the newest alone.
- 55 min without a main-thread request →
  - quiet session (no running turn; last turn left no background task or scheduled wakeup) → mod `idle-compact` compacts it: the compaction reads the cache, the next prompt writes only the short summary; keeper stops for the session.
  - else (waiting at an AskUserQuestion dialog, or work still running) → a touch = the stored request re-sent, renewing the 1-h entry; ≤5 per session.
- Touch = stream closed at `message_start` ⇒ a cache read + almost no output. Byte-identical to the stored request, except a stored `stream: false` becomes `stream: true`: touches stream, and the flag sits outside the cached prompt ⇒ same cache entry.
- [`idle-compact`](../mods/README.md) runs in each interactive session: every 30 s → quiet or not (`POST /_keepalive/poll`); on the keeper's ask → compacts + reports (`POST /_keepalive/compacted`). No mod report for 90 s, or a failed compaction → touches only.
- Keeper stops for a session once: the mod compacted it; 5 touches done + its next 55-min mark reached; touches fail until the entry expires; upstream rejects a touch with 400/401/403/404/413/422; two touches in a row write more than they read.
- Stopped session stays listed; its next main-thread request restarts it; it leaves the list once its CC process ends (process + launch dir from `~/.claude/sessions/<pid>.json`).
- Stored requests live in memory ⇒ a keeper restart drops them; each session re-stores on its next main-thread request.
- Cost: cache read = 0.1× base input, 1-h write = 2× ⇒ ~20 touches = one rewrite of the same context.

## Install

Python stdlib alone; run from the repo root.

CachyOS:

```sh
ln -sfn "$PWD/claude/cache-keepalive/cache-keepalive" ~/.local/bin/cache-keepalive
cp claude/cache-keepalive/cache-keepalive.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now cache-keepalive.service
```

+ mod `idle-compact` deployed per `../mods/README.md`; `claude/cachyos/settings.json` sets `ANTHROPIC_BASE_URL=http://127.0.0.1:8318`.

aeon (no unit): mod `idle-compact` deployed per `../mods/README.md`; script linked:

```sh
ln -sfn "$PWD/claude/cache-keepalive/cache-keepalive" ~/.local/bin/cache-keepalive
```

`claude/aeon/settings.json` sets `ANTHROPIC_BASE_URL=http://127.0.0.1:8318`. Keeper = `cache-keepalive` in its own terminal, started before any session + left running; Ctrl+C stops it ⇒ CC cannot reach CLIProxyAPI + every request fails.

## Check

```sh
claude/cache-keepalive/check-cache-keepalive
curl -sS http://127.0.0.1:8318/_keepalive
journalctl --user -u cache-keepalive.service
```

`check-cache-keepalive` = relay, block-stop hold, touch + compaction logic against a fake upstream. Status endpoint = one JSON entry per session: `dir` = launch dir; `stopped` = UTC end of the stored request's response; `kept_alive` = touches since that request | `compacted`; `last` = latest event (a touch's token counts, a stop reason). Journal (aeon: the keeper's terminal) = each stored session, touch (read + write tokens), compaction + stop.

## Options

`--interval` (3300 s) = idle time before a compaction or touch; `--touches` (5) = max touches per stored request; `--ttl` (3600 s) = cache lifetime; `--listen` + `--upstream` = addresses. Change one: CachyOS → the unit's `ExecStart`; aeon → the `cache-keepalive` command.
