# Headroom deployment on aeon

Copy `settings.json` to `~/.headroom/settings.json`. Its `anthropic_base_url` points to CLIProxyAPI at `127.0.0.1:8317`, and its `tpm` lifts the proxy's token rate limit (see [Token rate limit](#token-rate-limit)). The Headroom proxy listens on `127.0.0.1:8787`.

Start a session with:

```sh
ANTHROPIC_MODEL=claude-opus-5-5 headroom wrap claude --1m --code-memory none
```

`--code-memory none` keeps `wrap` from registering the Serena MCP server. Code intelligence comes from Claude Code's LSP plugins instead.

`--1m` passes `ANTHROPIC_MODEL` with a `[1m]` suffix to the launched process and falls back to `claude-opus-4-8` when it is unset. Claude Code's own `~/.claude/settings.json` pins `ANTHROPIC_MODEL` to `claude-opus-5-5[1m]` in its `env` block, and that pin overrides the launch value. Launch with the same model anyway, so that `wrap` names the model that actually runs.

## Image-worker termination guard

The installed build adds hard termination for timed-out image-compression workers. RapidOCR and ONNX workers can otherwise accumulate until the host starves.

The build provides these controls:

- Terminate a worker, wait for the grace period, kill it, and shut down its pool. This order keeps the process table available to the signals.
- Retire pools with CAS and idempotent cleanup. A stale timeout can retire only its own pool.
- Admit one image job at a time. A busy worker rejects the next job immediately.
- Limit OCR ONNX intra-operation and inter-operation threads to one.
- Honor `--no-image-optimize`, `HEADROOM_NO_IMAGE_OPTIMIZE=1`, `--no-optimize`, and the per-request bypass header.

The source is `~/src/headroom`, a clone of `headroomlabs-ai/headroom`. Branch `fix/image-pool-hard-termination` carries the guard as a single commit on upstream tag `v0.35.0`, so the build reports the version of the release it patches.

### Build and install

1. Run `CARGO_BUILD_JOBS=4 nice -n 10 uv build --wheel` in `~/src/headroom`. The build writes a wheel to `~/src/headroom/dist/`.
2. Install that wheel:

   ```sh
   uv tool install --force --python 3.14.5 "headroom-ai[all] @ file://<wheel-path>"
   ```

3. Restart the proxy so that it loads the installed code.

The repository `rust-toolchain.toml` pins the Rust version for the build.

### Pin behavior

The uv receipt at `~/.local/share/uv/tools/headroom-ai/uv-receipt.toml` path-pins the installed wheel. Therefore, the routine upgrade routes hold the pin instead of moving it. `container/aeon/upgrade` runs `uv tool upgrade --all`, and `headroom update` detects the uv-tool install and runs `uv tool upgrade headroom-ai`. Both re-resolve the same path. Keep the wheel on disk.

To move this build, rebase the branch onto the newest upstream tag, rebuild, reinstall, and delete the superseded wheel.

Because the guard sits on a release tag, the local build reports the same `headroom --version` value as the published package. To identify the installed build, read the receipt path, or run `rg _retire_image_pool` under the tool's `site-packages`.

After an upstream release includes the guard, restore the published package:

```sh
uv tool install --force --python 3.14.5 "headroom-ai[all]"
```

## Token rate limit

Starting with 0.39.0, the proxy enforces its tokens-per-minute limit before it forwards a request. `--tpm`, `HEADROOM_TPM`, or `tpm` in `settings.json` sets the limit, and the default is 100,000. For each request it would forward, the proxy counts the tokens in the request's `messages` with its own tokenizer, before compression, and checks that count against a token bucket. The bucket refills at the limit's rate and never holds more than one minute of tokens. A request that needs more tokens than the bucket holds gets HTTP 429 with a `Retry-After` header, and Claude Code shows it as:

```text
API Error: Request rejected (429) · {"detail":"Token rate limited. Retry after 301.8s"}
```

A request larger than the limit never fits in the bucket, so the proxy rejects it however long the client waits, even though the error names a finite wait. With the default limit, a Claude Code session whose conversation passes about 100,000 tokens can no longer send a turn. A smaller request fails only until the bucket refills. Claude Code retries a 429 on its own when `Retry-After` is 60 seconds or less, and it ends the turn with the error when the wait is longer. Earlier builds never enforce the limit, so the setting has no effect there.

`settings.json` sets `tpm` to 1,000,000,000, which disables the limit in practice. A `--tpm` option takes precedence over an exported `HEADROOM_TPM`, and both take precedence over the file. The `--no-rate-limit` flag turns off both rate limits, but `wrap` does not pass that flag to the proxy it starts, and `headroom proxy` reads no environment variable or `settings.json` key for it. The requests-per-minute limit keeps its default of 60.

The proxy applies `settings.json` only at startup. After you change the file, restart the proxy and confirm the active limits:

```sh
curl -sS http://127.0.0.1:8787/stats | jq .rate_limiter
```

## Knobs

`HEADROOM_IMAGE_ADMISSION_TIMEOUT_SECONDS` (default 1.0), `HEADROOM_IMAGE_TERMINATE_GRACE_SECONDS` (5.0), and `HEADROOM_OCR_INTRA_THREADS` / `HEADROOM_OCR_INTER_THREADS` (1) tune the guard. The checkout documents the rest in `docs/content/docs/proxy.mdx` and `docs/content/docs/configuration.mdx`.

## Verification

Run the bounded suites in the checkout:

```sh
PYTHONPATH=$PWD .venv/bin/python -m pytest \
  tests/test_image_compression_isolation.py \
  tests/test_image_compression_policy.py \
  tests/test_image_ocr_api_compat.py
```

See the [CachyOS deployment](../../../host/cachyos/headroom/README.md).
