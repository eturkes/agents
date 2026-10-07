# Headroom deployment on CachyOS

Copy `settings.json` to `~/.headroom/settings.json`. Its `anthropic_base_url` points to cache-keepalive at `127.0.0.1:8318`, which relays to CLIProxyAPI at `127.0.0.1:8317` (see [cache-keepalive](../../../claude/cache-keepalive/README.md)), and its `tpm` lifts the proxy's token rate limit (see [Token rate limit](#token-rate-limit)). The Headroom proxy listens on `127.0.0.1:8787`.

Start a session with:

```sh
ANTHROPIC_MODEL=claude-opus-5-5 headroom wrap claude --1m --code-memory none --effort <level>
```

`wrap` passes `--effort` and the other options that it does not own to Claude Code. You choose the effort level for each session, and teammates run at the same level.

`--code-memory none` keeps `wrap` from registering the Serena MCP server. Code intelligence comes from Claude Code's LSP plugins instead.

`--1m` passes `ANTHROPIC_MODEL` with a `[1m]` suffix to the launched process and falls back to `claude-opus-4-8` when it is unset. Claude Code's own `~/.claude/settings.json` pins `ANTHROPIC_MODEL` to `claude-opus-5-5[1m]` in its `env` block, and that pin overrides the launch value. Launch with the same model anyway, so that `wrap` names the model that actually runs.

## Image-worker termination guard

The installed build adds hard termination for timed-out image-compression workers. RapidOCR and ONNX workers can otherwise accumulate until resource exhaustion.

The build provides these controls:

- The guard terminates a timed-out worker. It waits for the grace period before it kills a survivor, and it shuts down the pool last. This order keeps the process table available to the signals.
- Pool retirement uses CAS and idempotent cleanup. A stale timeout can retire only its own pool.
- The guard admits one image job at a time. A job that finds the worker busy waits up to the admission timeout. After that timeout, the proxy forwards the original image payload.
- The guard limits OCR ONNX intra-operation and inter-operation threads to one.
- The guard honors `--no-image-optimize`, `HEADROOM_NO_IMAGE_OPTIMIZE=1`, `--no-optimize`, and the per-request bypass header.

The source is `~/src/headroom`, a clone of `headroomlabs-ai/headroom`. Branch `fix/image-pool-hard-termination` applies the guard to upstream tag `v0.39.0`.

### Build and install

1. Run `nice -n 10 uv build --wheel` in `~/src/headroom`. The build writes a wheel to `~/src/headroom/dist/`.
2. Install that wheel:

   ```sh
   uv tool install --force --python 3.14 "headroom-ai[all] @ file://<wheel-path>"
   ```

3. Restart the proxy so that it loads the installed code.

Use Rust 1.95 or newer for the build. The repository `rust-toolchain.toml` applies only to rustup-managed Cargo. The pacman-managed Cargo builds with its installed version.

### Pin behavior

The uv receipt at `~/.local/share/uv/tools/headroom-ai/uv-receipt.toml` path-pins the installed wheel. Therefore, the routine upgrade routes hold the pin instead of moving it. `host/cachyos/upgrade` runs `uv tool upgrade --all`, and `headroom update` detects the uv-tool install and runs `uv tool upgrade headroom-ai`. Both re-resolve the same path. Keep the wheel on disk.

To update this build, rebase the branch onto the newest upstream tag. Rebuild the wheel, and install the new wheel. Delete the superseded wheel.

This build is the whole Headroom install. `command -v headroom` must resolve to `~/.local/bin/headroom`. The uv routes above own every Headroom upgrade on this machine.

Because the guard sits on a release tag, the local build reports the same `headroom --version` value as the published package. To identify the installed build, read the receipt path, or run `rg _retire_image_pool` under the tool's `site-packages`.

After an upstream release includes the guard, restore the published package:

```sh
uv tool install --force --python 3.14 "headroom-ai[all]"
```

## Launch side effects

Remove `--context-tool`, `--no-context-tool`, and `HEADROOM_CONTEXT_TOOL` from launch configuration. During the first `wrap`, Headroom removes its managed legacy hook scripts and `rtk` or `lean-ctx` symlinks.

The MCP entry in `~/.claude.json` names `~/.local/bin/headroom`. Every reinstall recreates that symlink, so the entry survives a rebuild. Rewrite it with:

```sh
headroom mcp install --agent claude --proxy-url http://127.0.0.1:8787 --force
```

This command rewrites only the `headroom` entry in `~/.claude.json`. New sessions load the updated entry.

`wrap` also writes a `SessionStart` self-heal hook into each project's `.claude/settings.local.json`. That hook stores the absolute path of the binary that wrote it. After the binary moves, sweep the hooks and point each one at the current path:

```sh
rg -uu 'headroom wrap selfheal' ~/Projects/*/.claude ~/.local/app/*/.claude
```

Every hook must name `/home/eturkes/.local/bin/headroom`. These files are gitignored, so each machine repairs its own.

`wrap` keeps its state in `.claude/.headroom_wrap_*` files next to `settings.local.json`: a marker, an owner record for each env key, and a settings lock. Each project must gitignore `.claude/.headroom_wrap_*` together with `.claude/settings.local.json`. An ignore line that names only the marker leaves the other two files untracked.

## Token rate limit

Starting with 0.39.0, the proxy enforces its tokens-per-minute limit before it forwards a request. `--tpm`, `HEADROOM_TPM`, or `tpm` in `settings.json` sets the limit, and the default is 100,000. Before it forwards a request, the proxy counts the tokens in the request's `messages` with its own tokenizer, before compression. It checks that count against a token bucket. The bucket refills at the limit's rate and never holds more than one minute of tokens. A request that needs more tokens than the bucket holds gets HTTP 429 with a `Retry-After` header, and Claude Code shows it as:

```text
API Error: Request rejected (429) · {"detail":"Token rate limited. Retry after 301.8s"}
```

A request larger than the limit never fits in the bucket. The proxy always rejects it, although the error names a finite wait. With the default limit, a Claude Code session can send no turn after its conversation passes about 100,000 tokens. A smaller request fails only until the bucket refills. Claude Code retries a 429 when `Retry-After` is 60 seconds or less. A longer wait ends the turn with the error. Earlier builds do not enforce the limit.

`settings.json` sets `tpm` to 1,000,000,000, which disables the limit in practice. A `--tpm` option takes precedence over an exported `HEADROOM_TPM`, and both take precedence over the file. The `--no-rate-limit` flag turns off both rate limits. `wrap` does not pass that flag to the proxy that it starts, and `headroom proxy` reads no environment variable or `settings.json` key for it. The requests-per-minute limit keeps its default of 60.

The proxy applies `settings.json` only at startup. After you change the file, restart the proxy and confirm the active limits:

```sh
curl -sS http://127.0.0.1:8787/stats | jq .rate_limiter
```

## Knobs

`HEADROOM_IMAGE_ADMISSION_TIMEOUT_SECONDS` (default 1.0), `HEADROOM_IMAGE_TERMINATE_GRACE_SECONDS` (5.0), and `HEADROOM_OCR_INTRA_THREADS` / `HEADROOM_OCR_INTER_THREADS` (1) tune the guard. The checkout documents the rest in `docs/content/docs/proxy.mdx` and `docs/content/docs/configuration.mdx`.

## Verification

Prepare the test environment with `uv sync --frozen --extra all --extra dev`. Then run the bounded suites in the checkout:

```sh
uv run --frozen pytest \
  tests/test_image_compression_isolation.py \
  tests/test_image_compression_policy.py \
  tests/test_image_ocr_api_compat.py
```

`--frozen` keeps `uv.lock` at the tagged state. Without it, uv can rewrite the lockfile, and the next rebase then stops on the uncommitted change.

See the [container deployment](../../../container/aeon/headroom/README.md).
