# Headroom deployment on aeon

Copy `settings.json` to `~/.headroom/settings.json`. Its `anthropic_base_url` points to CLIProxyAPI at `127.0.0.1:8317`, and its `tpm` lifts the proxy's token rate limit (see [Token rate limit](#token-rate-limit)). The Headroom proxy listens on `127.0.0.1:8787`.

Start a session with:

```sh
ANTHROPIC_MODEL=claude-opus-5-5 headroom wrap claude --1m --code-memory none --effort <level>
```

`wrap` passes `--effort` to Claude Code, and teammates run at the same level. The [phase prompts](../../../claude/prompts/README.md) name the level for each phase.

`--code-memory none` keeps `wrap` from registering the Serena MCP server. Code intelligence comes from Claude Code's LSP plugins instead.

`--1m` passes `ANTHROPIC_MODEL` with a `[1m]` suffix to the launched process and falls back to `claude-opus-4-8` when it is unset. Claude Code's own `~/.claude/settings.json` pins `ANTHROPIC_MODEL` to `claude-opus-5-5[1m]` in its `env` block, and that pin overrides the launch value. Launch with the same model anyway, so that `wrap` names the model that actually runs.

## Image-worker termination guard

The installed build adds hard termination for timed-out image-compression workers. RapidOCR and ONNX workers can otherwise accumulate until the host starves.

The worker controls match the [CachyOS build](../../../host/cachyos/headroom/README.md#image-worker-termination-guard).

The source is `~/src/headroom`, a clone of `headroomlabs-ai/headroom`. Branch `fix/image-pool-hard-termination` applies the guard to upstream tag `v0.35.0`.

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

To update this build, rebase the branch onto the newest upstream tag. Rebuild the wheel, and install the new wheel. Delete the superseded wheel.

Because the guard sits on a release tag, the local build reports the same `headroom --version` value as the published package. To identify the installed build, read the receipt path, or run `rg _retire_image_pool` under the tool's `site-packages`.

After an upstream release includes the guard, restore the published package:

```sh
uv tool install --force --python 3.14.5 "headroom-ai[all]"
```

## Token rate limit

`settings.json` sets `tpm` to 1,000,000,000, which disables the limit in practice. The [CachyOS token rate limit section](../../../host/cachyos/headroom/README.md#token-rate-limit) describes the limit and the restart check.

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
