# Headroom deployment on CachyOS

Copy `settings.json` to `~/.headroom/settings.json`. Its `anthropic_base_url` points to CLIProxyAPI at `127.0.0.1:8317`. The Headroom proxy listens on `127.0.0.1:8787`.

Start a session with:

```sh
ANTHROPIC_MODEL=<model> headroom wrap claude --1m
```

Set `ANTHROPIC_MODEL` explicitly. The `--1m` option passes this value to the launched process. The launch value overrides the Claude Code `model` setting. Therefore, `settings.json` omits that key.

## Image-worker termination guard

The PATH shadow adds hard termination for timed-out image-compression workers. RapidOCR and ONNX workers can otherwise accumulate until resource exhaustion.

`image-pool-hard-termination.patch` provides these controls:

- Terminate a worker, wait for the grace period, kill it, and shut down its pool.
- Retire pools with CAS and idempotent cleanup. A stale timeout can retire only its own pool.
- Admit one image job at a time. A busy worker rejects the next job immediately.
- Limit OCR ONNX intra-operation and inter-operation threads to one.
- Honor `--no-image-optimize`, `HEADROOM_NO_IMAGE_OPTIMIZE=1`, `--no-optimize`, and the per-request bypass header.

The patch applies to upstream tag `v0.34.0`. The installed shadow is `~/.local/bin/headroom`, ahead of the package-managed binary on `PATH`.

### Build and install

1. Check out the upstream tag for the packaged version.
2. Run `git am image-pool-hard-termination.patch`.
3. Run `uv build --wheel`. To skip the build, copy a prebuilt wheel that matches the tag.
4. Install the wheel:

   ```sh
   uv tool install --force --python 3.14 "headroom-ai[all] @ file://<wheel-path>"
   ```

5. Run `command -v headroom` and confirm that it resolves to `~/.local/bin/headroom`.
6. Restart the proxy so that it loads the installed code.
7. Prepare the test environment with `uv sync --extra all --extra dev`.
8. Run the bounded suites:

   ```sh
   uv run pytest \
     tests/test_image_compression_isolation.py \
     tests/test_image_compression_policy.py \
     tests/test_image_ocr_api_compat.py
   ```

Use Rust 1.95 or newer for the build. The repository `rust-toolchain.toml` applies only to rustup-managed Cargo.

`paru -Syu` updates the package-managed binary beneath the shadow. Keep the shadow at the packaged version, so that the guard stays the only difference. After a package upgrade, rebase the patch onto the matching upstream tag and rebuild. After the repository package includes the guard, run `uv tool uninstall headroom-ai` to restore it.

## Shadow side effects

Use this launch form:

```sh
ANTHROPIC_MODEL=<model> headroom wrap claude --1m
```

Remove `--context-tool`, `--no-context-tool`, and `HEADROOM_CONTEXT_TOOL` from launch configuration. During the first `wrap`, Headroom removes its managed legacy hook scripts and `rtk` or `lean-ctx` symlinks.

Install the MCP entry for the active binary:

```sh
headroom mcp install --agent claude --proxy-url http://127.0.0.1:8787 --force
```

This command rewrites only the `headroom` entry in `~/.claude.json`. New sessions load the updated entry. After you restore the package binary, run the command again.

See the [container deployment](../../../container/aeon/headroom/README.md).
