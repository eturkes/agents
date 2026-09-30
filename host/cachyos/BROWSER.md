# BrowserOS Neo

- Package = AUR `browseros-neo-bin`; retain `profile-sync-daemon`.
- Launch = `browseros-neo` → `~/.local/bin/browseros-neo` → `host/cachyos/browseros-neo`; desktop = `browserclaw.desktop`.
- Launcher = desktop environment + PSD readiness + cache directory + `Profile 3` + `--password-store=basic`. It runs the native binary directly; the AUR doctor deletes applied OTA migrations against its older bundled server.
- Profile = `~/.config/browser-claw`; PSD = `BROWSERS=(browseros-neo)`, overlay + suspend sync. Original BrowserOS data = `~/.config/browser-os` → `chromium`; use a separate profile copy for each browser.
- PSD definition = `psd-browseros-neo` → `/usr/share/psd/browsers/browseros-neo`; services = `psd.service` + `psd-resync.timer`.
- Cache = `~/.cache/browser-claw` → `/tmp/browser-claw-home-cache`; `/etc/tmpfiles.d/browseros-neo.conf` creates the private directory.
- MCP = `browseros-neo` → `http://127.0.0.1:9200/mcp`; Codex = `~/.codex/config.toml`. `browseros-call` reads that endpoint and supports JSON/SSE + session reuse; schemas = `browseros-call --list-tools`.
- Captures → bring the target forward with `run`: `await browser.cdpJsonForPage(page, "Page.bringToFront", "{}")`; then `screenshot`. Signed-in headless capture → `webcap --user-data-dir ~/.config/browser-claw`.
- After MCP configuration changes, restart `codexify.service`; refresh an attached connector to load its new catalogue. New Codex sessions load the new MCP.

## Setup replay

Run from this repository root with both browsers closed. Preserve an existing Neo profile.

```bash
test -e ~/.config/browser-claw || cp -a --reflink=auto "$(readlink -f ~/.config/browser-os)" ~/.config/browser-claw
sudo -n install -m644 host/cachyos/psd-browseros-neo /usr/share/psd/browsers/browseros-neo
ln -sfn "$PWD/host/cachyos/browseros-neo" ~/.local/bin/browseros-neo
```

Set `~/.config/psd/psd.conf`: `USE_OVERLAYFS="yes"`, `USE_SUSPSYNC="yes"`, `BROWSERS=(browseros-neo)`.
Create the cache symlink and tmpfiles rule: `d /tmp/browser-claw-home-cache 0700 eturkes eturkes -`.
Set `Local State.browseros.server.proxy_port=9200`; active sidecar/CDP ports → `~/.config/browser-claw/.browseros/config.json`.
Set the user `browserclaw.desktop` Exec to `/home/eturkes/.local/bin/browseros-neo %U`.
Then enable PSD: `systemctl --user enable --now psd.service`.

## Checks

```bash
python -B bin/check-browseros-call -q
python -B host/cachyos/check-browseros-neo
bash -n host/cachyos/browseros-neo
shellcheck host/cachyos/browseros-neo
ruff check bin/browseros-call bin/check-browseros-call host/cachyos/check-browseros-neo host/cachyos/prune-desktop
codex/cachyos/check-instructions
codex/cachyos/deploy-instructions
```

Login reuse → inspect GitHub Settings + Google Account in Neo; both must stay signed in.
Restart → stop Neo and its sidecar, prove ports quiescent, relaunch, rerun the live check.
