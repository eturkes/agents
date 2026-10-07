# cache-keepalive

`cache-keepalive` keeps the prompt cache of a waiting Claude Code session warm. Without it, an answer to an AskUserQuestion dialog after more than an hour sends the whole conversation again as an uncached write.

The keeper is an HTTP relay between Headroom and CLIProxyAPI:

```text
Claude Code → Headroom 127.0.0.1:8787 → cache-keepalive 127.0.0.1:8318 → CLIProxyAPI 127.0.0.1:8317
```

On CachyOS it runs as a systemd user service. On aeon it runs in the foreground in a terminal, like CLIProxyAPI there.

## Why Claude Code needs help

Behind a proxy, Claude Code writes the cache with the 5-minute TTL. It writes the 1-hour TTL only when it is signed in to claude.ai itself. The settings `env` key `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` restores the 1-hour TTL for the main thread.

Claude Code also has its own keepalive, which calls `/v1/messages/cache_touch`. It runs only when `ANTHROPIC_BASE_URL` is unset or names `api.anthropic.com`, so it stays off here. It also stops 60 minutes after the last activity.

## How it works

The relay passes every request and response through unchanged. It stores a request when all of these hold:

- The request is a `POST` to `/v1/messages` with a `claude` model.
- The `x-claude-code-request-class` header is `main`. Claude Code sends this header only when the settings `env` key `CLAUDE_CODE_GATEWAY_HINT_HEADERS` is `1`.
- The request carries an `X-Claude-Code-Session-Id` header and a cache breakpoint with `ttl: "1h"`.
- The upstream answers with status 200.

Each session keeps only its newest stored request. When a session sends no main-thread request for 55 minutes, the keeper sends that request again. It closes the stream at the `message_start` event, so the touch costs a cache read and almost no output. The cache read renews the 1-hour entry.

The touch repeats the stored request byte for byte, with one exception. While its retrieval tool is in play, Headroom forwards a streamed request with `stream: false`. The keeper stores such a request with `stream: true`, because the touch must stream. The flag is not part of the cached prompt, so the touch still reads the same cache entry.

The keeper drops a session in these cases:

- Its Claude Code process ends. The keeper reads `~/.claude/sessions/<pid>.json`.
- 12 hours pass after its last real request.
- A touch fails until the cache entry has lapsed.
- The upstream rejects a touch with status 400, 401, 403, 404, 413 or 422.
- Two touches in a row write more than they read.

The keeper holds the stored requests in memory. A restart of the service drops them, and each session is stored again with its next main-thread request.

A cache read costs one tenth of the base input price, and a 1-hour write costs twice the base input price. So about 20 touches cost as much as one rewrite of the same context.

## Install

### CachyOS

```sh
ln -sfn "$PWD/claude/cache-keepalive/cache-keepalive" ~/.local/bin/cache-keepalive
cp claude/cache-keepalive/cache-keepalive.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now cache-keepalive.service
```

Run these commands from the repository root. Then point Headroom at the keeper. `host/cachyos/headroom/settings.json` sets `anthropic_base_url` to `http://127.0.0.1:8318`. Copy it to `~/.headroom/settings.json`, and restart the Headroom proxy.

### aeon

aeon runs no unit. Link the script from the repository root:

```sh
ln -sfn "$PWD/claude/cache-keepalive/cache-keepalive" ~/.local/bin/cache-keepalive
```

`container/aeon/headroom/settings.json` sets `anthropic_base_url` to `http://127.0.0.1:8318`. Copy it to `~/.headroom/settings.json`. Headroom reads this file when its proxy starts, and `headroom wrap` stops the proxy it started when its last session ends. So the next `headroom wrap` picks up the change.

Start the keeper in its own terminal before you start a session, and leave it running:

```sh
cache-keepalive
```

Ctrl+C stops it. While it is down, Headroom cannot reach CLIProxyAPI, and every request fails.

The keeper uses only the Python standard library.

## Check

```sh
claude/cache-keepalive/check-cache-keepalive
curl -sS http://127.0.0.1:8318/_keepalive
journalctl --user -u cache-keepalive.service
```

The check script runs the relay and the touch logic against a fake upstream. The status endpoint lists each stored session with its idle time, the time to the next touch, and the result of the last touch. The journal logs each stored session, each touch with its read and write token counts, and each drop. On aeon, the keeper's terminal shows the same lines.

## Options

`--interval` (3300 s) sets the idle time before a touch. `--hold` (43200 s) sets how long after the last real request touches continue. `--ttl` (3600 s) is the cache lifetime. Use `--listen` and `--upstream` to change the addresses. To change an option, add it to `ExecStart` in the unit, or on aeon to the `cache-keepalive` command.
