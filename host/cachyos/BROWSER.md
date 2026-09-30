# Browsers

- Roles = BrowserOS for the user; BrowserOS Neo for agents. Retain both packages and independent profiles.
- Packages = AUR `browseros-bin` + `browseros-neo-bin`; retain `profile-sync-daemon`.
- BrowserOS launch = existing private `~/.local/share/applications/browseros.desktop`; original profile + sign-in settings remain intact.
- Launch = `browseros-neo` → `~/.local/bin/browseros-neo` → `host/cachyos/browseros-neo`; desktop = `browserclaw.desktop`.
- Neo launcher = desktop environment + PSD readiness + cache directory + `Profile 3` + `--password-store=basic`. `browseros-neo-signin` reuses Google OAuth settings from the private BrowserOS desktop entry; keep credentials outside tracked files and logs.
- Managed profiles require configured OAuth clients at startup. Preserve account/management metadata; verify Chromium's `Signin.SigninAllowed` histogram and the native desktop UI.
- Browser sync = enabled in both; each has its own Sync GUID + Sync FCM InstanceID/token. Preserve BrowserOS's identity; regenerate copied Neo metadata before enabling sync.
- Launch the native binary through the machine wrapper; the AUR doctor deletes applied OTA migrations against its older bundled server.
- Profile = `~/.config/browser-claw`; PSD = `BROWSERS=(browseros-neo)`, overlay + suspend sync. Original BrowserOS data = `~/.config/browser-os` → `chromium`; use a separate profile copy for each browser.
- PSD definition = `psd-browseros-neo` → `/usr/share/psd/browsers/browseros-neo`; services = `psd.service` + `psd-resync.timer`.
- Cache = `~/.cache/browser-claw` → `/tmp/browser-claw-home-cache`; `/etc/tmpfiles.d/browseros-neo.conf` creates the private directory.
- MCP = `browseros-neo` → `http://127.0.0.1:9200/mcp`; Codex = `~/.codex/config.toml`. `browseros-call` reads that endpoint and supports JSON/SSE + session reuse; schemas = `browseros-call --list-tools`.
- Captures → `screenshot` the target tab directly; background tabs render their live DOM. Neo keeps the visible tab fixed: `Page.bringToFront` = no-op. Signed-in headless capture → `webcap --user-data-dir ~/.config/browser-claw`.
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

## Sync identity replay

Close both browsers and preserve offline profile backups first.
Dependencies = `leveldb`, `g++`, `openssl`; run from this repository root:

```bash
python -B host/cachyos/browseros-neo-sync-identity
python -B host/cachyos/browseros-neo-sync-identity --apply
```

The recipe clears copied Neo transport metadata/history + only the Sync app's copied GCM IID/registration. Chromium generates fresh identities at startup.
Other preferences, account/management state, model files and non-Sync GCM records remain intact. Prepared/distinct identities make replay a no-op.
Guards = empty account caches, no pending metadata commits, decryptable basic-store passwords. Profile/model files remain in place; native first downloads rebuild server caches.
Verify first sync, distinct identities, bookmarks/passwords and wallet cache values before using the repaired profile.

## Checks

```bash
python -B bin/check-browseros-call -q
python -B host/cachyos/check-browseros-neo-launcher -q
python -B host/cachyos/check-browseros-neo-sync-identity -q
python -B host/cachyos/check-browseros-neo
bash -n host/cachyos/browseros-neo
shellcheck host/cachyos/browseros-neo
ruff check bin/browseros-call bin/check-browseros-call host/cachyos/browseros-neo-signin host/cachyos/browseros-neo-sync-identity host/cachyos/check-browseros-neo-launcher host/cachyos/check-browseros-neo-sync-identity host/cachyos/check-browseros-neo host/cachyos/prune-desktop
codex/cachyos/check-instructions
codex/cachyos/deploy-instructions
```

Login reuse → inspect GitHub Settings + Google Account in Neo; both must stay signed in. Inspect a desktop capture for native account-policy dialogs.
Restart → stop Neo and its sidecar before PSD unsync; prove ports quiescent, relaunch, rerun the live check.
Isolated sign-in checks → offline profile copy + `--disable-browseros-server` + `--disable-browseros-server-updater` + `--disable-browseros-extensions` + `--disable-sync` + separate CDP port. Compare the startup eligibility with and without the private OAuth settings; keep live profiles and MCP configuration unchanged.
