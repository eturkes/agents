---
name: vm-instructions
description: "Regenerate VM policies, install pinned controller deltas, and create instruction-only active versions."
---

# VM instructions

Apply [scope/invariants](../../../codex/void/AGENTS.md). Run host recipes in Bash from the `agents/` root; keep transient baselines/stages outside tracked paths.

## Targets

| VM | SSH peer | Host known-hosts file | Prefix | Active project |
|---|---|---|---|---|
| nanoha | `nanoha@172.31.102.2` | `~/.ssh/known_hosts` | `apex` | `/home/nanoha/Projects/apex_ps` |
| naoto | `naoto@172.31.101.2` | `~/.ssh/known_hosts_naoto` | `tau` | `/home/naoto/Projects/tau-mutant-integration-ng` |
| rehab | `rehab@172.31.103.2` | `~/.ssh/known_hosts_rehab` | `rehab` | `/home/rehab/Projects/rehab` |

- Installed controller = `/usr/local/libexec/{prefix}-dashboard/{prefix}_dashboard/orchestrator.py`; local source = `../eturkes.com/ops/{vm}/{prefix}_dashboard/orchestrator.py`.
- State/socket = `/var/lib/{prefix}-dashboard/store.json`, `/run/{prefix}-dashboard/control.sock`; history = `/home/{vm}/Projects/.{prefix}-history`.
- Services = `/var/service/{prefix}-dashboard-{web,orchestrator}`; Rehab = `/var/service/rehab-{web,orchestrator}`.
- Rehab installed workspace policy = `/usr/local/libexec/rehab-dashboard/workspace-AGENTS.md`.
- Engine = `../eturkes.com/ops/prompt-history-agent-update.py`; exact digest owned by `runtime-policy.py:ENGINE_SHA256`.

## Prepare + regenerate

1. Inspect both repositories' status + applicable instructions. Resolve user paths; set `policy_vm`, `policy_source` + target variables from the table. Allocate `policy_stage=$(mktemp -d "${TMPDIR:-/tmp}/agents-policy.XXXXXXXX")`. Discover host `python3.12` and guest `python3`; guest operator/interpreter = `/usr/bin/python3 -I -B`.
2. Verify the selected SSH connection + `sudo -n true`. Use `ssh -F none -T`, port `22`, `BatchMode=yes`, `GlobalKnownHostsFile=/dev/null`, the resolved `UserKnownHostsFile`, `StrictHostKeyChecking=yes`, `HostKeyAlgorithms=ssh-ed25519`, `UpdateHostKeys=no`, `ConnectTimeout=5`. Match the engine's pinned host-key fingerprint.
3. Capture authenticated baseline: `python3.12 -B codex/void/check-web.py --output "$policy_stage/web-before.json"`. Credentials stay in `~/.local/share/eturkes/web-credentials.txt`; the checker consumes them privately.
4. Read the installed controller through verified SSH into `$policy_stage/before.py`; compare local/remote SHA-256 and set `policy_before_sha`. For Rehab, capture `$policy_stage/workspace-before.md` + `policy_workspace_before_sha` likewise. Record current project target, saved head, version/checkpoint inventory + old manifest/commit hashes; inspect private inputs through hashes only.
5. Edit canonical payloads. For each VM, materialize local source into a fresh staging directory:

   ```sh
   python3.12 -B codex/void/runtime-policy.py source "$policy_vm" \
     --controller "$policy_source" --output "$policy_stage/source"
   ```

   Review the policy-only delta; copy `controller.py` into its local ops source. Copy `codex/void/$policy_vm/AGENTS.md` to `../eturkes.com/ops/$policy_vm/project-AGENTS.md`. Repeat materialization; `cmp` the controller output to prove idempotence. Keep Naoto's installation placeholders literal; preserve the agent's Git boundary + controller-owned saved versions when aligning wording.

   Refresh Nanoha's `EXPECTED_APP_POLICY_TREE_SHA256` from the existing digest implementation:

   ```sh
   python3.12 -I -B - <<'PY'
   from pathlib import Path
   import subprocess
   import sys
   root = Path('../eturkes.com/ops/nanoha')
   source = (root / 'provision-guest.sh').read_text()
   body = source.split('app_policy_digest()\n', 1)[1].split("<<'PY'\n", 1)[1].split('\nPY\n', 1)[0]
   names = ('apex_dashboard', 'project-AGENTS.md', 'codex-config.toml',
            'enable-render-firewall.sh', 'freeze-render-library.sh', 'lock-codex-home.sh')
   subprocess.run([sys.executable, '-I', '-B', '-', *(str(root / name) for name in names)],
                  input=body.encode(), check=True)
   PY
   ```

   Replace only that expected pin. Set the active-policy SHA in `../eturkes.com/ops/rehab/README.md` to `sha256sum codex/void/rehab/AGENTS.md`; preserve older receipts.
6. Run the local gate below. Materialize the guest transaction from the verified **installed** baseline, independent of local template placeholders:

   ```sh
   python3.12 -B codex/void/runtime-policy.py stage "$policy_vm" \
     --controller "$policy_stage/before.py" --before-sha256 "$policy_before_sha" \
     --output "$policy_stage/runtime"
   ```

   Rehab adds `--workspace "$policy_stage/workspace-before.md" --workspace-before-sha256 "$policy_workspace_before_sha"`. Review `manifest.json` + candidate payloads; rerun with identical inputs and compare outputs byte-for-byte. An already-canonical runtime needs no new transaction; reuse its matching retained review directory + verified installed digest.

## Install runtime + active policy

Stage one VM at a time; keep the others serving. Feed `runtime/guest-update.py` unchanged through verified SSH to `/usr/bin/python3 -I -B - MODE VM` under `sudo -n`.

1. Retain `/var/lib/agent-policy-reviews/{transaction_id}/` as a root-owned mode-`0700` receipt directory, outside Projects. Store root-owned mode-`0600` files: `baseline-controller.py`, Rehab `baseline-workspace-AGENTS.md`, `guest-update.py`, `manifest.json`, `update-workspace.py`, canonical `AGENTS.md`, then `version-update.json`. Verify transferred SHA-256 + the installed baseline digest before replacement. Set `policy_guest_stage` to this directory, `policy_sha` to the canonical policy digest, `policy_controller_sha` to the candidate digest. Temporary uploads stay separate.
2. Run `--guest-check VM`; require `ready` or `installed`. For `ready`, run `--guest-install VM`; then require `--guest-check VM` = `installed` + the installed candidate digest. The engine owns locking, rollback + service/health gates. Resolve runtime transaction failures with the same generated script's `--guest-recover VM` **before** starting the workspace transition.
3. Stop web first; require controller state `busy=false`, `stage=ready|error`. Stop controller next. Require both `sv status` results to be `down`, the control socket absent as file **and** symlink, and the stored state idle. The operator reacquires both native locks and repeats these checks.
4. Run on the guest with the verified paths/digests:

   ```sh
   sudo -n /usr/bin/python3 -I -B "$policy_guest_stage/update-workspace.py" "$policy_vm" \
     --instructions "$policy_guest_stage/AGENTS.md" --sha256 "$policy_sha" \
     --controller-sha256 "$policy_controller_sha" --summary 'Align workspace instruction policy'
   policy_rc=$?
   ```

   Capture rc + JSON immediately; save the outcome in `version-update.json`. Exit `0`: require `changed=true`, one child of the recorded head, one added checkpoint, canonical instruction digest; an existing match returns `changed=false` with the same head. Repeat the operator while stopped; require that identical-head no-op and retain its outcome separately.
5. Exit `1` means an uncommitted failure: inspect the reported gate + retained evidence before retrying. Exit `3` means **committed/uncertain**: retain current runtime/policy, pointers, releases + transaction evidence; recover forward through installed-controller startup reconciliation. Establish the durable head before retrying. Runtime rollback belongs only to the pre-workspace phase.
6. Start controller first; require a ready controller socket/state, then start web. Preserve any recovery evidence until this phase + final checks succeed.

## Verification + delivery

The workspace operator requires saved-head source/report/private bindings, path/type/content equality outside root `AGENTS.md`, unchanged report/private/runtime hashes, unchanged old manifest/commit bytes, and exactly one linked child/checkpoint. Retain its JSON outcome + baseline identifiers. Confirm the active policy with `cmp` against canonical bytes; require the repeated operator's unchanged head/version/checkpoint inventory. Saved history remains the original evidence, including its older instruction text.

Run authenticated post-checks:

```sh
python3.12 -B codex/void/check-web.py \
  --baseline "$policy_stage/web-before.json" --output "$policy_stage/web-after.json"
```

Require HTTPS page/health/state/versions `200`, unauthenticated `401`, Nanoha/Naoto report `200` + baseline body SHA equality, and Rehab embedded application health `200`. Require final installed controller/workspace SHA pins; a staged runtime transaction also requires guest `--guest-check VM` = `installed`. Keep `.codex/` auth/config contents unchanged. Remove temporary uploads/stages after successful validation; retain the content-addressed review directory for exact replay. The engine removes its own transient backup/journal after successful installation.

Local gate; rerun after commit from committed state:

```sh
set -euo pipefail
PYTHONDONTWRITEBYTECODE=1 python3.12 -B -m unittest discover -s codex/void -p 'test_*.py' -q
for policy_pair in nanoha:apex naoto:tau rehab:rehab; do
  policy_vm=${policy_pair%:*}
  policy_prefix=${policy_pair#*:}
  policy_extra=()
  if [ "$policy_vm" = rehab ]; then
    policy_extra=(--workspace ../eturkes.com/ops/rehab/project-AGENTS.md)
  fi
  python3.12 -B codex/void/runtime-policy.py check-source "$policy_vm" \
    --controller "../eturkes.com/ops/$policy_vm/${policy_prefix}_dashboard/orchestrator.py" \
    "${policy_extra[@]}"
  cmp "codex/void/$policy_vm/AGENTS.md" "../eturkes.com/ops/$policy_vm/project-AGENTS.md"
done
(
  cd ../eturkes.com
  ./scripts/check
)
```
