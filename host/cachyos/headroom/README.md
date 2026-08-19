# Headroom deployment on CachyOS

Copy `settings.json` to `~/.headroom/settings.json`. Its `anthropic_base_url` points to CLIProxyAPI at `127.0.0.1:8317`. The Headroom proxy listens on `127.0.0.1:8787`.

Start a session with:

```sh
ANTHROPIC_MODEL=<model> headroom wrap claude --1m
```

Set `ANTHROPIC_MODEL` explicitly. The `--1m` option passes this value to the launched process. The launch value overrides the Claude Code `model` setting. Therefore, `settings.json` omits that key.

## Image-worker termination guard

The installed build adds hard termination for timed-out image-compression workers. RapidOCR and ONNX workers can otherwise accumulate until resource exhaustion.

The build provides these controls:

- Terminate a worker, wait for the grace period, kill it, and shut down its pool. This order keeps the process table available to the signals.
- Retire pools with CAS and idempotent cleanup. A stale timeout can retire only its own pool.
- Admit one image job at a time. A busy worker rejects the next job immediately.
- Limit OCR ONNX intra-operation and inter-operation threads to one.
- Honor `--no-image-optimize`, `HEADROOM_NO_IMAGE_OPTIMIZE=1`, `--no-optimize`, and the per-request bypass header.

The source is `~/src/headroom`, a clone of `headroomlabs-ai/headroom`. Branch `fix/image-pool-hard-termination` carries the guard as a single commit on upstream tag `v0.35.0`, so the build reports the version of the release it patches.

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

To move this build, rebase the branch onto the newest upstream tag, rebuild, reinstall, and delete the superseded wheel.

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

## Knobs

`HEADROOM_IMAGE_ADMISSION_TIMEOUT_SECONDS` (default 1.0), `HEADROOM_IMAGE_TERMINATE_GRACE_SECONDS` (5.0), and `HEADROOM_OCR_INTRA_THREADS` / `HEADROOM_OCR_INTER_THREADS` (1) tune the guard. The checkout documents the rest in `docs/content/docs/proxy.mdx` and `docs/content/docs/configuration.mdx`.

## Verification

Prepare the test environment with `uv sync --extra all --extra dev`, then run the bounded suites in the checkout:

```sh
uv run pytest \
  tests/test_image_compression_isolation.py \
  tests/test_image_compression_policy.py \
  tests/test_image_ocr_api_compat.py
```

See the [container deployment](../../../container/aeon/headroom/README.md).
