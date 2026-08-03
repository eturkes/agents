# Headroom — CachyOS deployment

`settings.json` → `~/.headroom/settings.json`: `anthropic_base_url` = the proxy's upstream, CLIProxyAPI at `127.0.0.1:8317`. The proxy listens on `127.0.0.1:8787`; sessions run through `headroom wrap claude`.

## Image-worker fix (upstream-pending)

Stock headroom 0.33.0 leaks every timed-out image-compression worker: RapidOCR/ONNX processes at ~1 GiB + ~65 threads each accumulate until the machine starves. `image-pool-hard-termination.patch` (this dir) = commit `99481d5a` from the container's `~/src/headroom` checkout, base `01df2452` (`v0.33.0-14`, upstream `headroomlabs-ai/headroom`). It hard-terminates timed-out/crashed/abandoned workers (terminate → grace → kill → shutdown), retires pools CAS + idempotently so a stale timeout can only tear down its own pool, admits one image job at a time (a busy worker fails the next job open fast), bounds OCR ONNX intra/inter-op threads to 1, and makes the off-switches real: `--no-image-optimize` / `HEADROOM_NO_IMAGE_OPTIMIZE=1` (image-only), `--no-optimize` (global), per-request bypass header.

**State: patch not yet deployed on this machine — deploy + verify per below, then update this line.**

Headroom here = repo package (`paru`); shadow it, leave pacman alone:

1. Wheel — either build: clone upstream at the base commit, `git am image-pool-hard-termination.patch`, `uv build --wheel` (needs Rust ≥ 1.95; `rust-toolchain.toml` binds only rustup-managed cargo, so pacman's cargo uses its own — current — version). Or copy the container's prebuilt `~/src/headroom/dist/headroom_ai-0.33.0-cp310-abi3-linux_x86_64.whl`: built against older glibc, so it runs on this newer one.
2. `uv tool install --force --python 3.14.5 "headroom-ai[all] @ file://<wheel path>"` → `~/.local/bin/headroom`; confirm the shadow: `command -v headroom`.
3. Restart the proxy — a running process keeps serving old code.
4. Verify: `rg _retire_image_pool` under the tool's `site-packages` (`headroom --version` reports 0.33.0 either way), then the bounded suites from the patched checkout — `uv sync --extra all --extra dev` + `uv run pytest tests/test_image_compression_isolation.py tests/test_image_compression_policy.py tests/test_image_ocr_api_compat.py` (seconds; recreating the resource storm proves what these already prove).

`paru -Syu` keeps upgrading the shadowed repo package — harmless. Once a repo release ships the fix: `uv tool uninstall headroom-ai` → back to the repo binary.

Container counterpart: `../../../container/aeon/headroom/README.md`.
