# cache-keepalive

`cache-keepalive` keeps the prompt cache of a waiting Claude Code session warm, and it compacts a finished session before its cache expires. Without it, a prompt after more than an hour sends the whole conversation again as an uncached write.

The keeper is an HTTP relay between Claude Code and CLIProxyAPI. The settings `env` key `ANTHROPIC_BASE_URL` points Claude Code at it:

```text
Claude Code → cache-keepalive 127.0.0.1:8318 → CLIProxyAPI 127.0.0.1:8317
```

On CachyOS it runs as a systemd user service. On aeon it runs in the foreground in a terminal, like CLIProxyAPI there.

## Why Claude Code needs help

Behind a proxy, Claude Code writes the cache with the 5-minute TTL. It writes the 1-hour TTL only when it is signed in to claude.ai itself. The settings `env` key `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` restores the 1-hour TTL for the main thread.

Claude Code also has its own keepalive. It runs only when `ANTHROPIC_BASE_URL` is unset or names `api.anthropic.com`, so it stays off here.

## How it works

The relay forwards the body of every request and response unchanged. It sets the `Host` header for the upstream and drops hop-by-hop headers.

In a streamed response, the relay can delay one event. When a chunk ends with a `content_block_stop` event, the relay holds that event and sends it together with the next chunk. Claude Code writes the transcript entries of an in-process teammate every 100 ms, and it adds the final usage and `stop_reason` when `message_delta` arrives. CLIProxyAPI can send `message_delta` more than 100 ms after the last `content_block_stop`. Without the hold, such an entry reaches disk without its final usage. It stores a request when all of these hold:

- The request is a `POST` to `/v1/messages` with a `claude` model.
- The `x-claude-code-request-class` header is `main`. Claude Code sends this header only when the settings `env` key `CLAUDE_CODE_GATEWAY_HINT_HEADERS` is `1`.
- The request carries an `X-Claude-Code-Session-Id` header and a cache breakpoint with `ttl: "1h"`.
- The upstream answers with status 200.

Each session keeps only its newest stored request. When a session sends no main-thread request for 55 minutes, the keeper does one of these:

- If the session is quiet, the `idle-compact` mod compacts it. Quiet means that no turn runs, and that the last turn left no background task or scheduled wakeup. The compaction reads the cache, and the next prompt writes only the short summary. The keeper then stops for the session.
- Otherwise, the session waits for you at an AskUserQuestion dialog, or its work still runs. The keeper then sends the stored request again. This touch renews the 1-hour cache entry. The keeper touches a session at most 5 times.

A touch closes the stream at the `message_start` event, so it costs a cache read and almost no output.

The [`idle-compact`](../mods/README.md) mod runs in each interactive session. Every 30 seconds, it tells the keeper whether the session is quiet (`POST /_keepalive/poll`). When the keeper asks, the mod compacts the session and reports the result (`POST /_keepalive/compacted`). A session without a mod report in the last 90 seconds gets touches only. A failed compaction also falls back to touches.

The touch repeats the stored request byte for byte, with one exception. The keeper stores a request that has `stream: false` with `stream: true`, because the touch must stream. The flag is not part of the cached prompt, so the touch still reads the same cache entry.

The keeper stops for a session in these cases:

- The mod compacted it.
- The session got 5 touches and reached its next 55-minute mark.
- Touches fail until the cache entry expires.
- The upstream rejects a touch with status 400, 401, 403, 404, 413 or 422.
- Two touches in a row write more than they read.

A stopped session stays in the status list. The keeper starts again with the next main-thread request of the session. It removes the session when its Claude Code process ends. The keeper reads each process and its launch directory from `~/.claude/sessions/<pid>.json`.

The keeper holds the stored requests in memory. A restart of the keeper drops them. The keeper stores each session again with its next main-thread request.

A cache read costs one tenth of the base input price, and a 1-hour write costs twice the base input price. So about 20 touches cost as much as one rewrite of the same context.

## Install

The keeper uses only the Python standard library. Run the commands below from the repository root.

### CachyOS

```sh
ln -sfn "$PWD/claude/cache-keepalive/cache-keepalive" ~/.local/bin/cache-keepalive
cp claude/cache-keepalive/cache-keepalive.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now cache-keepalive.service
```

Deploy the `idle-compact` mod as `../mods/README.md` describes. `claude/cachyos/settings.json` sets `ANTHROPIC_BASE_URL` to `http://127.0.0.1:8318`, so Claude Code sends its requests through the keeper.

### aeon

aeon runs no unit. Deploy the `idle-compact` mod as `../mods/README.md` describes. Link the script:

```sh
ln -sfn "$PWD/claude/cache-keepalive/cache-keepalive" ~/.local/bin/cache-keepalive
```

`claude/aeon/settings.json` sets `ANTHROPIC_BASE_URL` to `http://127.0.0.1:8318`, so Claude Code sends its requests through the keeper.

Before you start a session, start the keeper in its own terminal. Leave it running:

```sh
cache-keepalive
```

Ctrl+C stops it. While the keeper is stopped, Claude Code cannot reach CLIProxyAPI, and every request fails.

## Check

```sh
claude/cache-keepalive/check-cache-keepalive
curl -sS http://127.0.0.1:8318/_keepalive
journalctl --user -u cache-keepalive.service
```

The check script runs the relay, the block-stop hold, the touch logic and the compaction logic against a fake upstream. The status endpoint returns one JSON entry per session with these fields:

- `dir`: the directory in which the session was launched.
- `stopped`: the UTC time at which the response to the stored request ended.
- `kept_alive`: the number of touches since that request, or `compacted`.
- `last`: the latest event, for example the token counts of a touch or the reason for a stop.

The journal logs each stored session, each touch with its read and write token counts, each compaction and each stop. On aeon, the keeper's terminal shows the same lines.

## Options

`--interval` (3300 s) sets the idle time before a compaction or a touch. `--touches` (5) sets the maximum number of touches per stored request. `--ttl` (3600 s) is the cache lifetime. Use `--listen` and `--upstream` to change the addresses. To change an option on CachyOS, add it to `ExecStart` in the unit. On aeon, add it to the `cache-keepalive` command.
