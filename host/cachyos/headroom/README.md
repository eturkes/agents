# Headroom — CachyOS deployment

`settings.json` → `~/.headroom/settings.json`: `anthropic_base_url` = the proxy's upstream, CLIProxyAPI at `127.0.0.1:8317`. The proxy listens on `127.0.0.1:8787`; sessions run through `ANTHROPIC_MODEL=<model> headroom wrap claude --1m`. `--1m` always sets `ANTHROPIC_MODEL` on the launched process, falling back to `claude-opus-4-8`, so name the model explicitly — `claude-opus-5` or `claude-fable-5`. It also overrides Claude Code's `model` setting, so `settings.json` omits that key and the launch line is the single source.

## Image-worker fix (upstream-pending)

Stock headroom 0.33.0 leaks every timed-out image-compression worker: RapidOCR/ONNX processes at ~1 GiB + ~65 threads each accumulate until the machine starves. `image-pool-hard-termination.patch` (this dir) = commit `99481d5a` from the container's `~/src/headroom` checkout, base `01df2452` (`v0.33.0-14`, upstream `headroomlabs-ai/headroom`). It hard-terminates timed-out/crashed/abandoned workers (terminate → grace → kill → shutdown), retires pools CAS + idempotently so a stale timeout can only tear down its own pool, admits one image job at a time (a busy worker fails the next job open fast), bounds OCR ONNX intra/inter-op threads to 1, and makes the off-switches real: `--no-image-optimize` / `HEADROOM_NO_IMAGE_OPTIMIZE=1` (image-only), `--no-optimize` (global), per-request bypass header.

**State: deployed and live.** Upstream cloned to `~/src/headroom` at base `01df2452`, patch applied as branch `fix/image-pool-hard-termination`, `uv build --wheel` → `dist/headroom_ai-0.33.0-cp310-abi3-linux_x86_64.whl` (same filename as the container's), installed with `--python 3.14` (3.14.6 here, not the container's 3.14.5) → `~/.local/bin/headroom` = 0.33.0, shadowing the repo package, which is `headroom-ai-bin 0.32.1-1` here, so the shadow doubles as a version bump. Verified: 40/40 across the three bounded suites; run against the installed tool venv a timed-out worker is terminated, where stock 0.32.1 on the same script leaves it running; the patched proxy boots healthy on a spare port (`/health` 200, ready in ~6 s). A reboot then retired the stock proxy, so the next `headroom wrap claude` started `:8787` from the shadow — it now serves 0.33.0 patched, healthy, and `paru -Syu` still leaves the repo package at 0.32.1.

Headroom here = repo package (`paru`); shadow it, leave pacman alone:

1. Wheel — either build: clone upstream at the base commit, `git am image-pool-hard-termination.patch`, `uv build --wheel` (needs Rust ≥ 1.95; `rust-toolchain.toml` binds only rustup-managed cargo, so pacman's cargo uses its own — current — version). Or copy the container's prebuilt `~/src/headroom/dist/headroom_ai-0.33.0-cp310-abi3-linux_x86_64.whl`: built against older glibc, so it runs on this newer one.
2. `uv tool install --force --python 3.14.5 "headroom-ai[all] @ file://<wheel path>"` → `~/.local/bin/headroom`; confirm the shadow: `command -v headroom`.
3. Restart the proxy — a running process keeps serving old code.
4. Verify: `rg _retire_image_pool` under the tool's `site-packages` — the reliable provenance check, since `headroom --version` separates the two builds (0.33.0 vs 0.32.1) only until the repo package catches up — then the bounded suites from the patched checkout — `uv sync --extra all --extra dev` + `uv run pytest tests/test_image_compression_isolation.py tests/test_image_compression_policy.py tests/test_image_ocr_api_compat.py` (seconds; recreating the resource storm proves what these already prove).

`paru -Syu` keeps upgrading the shadowed repo package — harmless. Once a repo release ships the fix: `uv tool uninstall headroom-ai` → back to the repo binary.

## Shadow side-effects (0.32.1 → 0.33.0)

The shadow is a version bump as well as a patch, and 0.33.0 changes two things a session touches:

- **CLI context tools are gone.** `--context-tool` / `--no-context-tool` and `HEADROOM_CONTEXT_TOOL` now hard-error → launch line = `ANTHROPIC_MODEL=<model> headroom wrap claude --1m`; the feature they disabled no longer exists, so behavior is unchanged. On first run `wrap` purges leftovers of Headroom's own rtk/lean-ctx installs: generated `~/.claude/hooks/` scripts + `~/.local/bin/{rtk,lean-ctx}` symlinks into its managed dir.
- **The MCP retrieve tool re-registers.** `wrap` warns that the stored command (`/usr/bin/headroom`) differs from the resolved one; retrieve keeps working across the mismatch (both builds read `~/.headroom/ccr_store.db`), but fix it with `headroom mcp install --agent claude --proxy-url http://127.0.0.1:8787 --force`, which rewrites only the `headroom` entry in `~/.claude.json` and takes effect in the next session. Re-run it after the revert above, or the entry dangles at a path the uninstall just removed.

Container counterpart: `../../../container/aeon/headroom/README.md`.
