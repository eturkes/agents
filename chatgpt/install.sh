#!/usr/bin/env bash
set -Eeuo pipefail
SELF="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/$(basename -- "${BASH_SOURCE[0]}")"
MODE="${1:---help}"; [ "$#" -gt 0 ] && shift || true
if [[ "$-" == *x* && "${INSTALL_ALLOW_XTRACE:-0}" != "1" ]]; then set +x; printf '[%s] xtrace disabled to protect credentials\n' "$(date -Is)" >&2; fi

INSTALL_LOCK_TIMEOUT="${INSTALL_LOCK_TIMEOUT:-600}"
INSTALL_NET_TIMEOUT="${INSTALL_NET_TIMEOUT:-12}"
PY_ENV_DIR="${PY_ENV_DIR:-/tmp/cds-proof-py}"
LEAN_VERSION="${LEAN_VERSION:-4.29.1}"
LEAN_WORK_DIR="${LEAN_WORK_DIR:-/tmp/install-lean}"
LEAN_ROOT="${LEAN_ROOT:-/opt/tools}"
LEAN_DIR="${LEAN_DIR:-$LEAN_ROOT/lean-${LEAN_VERSION#v}}"
LEAN_ENV_FILE="${LEAN_ENV_FILE:-$LEAN_WORK_DIR/env}"
RUST_WORK_DIR="${RUST_WORK_DIR:-/tmp/install-rust}"
CARGO_ENV_FILE="${CARGO_ENV_FILE:-$RUST_WORK_DIR/cargo-env}"
NPM_WORK_DIR="${NPM_WORK_DIR:-/tmp/install-node}"
NPM_USERCONFIG="${NPM_USERCONFIG:-$NPM_WORK_DIR/npmrc}"
NPM_ENV_FILE="${NPM_ENV_FILE:-$NPM_WORK_DIR/npm-env}"

log(){ printf '[%s] %s\n' "$(date -Is)" "$*" >&2; }
die(){ printf 'ERROR: %s\n' "$*" >&2; exit 1; }
have(){ command -v "$1" >/dev/null 2>&1; }
with_timeout(){ local s="$1"; shift; if have timeout; then timeout "$s" "$@"; else "$@"; fi; }
as_root(){ if [ "$(id -u)" -eq 0 ]; then "$@"; elif have sudo; then sudo "$@"; else die 'need root or sudo'; fi; }
b64(){ if base64 --help 2>/dev/null | grep -q -- '-w'; then base64 -w0; else base64 | tr -d '\n'; fi; }
sanitize(){ printf '%s' "$1" | sed -E 's/^--//; s/[^A-Za-z0-9_.-]+/-/g'; }
mask(){ sed -E 's#(https?://)[^/@:[:space:]]+:[^/@[:space:]]+@#\1***:***@#g; s#(user = ")[^"]+#\1***#g; s#Basic [A-Za-z0-9+/=]+#Basic ***#g; s#(CAAS_ARTIFACTORY_[A-Z_]*PASSWORD=)[^[:space:]]+#\1***#g'; }
esc_curl(){ printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
url_host(){ local x="${1:-}"; x="${x#*://}"; x="${x%%/*}"; x="${x##*@}"; x="${x%%:*}"; printf '%s' "$x"; }
url_matches_artifactory(){ local u="${1:-}" base="${CAAS_ARTIFACTORY_BASE_URL:-}"; [ -n "$base" ] && case "$u" in *"$base"*) return 0;; esac; return 1; }
clean_ld_path(){ local old="${LD_LIBRARY_PATH:-}" p out=() IFS=:; for p in $old; do [ -z "$p" ] && continue; case "$p" in "$LEAN_DIR/lib"|"$LEAN_DIR/lib/lean"|*/lean-*/lib|*/lean-*/lib/lean) continue;; *) out+=("$p");; esac; done; (IFS=:; printf '%s' "${out[*]-}"); }
without_lean_ld(){ local ld; ld="$(clean_ld_path)"; if [ -n "$ld" ]; then LD_LIBRARY_PATH="$ld" "$@"; else env -u LD_LIBRARY_PATH "$@"; fi; }
curl_opts(){ local a=(--disable -fsSL --connect-timeout 20 --retry 5 --retry-delay 2); curl --help all 2>/dev/null | grep -q -- '--retry-connrefused' && a+=(--retry-connrefused); curl --help all 2>/dev/null | grep -q -- '--retry-all-errors' && a+=(--retry-all-errors); printf '%s\n' "${a[@]}"; }

usage(){ cat <<'USAGE'
usage: /mnt/data/install.sh MODE
modes: --doctor --net-probe|--network-probe [URL...] --fix-apt --apt PKG... --venv --pip PKG... --py-smoke --curl-config [PATH] --bg MODE [ARGS...] --bg-status MODE --npm-config --verify-npm --npm PKG... --npm-pack PKG... --lean --lean-install-fg --lean-status --verify-lean --cargo-config --rust --verify-rust --verify-rust-net --artifact-check [--no-citations-or-urls|--no-citations] FILE... --text-gate FILE... --artifact-clean FILE...
USAGE
}

lock_busy(){ pgrep -x apt >/dev/null || pgrep -x apt-get >/dev/null || pgrep -x dpkg >/dev/null || pgrep -x dpkg-deb >/dev/null || pgrep -x unattended-upgr >/dev/null; }
show_locks(){ local seen=0 p; for p in apt apt-get dpkg dpkg-deb unattended-upgr; do pgrep -a -x "$p" && seen=1 || true; done; [ "$seen" -eq 1 ] || echo none; }
wait_locks(){ for _ in $(seq 1 "$INSTALL_LOCK_TIMEOUT"); do lock_busy || return 0; sleep 1; done; die "apt/dpkg busy after ${INSTALL_LOCK_TIMEOUT}s"; }
apt_cmd(){ have apt-get || die 'apt-get missing'; wait_locks; as_root apt-get -o Acquire::Retries=5 -o DPkg::Lock::Timeout="$INSTALL_LOCK_TIMEOUT" "$@"; }
apt_install(){ [ "$#" -gt 0 ] || die 'usage: --apt PKG...'; apt_cmd update; DEBIAN_FRONTEND=noninteractive apt_cmd install -y --no-install-recommends "$@"; }
apt_missing(){ local miss=() p; for p in "$@"; do dpkg-query -W -f='${db:Status-Abbrev}' "$p" 2>/dev/null | grep -q '^ii ' || miss+=("$p"); done; [ "${#miss[@]}" -eq 0 ] || apt_install "${miss[@]}"; }
fix_apt(){ wait_locks; as_root dpkg --configure -a || true; wait_locks; as_root apt-get -o DPkg::Lock::Timeout="$INSTALL_LOCK_TIMEOUT" -f install -y || true; as_root dpkg --audit || true; }

write_curl_config(){ local f="${1:-/tmp/artifactory-curl.conf}"; [ -n "${CAAS_ARTIFACTORY_READER_USERNAME:-}" ] && [ -n "${CAAS_ARTIFACTORY_READER_PASSWORD:-}" ] || die 'CAAS Artifactory credentials absent'; mkdir -p "$(dirname -- "$f")"; umask 077; printf 'user = "%s:%s"\n' "$(esc_curl "$CAAS_ARTIFACTORY_READER_USERNAME")" "$(esc_curl "$CAAS_ARTIFACTORY_READER_PASSWORD")" > "$f"; chmod 600 "$f"; printf '%s\n' "$f"; }
curl_cfg(){ local f="$1" u="${2:-}"; [ -n "${INSTALL_CURL_CONFIG:-}" ] && { printf '%s\n' "$INSTALL_CURL_CONFIG"; return; }; [ -z "$u" ] || url_matches_artifactory "$u" || return 0; [ -n "${CAAS_ARTIFACTORY_READER_USERNAME:-}" ] && [ -n "${CAAS_ARTIFACTORY_READER_PASSWORD:-}" ] && write_curl_config "$f" || true; }

net_probe(){
  local urls=() u h cfg="" code tmp ok=0
  if [ "$#" -gt 0 ]; then urls=("$@"); else
    [ -n "${CAAS_ARTIFACTORY_BASE_URL:-}" ] && urls+=("https://${CAAS_ARTIFACTORY_BASE_URL}/artifactory/api/system/ping")
    [ -n "${CAAS_ARTIFACTORY_PYPI_REGISTRY:-}" ] && urls+=("https://${CAAS_ARTIFACTORY_PYPI_REGISTRY%/}/simple/")
    [ -n "${CAAS_ARTIFACTORY_CARGO_REGISTRY:-}" ] && urls+=("https://${CAAS_ARTIFACTORY_CARGO_REGISTRY%/}/config.json")
    [ -n "${CAAS_ARTIFACTORY_NPM_REGISTRY:-}" ] && urls+=("https://${CAAS_ARTIFACTORY_NPM_REGISTRY%/}/-/ping")
    urls+=("https://github.com" "https://pypi.org/simple/" "https://registry.npmjs.org/")
  fi
  printf 'resolv_conf='; sed -n 's/^nameserver /nameserver:/p' /etc/resolv.conf | paste -sd, - || true
  [ -n "${CAAS_ARTIFACTORY_READER_USERNAME:-}" ] && [ -n "${CAAS_ARTIFACTORY_READER_PASSWORD:-}" ] && cfg="$(write_curl_config /tmp/artifactory-curl-net-probe.conf)" || true
  tmp="$(mktemp)"
  for u in "${urls[@]}"; do
    h="$(url_host "$u")"; printf 'url=%s\n' "$u" | mask
    if [ -n "$h" ] && with_timeout 5 getent hosts "$h" >/dev/null 2>&1; then echo 'dns=ok'; else echo 'dns=fail'; fi
    if [ -n "$cfg" ] && url_matches_artifactory "$u"; then
      if with_timeout "$((INSTALL_NET_TIMEOUT+3))" curl --disable -fsSIL -K "$cfg" --connect-timeout 5 --max-time "$INSTALL_NET_TIMEOUT" "$u" >/dev/null 2>"$tmp"; then code=0; else code=$?; fi
    else
      if with_timeout "$((INSTALL_NET_TIMEOUT+3))" curl --disable -fsSIL --connect-timeout 5 --max-time "$INSTALL_NET_TIMEOUT" "$u" >/dev/null 2>"$tmp"; then code=0; else code=$?; fi
    fi
    if [ "$code" -eq 0 ]; then echo 'http=head-ok'; ok=1; else printf 'http=head-fail:%s ' "$code"; tail -n 1 "$tmp" | mask || true; fi
  done
  rm -f "$tmp"; [ -z "$cfg" ] || rm -f "$cfg"
  printf 'artifactory_base=%s pypi=%s cargo=%s npm=%s\n' "$([ -n "${CAAS_ARTIFACTORY_BASE_URL:-}" ] && echo present || echo absent)" "$([ -n "${CAAS_ARTIFACTORY_PYPI_REGISTRY:-}${PIP_INDEX_URL:-}" ] && echo present || echo absent)" "$([ -n "${CAAS_ARTIFACTORY_CARGO_REGISTRY:-}" ] && echo present || echo absent)" "$([ -n "${CAAS_ARTIFACTORY_NPM_REGISTRY:-}${NPM_CONFIG_REGISTRY:-}" ] && echo present || echo absent)"
  [ "$ok" -eq 1 ] || return 1
}

venv(){ apt_missing python3-venv python3-pip ca-certificates || true; python3 -m venv "$PY_ENV_DIR"; "$PY_ENV_DIR/bin/python" -m pip --version; printf 'source %q/bin/activate\n' "$PY_ENV_DIR"; }
pip_install(){ [ "$#" -gt 0 ] || die 'usage: --pip PKG...'; [ -x "$PY_ENV_DIR/bin/python" ] || venv; PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_NO_INPUT=1 "$PY_ENV_DIR/bin/python" -m pip install "$@"; }
py_smoke(){ local py=python3; [ -x "$PY_ENV_DIR/bin/python" ] && py="$PY_ENV_DIR/bin/python"; "$py" - <<'PY'
import hashlib, pathlib, sqlite3, ssl, sys
print('python-ok', sys.version.split()[0], hashlib.sha256(b'ok').hexdigest()[:8], pathlib.Path('/mnt/data').exists())
PY
}

bg(){ local mode label work; [ "$#" -gt 0 ] || die 'usage: --bg MODE [ARGS...]'; mode="$1"; shift; label="${INSTALL_BG_LABEL:-$(sanitize "$mode")}"; work="${INSTALL_BG_WORK:-/tmp/install-bg-$label}"; mkdir -p "$work"; rm -f "$work/exit" "$work/log"; if have setsid; then setsid bash -c 'trap "" HUP INT TERM; bash "$1" "$2" "${@:4}"; c=$?; echo "$c" > "$3"; exit "$c"' _ "$SELF" "$mode" "$work/exit" "$@" >"$work/log" 2>&1 & else nohup bash -c 'trap "" HUP INT TERM; bash "$1" "$2" "${@:4}"; c=$?; echo "$c" > "$3"; exit "$c"' _ "$SELF" "$mode" "$work/exit" "$@" >"$work/log" 2>&1 & fi; echo "$!" > "$work/pid"; printf 'started label=%s pid=%s log=%s exit_file=%s\n' "$label" "$(cat "$work/pid")" "$work/log" "$work/exit"; }
bg_status(){ local label="${1:-}" work pid; [ -n "$label" ] || die 'usage: --bg-status MODE'; work="${INSTALL_BG_WORK:-/tmp/install-bg-$(sanitize "$label")}"; printf 'status_dir=%s\n' "$work"; if [ -f "$work/pid" ]; then pid="$(cat "$work/pid")"; printf 'pid=%s\n' "$pid"; if ps -p "$pid" -o pid,stat,etime,args 2>/dev/null; then echo running=yes; else echo running=no; fi; else echo pid=missing; fi; [ -f "$work/log" ] && tail -n 120 "$work/log" | mask || echo "no log: $work/log"; [ -f "$work/exit" ] && printf 'exit=%s\n' "$(cat "$work/exit")" || echo exit=missing; }

lean_v(){ printf '%s\n' "${LEAN_VERSION#v}"; }
lean_platform(){ case "$(uname -s):$(uname -m)" in Linux:x86_64) echo linux;; Linux:aarch64|Linux:arm64) echo linux_aarch64;; Darwin:x86_64) echo darwin;; Darwin:aarch64|Darwin:arm64) echo darwin_aarch64;; *) die "unsupported Lean host: $(uname -s) $(uname -m)";; esac; }
lean_base(){ if [ -n "${LEAN_ARCHIVE_BASE:-}" ]; then echo "${LEAN_ARCHIVE_BASE%/}"; elif [ -n "${CAAS_ARTIFACTORY_BASE_URL:-}" ]; then echo "https://${CAAS_ARTIFACTORY_BASE_URL}/artifactory/github-remote/leanprover/lean4/releases/download"; else echo 'https://github.com/leanprover/lean4/releases/download'; fi; }
lean_url(){ [ -n "${LEAN_URL:-}" ] && { echo "$LEAN_URL"; return; }; printf '%s/v%s/lean-%s-%s.tar.zst\n' "$(lean_base)" "$(lean_v)" "$(lean_v)" "$(lean_platform)"; }
lean_sha(){ [ -n "${LEAN_SHA256:-}" ] && { echo "$LEAN_SHA256"; return; }; case "$(lean_v):$(lean_platform)" in 4.29.1:linux) echo bf062d29556d655685fb287563c249ad6a8fde34352c18b5e32568a595c1aec1;; esac; }
lean_env(){ mkdir -p "$(dirname -- "$LEAN_ENV_FILE")"; { printf 'export PATH=%q:"$PATH"\n' "$LEAN_DIR/bin"; printf 'export LD_LIBRARY_PATH=%q:${LD_LIBRARY_PATH:-}\n' "$LEAN_DIR/lib/lean:$LEAN_DIR/lib"; printf 'export LEAN_PATH=%q:${LEAN_PATH:-}\n' "$LEAN_DIR/lib/lean"; } > "$LEAN_ENV_FILE"; chmod 644 "$LEAN_ENV_FILE"; }
lean_links(){ ( cd "$LEAN_DIR/lib" && for x in libLLVM-19.so:libLLVM.so.19.1 libatomic.so:libatomic.so.1.2.0 libc++.so.1:libc++.so.1.0 libc++abi.so.1:libc++abi.so.1.0 libclang-cpp.so:libclang-cpp.so.19.1 libunwind.so:libunwind.so.1 libz.so:libz.so.1.2.11; do n="${x%%:*}"; t="${x#*:}"; [ -e "$t" ] || continue; [ -e "$n" ] || [ -L "$n" ] || ln -s "$t" "$n"; done ); }
lean_install_fg(){ local url archive part cfg sha tmp top args miss=(); for c in curl tar zstd sha256sum; do have "$c" || miss+=("$c"); done; [ "${#miss[@]}" -eq 0 ] || apt_missing ca-certificates curl tar zstd coreutils; mkdir -p "$LEAN_WORK_DIR" "$LEAN_ROOT"; url="$(lean_url)"; archive="$LEAN_WORK_DIR/$(basename "$url")"; part="$archive.part"; cfg="$(curl_cfg "$LEAN_WORK_DIR/artifactory-curl.conf" "$url" || true)"; if [ ! -x "$LEAN_DIR/bin/lean" ]; then mapfile -t args < <(curl_opts); [ -n "$cfg" ] && args+=(-K "$cfg"); curl "${args[@]}" "$url" -o "$part"; sha="$(lean_sha || true)"; [ -z "$sha" ] || printf '%s  %s\n' "$sha" "$part" | sha256sum -c -; mv "$part" "$archive"; tmp="$(mktemp -d "$LEAN_WORK_DIR/extract.XXXXXX")"; zstd -T1 -dc "$archive" | tar --no-same-owner -xf - -C "$tmp"; top="$(find "$tmp" -mindepth 1 -maxdepth 1 -type d -print -quit)"; [ -n "$top" ] || die 'Lean archive extraction yielded no top directory'; rm -rf "$LEAN_DIR"; mv "$top" "$LEAN_DIR"; rm -rf "$tmp"; chmod -R a+rX "$LEAN_DIR" || true; lean_links; fi; lean_env; verify_lean; }
install_lean(){ bg --lean-install-fg; }
lean_status(){ bg_status --lean-install-fg; [ -f "$LEAN_ENV_FILE" ] && printf 'env=%s\n' "$LEAN_ENV_FILE" || true; }
verify_lean(){ lean_env; export PATH="$LEAN_DIR/bin:$PATH" LD_LIBRARY_PATH="$LEAN_DIR/lib/lean:$LEAN_DIR/lib:${LD_LIBRARY_PATH:-}" LEAN_PATH="$LEAN_DIR/lib/lean:${LEAN_PATH:-}"; [ -x "$LEAN_DIR/bin/lean" ] || die "lean missing: $LEAN_DIR"; lean --version; lake --version; leanc --version; local d; d="$(mktemp -d)"; printf '%s\n' 'example : 1 + 1 = 2 := by decide' '#eval (40 + 2 : Nat)' > "$d/Smoke.lean"; lean "$d/Smoke.lean"; rm -rf "$d"; echo lean-ok; }

cargo_config(){ local reg="${CAAS_ARTIFACTORY_CARGO_REGISTRY:-}" home="${CARGO_HOME:-$HOME/.cargo}"; [ -n "$reg" ] || { log 'CAAS_ARTIFACTORY_CARGO_REGISTRY unset; skipped'; return 0; }; reg="${reg%/}/"; case "$reg" in https://*) ;; *) reg="https://$reg";; esac; mkdir -p "$home" "$RUST_WORK_DIR"; printf '%s\n' '[registry]' 'global-credential-providers = ["cargo:token"]' '' '[source.crates-io]' 'replace-with = "caas"' '' '[source.caas]' "registry = \"sparse+$reg\"" '' '[registries.caas]' "index = \"sparse+$reg\"" 'credential-provider = "cargo:token"' > "$home/config.toml"; chmod 600 "$home/config.toml"; { printf 'export CARGO_HOME=%q\n' "$home"; cat <<'ENV'
if [ -n "${CAAS_ARTIFACTORY_READER_USERNAME:-}" ] && [ -n "${CAAS_ARTIFACTORY_READER_PASSWORD:-}" ]; then
  if base64 --help 2>/dev/null | grep -q -- '-w'; then _t=$(printf '%s:%s' "$CAAS_ARTIFACTORY_READER_USERNAME" "$CAAS_ARTIFACTORY_READER_PASSWORD" | base64 -w0); else _t=$(printf '%s:%s' "$CAAS_ARTIFACTORY_READER_USERNAME" "$CAAS_ARTIFACTORY_READER_PASSWORD" | base64 | tr -d '\n'); fi
  export CARGO_REGISTRIES_CAAS_TOKEN="Basic ${_t}"
  unset _t
fi
ENV
  } > "$CARGO_ENV_FILE"; chmod 600 "$CARGO_ENV_FILE"; log "cargo config: $home/config.toml ; env: $CARGO_ENV_FILE"; }
export_cargo_token(){ [ -n "${CAAS_ARTIFACTORY_READER_USERNAME:-}" ] && [ -n "${CAAS_ARTIFACTORY_READER_PASSWORD:-}" ] || return 0; export CARGO_REGISTRIES_CAAS_TOKEN="Basic $(printf '%s:%s' "$CAAS_ARTIFACTORY_READER_USERNAME" "$CAAS_ARTIFACTORY_READER_PASSWORD" | b64)"; }
verify_rust(){ cd /; have rustc || die 'rustc missing'; have cargo || die 'cargo missing'; without_lean_ld rustc --version; without_lean_ld cargo --version; local d="$RUST_WORK_DIR/rust-smoke"; rm -rf "$d"; mkdir -p "$d/src"; printf '%s\n' '[package]' 'name="rust_smoke"' 'version="0.1.0"' 'edition="2021"' > "$d/Cargo.toml"; printf 'fn main(){println!("cargo-ok");}\n' > "$d/src/main.rs"; (cd "$d" && export CARGO_TERM_COLOR=never && without_lean_ld cargo metadata --offline --format-version=1 >/dev/null); echo rust-ok; }
install_rust(){ apt_missing rustc cargo ca-certificates pkg-config libssl-dev || true; cargo_config || true; verify_rust; }
verify_rust_net(){ cd /; cargo_config; export_cargo_token; local d="$RUST_WORK_DIR/cargo-net-smoke"; rm -rf "$d"; mkdir -p "$d/src"; printf '%s\n' '[package]' 'name="cargo_net_smoke"' 'version="0.1.0"' 'edition="2021"' '[dependencies]' 'itoa="1"' > "$d/Cargo.toml"; printf 'fn main(){let mut b=itoa::Buffer::new(); let _=b.format(42);}\n' > "$d/src/main.rs"; (cd "$d" && export CARGO_TERM_COLOR=never CARGO_TARGET_DIR="$d/target" && without_lean_ld cargo fetch --quiet && without_lean_ld cargo check --quiet); echo cargo-net-ok; }


npm_registry(){ local reg="${CAAS_ARTIFACTORY_NPM_REGISTRY:-${NPM_CONFIG_REGISTRY:-}}" proto rest; [ -n "$reg" ] || reg='https://registry.npmjs.org/'; case "$reg" in http://*|https://*) ;; *) reg="https://$reg";; esac; proto="${reg%%://*}"; rest="${reg#*://}"; case "$rest" in *@*) rest="${rest#*@}"; reg="$proto://$rest";; esac; printf '%s/\n' "${reg%/}"; }
npm_config(){ have npm || apt_missing nodejs npm ca-certificates || true; have npm || die 'npm missing'; local reg scope auth; reg="$(npm_registry)"; scope="${reg#https://}"; scope="${scope#http://}"; mkdir -p "$NPM_WORK_DIR"; umask 077; { printf 'registry=%s\n' "$reg"; if [ -n "${CAAS_ARTIFACTORY_READER_USERNAME:-}" ] && [ -n "${CAAS_ARTIFACTORY_READER_PASSWORD:-}" ] && url_matches_artifactory "$reg"; then auth="$(printf '%s:%s' "$CAAS_ARTIFACTORY_READER_USERNAME" "$CAAS_ARTIFACTORY_READER_PASSWORD" | b64)"; printf '//%s:_auth=%s\n//%s:always-auth=true\nemail=none@example.invalid\n' "$scope" "$auth" "$scope"; fi; printf 'strict-ssl=true\nfund=false\naudit=false\n'; } > "$NPM_USERCONFIG"; chmod 600 "$NPM_USERCONFIG"; { printf 'export NPM_CONFIG_USERCONFIG=%q\n' "$NPM_USERCONFIG"; printf 'export NPM_CONFIG_REGISTRY=%q\n' "$reg"; } > "$NPM_ENV_FILE"; chmod 600 "$NPM_ENV_FILE"; log "npm config: $NPM_USERCONFIG ; env: $NPM_ENV_FILE"; }
with_npm(){ npm_config; NPM_CONFIG_USERCONFIG="$NPM_USERCONFIG" NPM_CONFIG_REGISTRY="$(npm_registry)" "$@"; }
verify_npm(){ cd /; npm_config; export NPM_CONFIG_USERCONFIG="$NPM_USERCONFIG" NPM_CONFIG_REGISTRY="$(npm_registry)"; node --version; npm --version; npm ping --loglevel=notice; test "$(npm view left-pad version --loglevel=warn)" = '1.3.0'; local d="$NPM_WORK_DIR/npm-smoke"; rm -rf "$d"; mkdir -p "$d"; printf '{"private":true,"dependencies":{"left-pad":"1.3.0"}}\n' > "$d/package.json"; (cd "$d" && npm install --ignore-scripts --package-lock-only --loglevel=warn && npm exec --yes cowsay -- --version >/dev/null); echo npm-ok; }
npm_install(){ [ "$#" -gt 0 ] || die 'usage: --npm PKG...'; with_npm npm install "$@"; }
npm_pack(){ [ "$#" -gt 0 ] || die 'usage: --npm-pack PKG...'; with_npm npm pack "$@"; }

text_gate(){ [ "$#" -gt 0 ] || die 'usage: --text-gate FILE...'; local pat="${TEXT_GATE_PATTERN:-|filecite|web\.run|sandbox:|https?://|www\.|turn[0-9]+(file|search|view|news|finance|forecast|sports)[0-9]+}" f bad=0; for f in "$@"; do [ -s "$f" ] || die "missing/empty text: $f"; if grep -nIE "$pat" "$f"; then bad=1; fi; done; [ "$bad" -eq 0 ] || die 'text gate failed'; }
artifact_clean(){ artifact_check --no-citations-or-urls "$@"; }
artifact_check(){ local no_cite=0 f pat="${TEXT_GATE_PATTERN:-|filecite|web\.run|sandbox:|https?://|www\.|turn[0-9]+(file|search|view|news|finance|forecast|sports)[0-9]+}"; while [ "$#" -gt 0 ]; do case "$1" in --no-citations-or-urls|--no-citations) no_cite=1; shift;; *) break;; esac; done; [ "$#" -gt 0 ] || die 'usage: --artifact-check [--no-citations-or-urls|--no-citations] FILE...'; for f in "$@"; do [ -s "$f" ] || die "missing/empty artifact: $f"; stat -c '%n %s bytes' "$f"; sha256sum "$f" > "$f.sha256"; case "$f" in *.zip) have unzip || die 'unzip missing'; unzip -t "$f" >/dev/null;; esac; if [ "$no_cite" -eq 1 ] && grep -nIE "$pat" "$f"; then die "citation/url token found: $f"; fi; done; }

doctor(){ printf 'script=%s\nos=%s\narch=%s\nuid=%s\n' "$SELF" "$(. /etc/os-release 2>/dev/null; echo "${PRETTY_NAME:-unknown}")" "$(uname -m)" "$(id -u)"; local c; for c in bash python3 curl tar zstd sha256sum apt-get dpkg rustc cargo node npm lean lake leanc; do have "$c" && printf '%-10s %s\n' "$c:" "$(command -v "$c")" || printf '%-10s missing\n' "$c:"; done; printf 'apt_locks='; show_locks; printf 'artifactory=%s pypi=%s cargo=%s npm=%s\n' "$([ -n "${CAAS_ARTIFACTORY_BASE_URL:-}" ] && echo present || echo absent)" "$([ -n "${CAAS_ARTIFACTORY_PYPI_REGISTRY:-}${PIP_INDEX_URL:-}" ] && echo present || echo absent)" "$([ -n "${CAAS_ARTIFACTORY_CARGO_REGISTRY:-}" ] && echo present || echo absent)" "$([ -n "${CAAS_ARTIFACTORY_NPM_REGISTRY:-}${NPM_CONFIG_REGISTRY:-}" ] && echo present || echo absent)"; [ -f "$NPM_ENV_FILE" ] && printf 'npm_env=%s\n' "$NPM_ENV_FILE" || true; [ -x "$LEAN_DIR/bin/lean" ] && printf 'lean_dir_bin=%s\n' "$LEAN_DIR/bin/lean" || true; [ -f "$LEAN_ENV_FILE" ] && { printf 'lean_env=%s\n' "$LEAN_ENV_FILE"; have lean || printf 'lean_path_hint=source %s\n' "$LEAN_ENV_FILE"; }; [ -x "$PY_ENV_DIR/bin/python" ] && printf 'py_env=%s\n' "$PY_ENV_DIR" || true; }

case "$MODE" in
  --help|-h|help) usage;;
  --doctor) doctor;;
  --net-probe|--network-probe|--net-check) net_probe "$@";;
  --fix-apt) fix_apt;;
  --apt) apt_install "$@";;
  --venv) venv;;
  --pip) pip_install "$@";;
  --py-smoke) py_smoke;;
  --npm-config) npm_config;;
  --verify-npm|--npm-verify) verify_npm;;
  --npm) npm_install "$@";;
  --npm-pack) npm_pack "$@";;
  --curl-config) write_curl_config "${1:-/tmp/artifactory-curl.conf}";;
  --bg) bg "$@";;
  --bg-status) bg_status "${1:-}";;
  --lean) install_lean;;
  --lean-install-fg) lean_install_fg;;
  --lean-status) lean_status;;
  --verify-lean|--lean-verify) verify_lean;;
  --cargo-config) cargo_config;;
  --rust) install_rust;;
  --verify-rust|--rust-verify) verify_rust;;
  --verify-rust-net|--rust-net) verify_rust_net;;
  --artifact-check) artifact_check "$@";;
  --text-gate) text_gate "$@";;
  --artifact-clean) artifact_clean "$@";;
  *) usage >&2; exit 2;;
esac
