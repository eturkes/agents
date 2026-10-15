---
name: vm-instructions
description: "VM policies → PromptVM controller releases + native instruction-only versions; verify historical receipts."
---

# VM instructions

Scope/invariants → [VM instruction maintenance](../../../codex/void/AGENTS.md). Host commands = Bash from `agents/`, `python3.12 -B`; guest operator = `/usr/bin/python3 -I -B`. Transient stages/baselines → outside tracked paths.

## Ownership + invariants

- Live source = `../promptvm/promptvm/deployment/`; controller changes, including policy constants → one verified PromptVM wheel. Canonical build/release/recovery procedure = `../promptvm/docs/deployed-vms.md`.
- Frozen `../eturkes.com/ops` controller/policy payloads, `/usr/local/libexec` trees + original receipts = immutable recovery assets. Historical engine path/pin = `runtime-policy.py:{ENGINE,ENGINE_SHA256}`; `runtime-policy.py stage` + generated `--guest-install`/`--guest-recover` → matching historical procedure. Live releases → PromptVM.
- Canonical edit/chat payloads = `codex/void/{vm}/AGENTS.md`, `codex/void/AGENTS.chat.md`; materialization preserves installation constants + normalized nonpolicy AST. Shared chat changes affect all three profiles.
- Preserved = source path/type/content identity outside root `AGENTS.md`; report/private/runtime/older-history/manifest/commit + VM `.codex/` auth/config bytes. Active instruction changes → native linked-child/identical-head no-op via `update-workspace.py --release SHA256`.
- Release rollback tests precede source transitions. Runtime rollback = pre-source-child phase; committed/uncertain work → forward reconciliation with its matching runtime, because native receipts bind durable ancestry.

## Target bindings

- Profiles = `nanoha`, `naoto`, `rehab`. SSH accounts/peers/known-hosts + connection options → `../promptvm/scripts/deploy-vms` (`TARGETS`, `ssh_options`); host-key fingerprints → pinned historical engine. Services/entry points → `../promptvm/scripts/guest-deploy.py`; project/state/socket/history paths → selected controller constants.
- Live root = `/usr/local/lib/promptvm/releases/{wheel-sha256}`; active pointer = `/usr/local/lib/promptvm/current`. Controller = `{release-root}/promptvm/deployment/{vm}/orchestrator.py`; packaged policy = sibling `workspace-AGENTS.md`.

## Prepare + regenerate

1. Inspect affected repositories' status + instructions; preserve unrelated edits. Resolve user paths; set `policy_vm`, `policy_source=../promptvm/promptvm/deployment/$policy_vm/orchestrator.py` + selected target bindings. Allocate `policy_stage=$(mktemp -d "${TMPDIR:-/tmp}/agents-policy.XXXXXXXX")`.
2. Verify selected SSH connection + `sudo -n true` with canonical connection options + pinned fingerprint. Capture authenticated baseline: `python3.12 -B codex/void/check-web.py --output "$policy_stage/web-before.json"`. Checker-owned credential reads stay private.
3. Record release/service bindings, active project target, saved head, version/checkpoint inventory + preserved-byte hashes. Private inputs → hashes only.
4. Edit canonical payloads; materialize each affected live controller:

   ```sh
   python3.12 -B codex/void/runtime-policy.py source "$policy_vm" \
     --controller "$policy_source" --output "$policy_stage/$policy_vm/source"
   ```

   Review the policy-only delta; copy staged `controller.py` → `"$policy_source"`, canonical policy → `../promptvm/promptvm/deployment/$policy_vm/workspace-AGENTS.md`. Rehab reads that packaged file. Repeat into a fresh replay directory; `cmp` both outputs + live source → idempotence.
5. Run the local policy gate below + PromptVM's unit, actual Linux isolation + unchanged historical compatibility gates per its release procedure. Commit cohesive policy/source units; rerun local gates from committed state.

## Release live controllers

Release commands = from `../promptvm/`, per its canonical procedure. `policy_wheel` = reviewed wheel's absolute path; `policy_release` = wheel SHA-256. `scripts/deploy-vms --wheel "$policy_wheel" --stage` stages without service changes; `--activate --test-rollback` activates, tests rollback + reactivates. Default = all profiles sequentially; `--profile "$policy_vm"` selects one. Same wheel → all targeted VMs; authenticated web/backend gates run between transitions. Snapshots + service preimages + `/var/lib/promptvm-deployments/{vm}-{wheel-sha256}/` receipts remain retained.

Verify each guest's active immutable package:

```sh
sudo -n env PYTHONPATH=/usr/local/lib/promptvm/current \
  /usr/bin/python3 -B -m promptvm.release verify
```

Require active pointer + runit entry points → `policy_release`; installed controller bytes = reviewed wheel member; packaged policy = canonical bytes. `policy_controller_sha` = approved controller SHA-256; `policy_sha` = canonical instruction SHA-256. Already-active matching release → verification only.

## Historical receipt checks

Verify the retained review's original manifest/script/preimage hashes; run its unchanged `guest-update.py --guest-check VM` through verified SSH + the isolated guest interpreter under `sudo -n`. `installed` = historical receipt verified; `ready` = historical preimage, with live deployment still owned by PromptVM. Receipt failures → matching historical recovery procedure. Historical results + live release verification remain separate.

## Instruction-only active versions

One VM at a time; others keep serving.

1. Retain per-VM rollback point + immediate pre-transition identifiers/hashes. Create root-owned mode-`0700` review directory under `/var/lib/promptvm-policy-updates/`, outside Projects; set `policy_guest_stage`. Retain mode-`0600` copies of unchanged `update-workspace.py`, canonical `AGENTS.md`, approved release/controller/policy/operator digests + baseline identifiers. Transferred bytes = host review bytes; temporary uploads stay separate.
2. Stop web; require controller `busy=false`, `stage=ready|error`; stop controller. Require both `sv status` results = `down`, service processes/job cgroups quiescent, control socket absent as file + symlink, stored state idle. Operator reacquires native locks + repeats its quiescence checks.
3. Run on guest with verified paths/digests; live invocation always supplies `--release` (omission selects the historical controller):

   ```sh
   sudo -n /usr/bin/python3 -I -B "$policy_guest_stage/update-workspace.py" "$policy_vm" \
     --release "$policy_release" \
     --instructions "$policy_guest_stage/AGENTS.md" --sha256 "$policy_sha" \
     --controller-sha256 "$policy_controller_sha" --summary 'Align workspace instruction policy'
   policy_rc=$?
   ```

   Capture rc + JSON immediately → retained `version-update.json`. Operator verifies immutable distribution + controller digest before its native transition.
4. rc `0`, `changed=true` → exactly one child of recorded head, one added checkpoint + canonical instruction digest; existing match → `changed=false`, same head. Repeat identical arguments while stopped → unchanged head/version/checkpoint inventory; retain separate no-op outcome.
5. rc `1` = uncommitted failure → inspect gate + evidence before retry. rc `3` = committed/uncertain → matching installed-controller startup reconciliation; establish durable head before retry. Retain runtime/policy, pointers, releases + transaction evidence.
6. Start controller → ready socket/state → start web → authenticated baseline comparison before advancing to another VM.

## Verification + delivery

Compare active policy to canonical bytes; verify preserved identities/hashes + immutable release/controller/packaged-policy pins against approved baselines. Run authenticated post-check:

```sh
python3.12 -B codex/void/check-web.py \
  --baseline "$policy_stage/web-before.json" --output "$policy_stage/web-after.json"
```

Require page/health/state/versions `200`, unauthenticated `401`, Nanoha/Naoto report `200` + baseline body SHA equality, Rehab embedded application health `200`. Successful validation → remove temporary uploads/stages; retain original versions, rollback points + release/policy receipts for exact replay.

Local policy gate; rerun from committed state:

```sh
set -euo pipefail
PYTHONDONTWRITEBYTECODE=1 python3.12 -B -m unittest discover -s codex/void -p 'test_*.py' -q
for policy_vm in nanoha naoto rehab; do
  policy_package="../promptvm/promptvm/deployment/$policy_vm"
  policy_extra=()
  if [ "$policy_vm" = rehab ]; then
    policy_extra=(--workspace "$policy_package/workspace-AGENTS.md")
  fi
  python3.12 -B codex/void/runtime-policy.py check-source "$policy_vm" \
    --controller "$policy_package/orchestrator.py" "${policy_extra[@]}"
  cmp "codex/void/$policy_vm/AGENTS.md" "$policy_package/workspace-AGENTS.md"
done
(
  cd ../eturkes.com || exit
  ./scripts/check
)
```
