# Headroom — container deployment

`settings.json` → `~/.headroom/settings.json`: `anthropic_base_url` = the proxy's upstream, CLIProxyAPI at `127.0.0.1:8317`. The proxy listens on `127.0.0.1:8787`; sessions run through `ANTHROPIC_MODEL=<model> headroom wrap claude --1m`. `--1m` always sets `ANTHROPIC_MODEL` on the launched process, falling back to `claude-opus-4-8`, so name the model explicitly — `claude-opus-5` or `claude-fable-5`. It also overrides Claude Code's `model` setting, so `settings.json` omits that key and the launch line is the single source.

## Patched build (until upstream ships the fix)

Installed headroom = locally built 0.33.0 wheel from `~/src/headroom` (clone of `headroomlabs-ai/headroom`), branch `fix/image-pool-hard-termination` = commit `99481d5a` on base `01df2452` (`v0.33.0-14`). Stock 0.33.0 leaks every timed-out image-compression worker — RapidOCR/ONNX processes at ~1 GiB + ~65 threads each accumulate until the host starves. The fix:

- Hard-terminates timed-out/crashed/abandoned image workers: terminate → grace → kill → shutdown, in that order (`shutdown()` first would drop the process table and turn the signals into silent no-ops). Pool retirement = CAS + idempotent → a stale timeout can only tear down its own pool, never a newer replacement.
- Single admission slot for the 1-worker pool: a busy worker fails the next job open fast instead of queueing it into a phantom timeout.
- Bounds RapidOCR ONNX intra/inter-op threads to 1 per session.
- Makes the off-switches real: `--no-image-optimize` / `HEADROOM_NO_IMAGE_OPTIMIZE=1` (image-only), `--no-optimize` (global), per-request bypass header.

Mechanics:

- The uv receipt (`~/.local/share/uv/tools/headroom-ai/uv-receipt.toml`) path-pins `~/src/headroom/dist/headroom_ai-0.33.0-cp310-abi3-linux_x86_64.whl` on Python 3.14.5 → `uv tool upgrade --all` re-resolves that same path: the pin holds, headroom stops following PyPI, and the wheel must stay on disk.
- `headroom --version` reports 0.33.0 either way → provenance = the receipt path, or `rg _retire_image_pool` under the tool's `site-packages`.
- Restart the proxy after any (re)install — a running process keeps serving old code.
- Rebuild: in `~/src/headroom` (`rust-toolchain.toml` pins Rust 1.95.0) run `CARGO_BUILD_JOBS=4 nice -n 10 uv build --wheel`, then the install below with the fresh wheel.
- Install/reinstall: `uv tool install --force --python 3.14.5 "headroom-ai[all] @ file://$HOME/src/headroom/dist/headroom_ai-0.33.0-cp310-abi3-linux_x86_64.whl"`.
- Un-pin once an upstream release ships the fix: `uv tool install --force --python 3.14.5 "headroom-ai[all]"`.

## Knobs (patched build)

`HEADROOM_IMAGE_ADMISSION_TIMEOUT_SECONDS` (default 1.0), `HEADROOM_IMAGE_TERMINATE_GRACE_SECONDS` (5.0), `HEADROOM_OCR_INTRA_THREADS` / `HEADROOM_OCR_INTER_THREADS` (1). Full docs: the checkout's `docs/content/docs/proxy.mdx` + `docs/content/docs/configuration.mdx`.

Verification: bounded suites in the checkout — `PYTHONPATH=$PWD .venv/bin/python -m pytest tests/test_image_compression_isolation.py tests/test_image_compression_policy.py tests/test_image_ocr_api_compat.py` (seconds; recreating the resource storm proves what these already prove).

CachyOS counterpart (patch file + port recipe): `../../../host/cachyos/headroom/README.md`.
