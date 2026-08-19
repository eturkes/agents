# Headroom deployment on aeon

Copy `settings.json` to `~/.headroom/settings.json`. Its `anthropic_base_url` points to CLIProxyAPI at `127.0.0.1:8317`. The Headroom proxy listens on `127.0.0.1:8787`.

Start a session with:

```sh
ANTHROPIC_MODEL=<model> headroom wrap claude --1m
```

Set `ANTHROPIC_MODEL` explicitly. The `--1m` option passes this value to the launched process. The launch value overrides the Claude Code `model` setting. Therefore, `settings.json` omits that key.

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

Neither route moves this build. To move it, rebase the branch onto the newest upstream tag, rebuild, reinstall, and delete the superseded wheel.

Because the guard sits on a release tag, the local build reports the same `headroom --version` value as the published package. To identify the installed build, read the receipt path, or run `rg _retire_image_pool` under the tool's `site-packages`.

After an upstream release includes the guard, restore the published package:

```sh
uv tool install --force --python 3.14.5 "headroom-ai[all]"
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
