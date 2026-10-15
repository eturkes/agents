# Codex

- Runtime = Codex + GPT only; plain `codex --yolo` from repo root; instructions = `~/.codex/AGENTS.md` + `~/.codex/config.toml` + applicable repo `AGENTS.md`.
- Verbosity = low; personality/reasoning-summary/raw-reasoning display = off; Apps = disabled.
- Project Claude → retain client, URI/helper launchers + CLIProxyAPI.
- Filesystem = launch dir + user-scoped targets; task-serving environment + Codex changes (skills/plugins/software) = in scope.
- Artifacts → task directory or `~/.local/state/<task>/`. `~/Documents/` = personal backup; writes require explicit instruction.
- Edits to a file `~/.local/app/agents` tracks or deploys (`~/.codex/AGENTS.md`, `~/AGENTS.md`, `~/.claude/`) → final response names each + its change.

## Environment

- Host = CachyOS (Arch).
- Sessions = sole user `eturkes` + passwordless sudo.
- Before the first absolute-path call: expand `~` from active `$HOME` → resolve existing paths with `readlink -f` → derive home paths from that result.
- Desktop = live X11 session + authenticated GUI apps.
- GUI from TTY → child env overrides = `DISPLAY`, `XAUTHORITY`, `XDG_SESSION_TYPE`, `XDG_CURRENT_DESKTOP` from `systemctl --user show-environment`; expose only these keys.
- Defaults: Python → `uv`; Node.js → `pnpm`; visual QA/web scraping → `chromiumfish`.
- LLMs/scientific compute → NVIDIA dGPU; desktop/browser rendering + display/video → Intel iGPU. Preserve NVIDIA compute access + VRAM.
- Host maintenance → `~/.local/app/agents/host/cachyos/MAINTENANCE.md`.
- Authenticated web = BrowserOS Neo (MCP + skill `browseros-neo` own usage); BrowserOS = user's browser. Access = signed-in accounts + university journals. Neo unreachable → launch `browseros-neo` yourself; profile/PSD/cache + checks → `~/.local/app/agents/host/cachyos/BROWSER.md`. Signed-in PDF/PNG/DOM → `webcap --user-data-dir ~/.config/browser-claw`; isolated visual QA → `chromiumfish`.
- Neo from Bash/scripts → `browseros-call <tool> '<json-args>'`; schemas = `browseros-call --list-tools`. Use web tabs; screenshot background tabs in place; inspect every returned image/PDF.
- Site misbehaves in Neo (blank/broken render, dead controls, failed login/checkout/embed) → turn off uBlock Origin Lite (`ddkjiahejlhfcafbddmgiahcphecmpfh`) + I still don't care about cookies (`edibdbjcniadpccecjdfdjjppcpchdlm`), retry, re-enable when done with the site (browser-wide setting). Toggle via raw CDP: `ports.cdp` of `~/.config/browser-claw/.browseros/config.json` → background `chrome://extensions` target → `chrome.management.setEnabled(<id>, false|true)`; MCP refuses `chrome://` + drops `chrome-extension://` tabs.
- `gh` device login: background `gh auth login --web -h github.com -p https` to a log → read `XXXX-XXXX` code → signed-in browser at `https://github.com/login/device?skip_account_picker=true` → `Continue as <user>` → click first code box + type all 8 chars in one `act kind:"type"` → Continue → re-`snapshot` until `Authorize GitHub CLI` clears `[disabled]` → click.
- GitHub public CI reads → anonymous `/repos/{o}/{r}/actions/runs`, `/actions/runs/{id}/jobs`, `/commits/{sha}/check-runs`, `/check-runs/{id}/annotations`; job logs (`/actions/jobs/{id}/logs`) → `gh api --allow-escape-sequences` with a repo-read token.
- Post-task cleanup reaches task-touched paths outside the project too, `$HOME` above all.
- Headless capture = `webcap <url> [--pdf F] [--png F] [--dom F|-]` (`host/cachyos/webcap`, CDP over chromiumfish); full-page PNG → `--full-page` + direct inspection. Options = `--dark`, `--width`/`--height`, `--selector`/`--wait`, `--timeout`, `--user-data-dir`; fragment targets → verify scroll after client routing.
- Profile-directory access must use `webcap --user-data-dir D`: sibling `cp -a` clone preserves source bytes, browser component extensions + `Local State`'s `profile.last_used`. `--profile-directory` selects profile; default = `last_used`. Signed-out clone → sign in through live browser + recapture.
- Fallback = `$(chromiumfish path) --headless` with `--screenshot=<path>`, `--print-to-pdf=<path> --no-pdf-header-footer`, or `--dump-dom`; supports arbitrary Chrome flags (`--window-size`, `--user-agent`, `--force-device-scale-factor`).
- Dark capture → `--dark` promotes same-origin dark media blocks to `all`; cross-origin stylesheets + `matchMedia` stay light. CDP media emulation + `--force-dark-mode` also leave `prefers-color-scheme` light; JS-based themes need the site’s switch.
- Successful command + real output → treat SwANGLE/Vulkan `EGL` initialization errors + `Exiting GPU process` as benign.
- Shell/tool calls = native + uncompressed + unrewritten. `rg` = ripgrep; `grep` = GNU grep (BRE); `find` = GNU find. Byte-exact/clean → `command grep` | `/usr/bin/rg` | `/usr/bin/find`.
- Recursive search = `rg <pat> <path>`; `-r` = replacement. Name dot-dirs explicitly; explicit file paths bypass hidden/ignore filtering; tree sweep → `--hidden`, including ignored paths → `-uu` (`--hidden --no-ignore`).
- `pgrep -f`/`pkill -f` → one bracketed pattern (`index[.]js`) to exclude the shell wrapper; kill + relaunch in separate calls.
- User terminals = `zmx` sessions; `zmx attach` inside a session switches its live client instead of nesting. Keep `zmx` use read-only (`list`, `get`, `history`, `print-env`); PTY probes → `script -q -e -c '<cmd>' <log>`.
- `bgcmd` (`~/.local/bin/`) = filesystem REPL, objects persist across separate shell calls: `export BGCMDDIR=<dir> BGCMDPROMPT='>>> '` (re-export each call) → `bgcmd START <interp> -i -q` → `bgcmd '<oneliner>'` → `bgcmd 'exit()'; rm -rf "$BGCMDDIR"`.
- Binary-contained text → `/usr/bin/rg -a -o '<pat>.{0,400}'`; widen context on either side for minified call sites.
