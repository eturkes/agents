# Container Fixes

Purpose: compact recovery notes for future ChatGPT container sessions. Record repeatable environment facts only. Keep secrets out of files shown to users, logs, URLs, and process arguments.

## First checks

```bash
bash -n /mnt/data/install.sh
bash /mnt/data/install.sh --doctor
bash /mnt/data/install.sh --net-probe
```

Run one package-manager job at a time. Check locks with `pgrep -a -x apt; pgrep -a -x apt-get; pgrep -a -x dpkg; pgrep -a -x dpkg-deb; pgrep -a -x unattended-upgr; pgrep -a -x cargo`. Repair apt with `bash /mnt/data/install.sh --fix-apt`.

Use detached installs when a tool call may time out: `bash /mnt/data/install.sh --bg <mode>`, then `bash /mnt/data/install.sh --bg-status <mode>`. Verify with smoke tests; treat background exit markers as hints.

## Network and package mirrors

Public DNS/direct hosts can fail. Prefer configured mirrors when `$CAAS_ARTIFACTORY_BASE_URL`, `$PIP_INDEX_URL`, `$CAAS_ARTIFACTORY_PYPI_REGISTRY`, `$CAAS_ARTIFACTORY_CARGO_REGISTRY`, or `$CAAS_ARTIFACTORY_NPM_REGISTRY` exists. Debian apt is usually pre-routed through `/etc/apt/sources.list.d/debian.sources`.

Authenticated curl probe without printing credentials:

```bash
CFG=/tmp/artifactory-curl.conf
umask 077
printf 'user = "%s:%s"\n' "$CAAS_ARTIFACTORY_READER_USERNAME" "$CAAS_ARTIFACTORY_READER_PASSWORD" > "$CFG"
curl --disable -fsS -K "$CFG" "https://${CAAS_ARTIFACTORY_BASE_URL}/artifactory/api/system/ping"
```

Attach Artifactory auth only to Artifactory URLs unless `INSTALL_CURL_CONFIG` is intentionally supplied. Pip should use the existing mirror environment; verify with `python3 -m pip --disable-pip-version-check index versions pip >/dev/null`.

Cargo uses source replacement when `$CAAS_ARTIFACTORY_CARGO_REGISTRY` exists:

```bash
bash /mnt/data/install.sh --cargo-config
source /tmp/install-rust/cargo-env
bash /mnt/data/install.sh --verify-rust-net
```

Npm is usable through the Artifactory npm virtual registry when `$CAAS_ARTIFACTORY_NPM_REGISTRY` and reader credentials are present. Direct `registry.npmjs.org` DNS may fail. Generate a scoped `.npmrc`, avoid printing it, and use npm normally:

```bash
bash /mnt/data/install.sh --npm-config
source /tmp/install-node/npm-env
bash /mnt/data/install.sh --verify-npm
npm install <pkg>
npm exec --yes <pkg> -- <args>
npm pack <pkg>@<version>
```

`npm config get registry` can be protected when credentials are supplied by environment. Prefer `npm ping`, `npm view <pkg> version`, `npm install`, or `npm pack` as checks.

## Toolchain notes

Lean archive installs may require `LD_LIBRARY_PATH` and `LEAN_PATH`; source `/tmp/install-lean/env` before using `lean`/`lake` outside the verifier. A valid installed binary may exist even when `lean` is absent from ambient `PATH`.

Lean's bundled LLVM libraries can shadow system LLVM and break tools such as `rustc`. Rust modes in `/mnt/data/install.sh` scrub Lean paths from `LD_LIBRARY_PATH`; for manual commands, start a clean shell or remove Lean paths.

Cargo may wait on its package-cache lock; check `pgrep -a -x cargo` before assuming a hang.

```bash
bash /mnt/data/install.sh --lean
bash /mnt/data/install.sh --lean-status
source /tmp/install-lean/env
bash /mnt/data/install.sh --verify-lean
bash /mnt/data/install.sh --rust
bash /mnt/data/install.sh --verify-rust
bash /mnt/data/install.sh --verify-rust-net
```

## Uploaded text and artifacts

Uploaded Markdown/text files under `/mnt/data` are normally UTF-8 and can be read directly if search snippets are truncated. Use file-search citations in chat answers when relying on uploaded-file content.

Before linking user-visible files:

```bash
bash /mnt/data/install.sh --artifact-check /mnt/data/<file>...
bash /mnt/data/install.sh --artifact-check --no-citations-or-urls /mnt/data/<spec>.md
```

Citation-free artifact checks fail on citation markers, file/web citation tokens, sandbox links, and raw URLs. Put citations in chat, not in citation-free artifacts. For PDFs, use screenshots before analyzing visual tables/figures.
