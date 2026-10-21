# T70 maintenance

- Current authority = `/etc/rc.conf`, `/etc/jail.conf.d/`,
  `/zroot/vm/<name>/<name>.conf` + ZFS properties. Dated reports = evidence;
  read their final status before chronological notes.

## Current placement and resources

Guests = 2 shared vCPUs each. Sizes = GiB except EFI; OS includes swap.

| Guest | RAM | OS | Data | EFI | Swap |
| --- | ---: | ---: | ---: | ---: | ---: |
| `void-naoto` | 32 | 56 | 128 | 256 MiB | 4 |
| `void-nanoha` | 4 | 24 | 16 | 256 MiB | 2 |
| `void-rehab` | 4 | 24 | 96 | 256 MiB | 2 |
| `veriformatics` (Debian 13) | 2 | 16 | 16 | 124 MiB vendor layout | 2, file |

- RAM budget (GiB) = 63.82 usable = 42 guests + 8 ARC cap + 6 estimated host +
  3 estimated jails/worker + 4.82 spare. Host/jail allowances are not enforced caps.
- Active Void zvols = `root-rightsized-20261020` + `projects-rightsized-20261020`;
  Veriformatics = `root` + `data`. All active disks = fully reserved.
  Active data volumes own their historical snapshots after promotion.
  Retired data volumes, Nanoha's old root + inspection clones = removed.
  Naoto/Rehab old roots = read-only forensic containers; preserve their evidence
  snapshots, holds + configuration preimages.
- Placement checks → `doas vm list`, `doas jls -n`, `sysctl vfs.zfs.arc.max`;
  exact disk/network bindings → selected live config + ZFS properties.

| Workload | Placement + operation |
| --- | --- |
| Static eturkes.com/wedding + private VM proxies | Caddy VNET jail `web-ingress`; [ingress/publication runbook](../../../eturkes.com/README.md) |
| Naoto/Nanoha/Rehab | Private VM shells `:8080`; Rehab application origin `:8081`; [shared PromptVM release procedure](../../../promptvm/docs/deployed-vms.md) |
| Wedding editor | Shared-stack `wedding-editor` jail, `172.31.100.1:8090`; unchanged state/public paths; [controller/runtime/rollback](../../../sushi-and-kebab.wedding/ops/jail/README.md) |
| Veriformatics | Private Debian VM `172.31.104.2`; Caddy/listmonk loopback, outbound cloudflared, rootless PostgreSQL/data at `/srv/veriformatics` |

Wedding boot order = `web-ingress wedding-editor`; retained host controller =
disabled. Jail shutdown order = reversed; ingress grace period = 30 seconds.
Run one controller against the shared state. Restricted worker/snapshot
helpers remain on the host through forced-command SSH.

## Project ownership and recovery

- Live VM runtime = PromptVM shared wheel; eturkes.com controller trees = frozen
  provisioning/receipt/recovery assets. Deployed 0.2.16 reapply →
  `~/pro/promptvm/dist/t70-verified-20261021/promptvm-0.2.16-py3-none-any.whl`
  + adjacent `release-receipt.json`. This artifact excludes pending
  configuration-pin edits retained in the checkout. Exact Bubblewrap pins support
  the signed package transition; native ownership/mode gates remain enforced.
  Native Rehab memory cap →
  [0.2.15 record](../../../promptvm/docs/rehab-job-memory-2026-10-20.md).
- Evidence root = `~/.local/state/t70-deployment-20261020/`; index =
  `FINAL-RESULTS.md`; disk recovery = `rightsize/ROLLBACK.md`; migration receipts
  = `rightsize/PROGRESS.md`; retired copies = `cleanup-20261021/` manifests.
  Recovery → preserve current writes, restore into separate verified volumes,
  retain current resource limits. Original-disk selector rollback is retired.
- Wedding recovery = targeted retained-host-service rollback against unchanged
  state; preserve the shared host-root dataset.
- Veriformatics admin/backups/rollback/log handling → `veriformatics-applied.md`
  under the evidence root. T25 newsletter/origin/tunnel = stopped + disabled;
  source/data/credentials/backups = retained. Admin = loopback SSH forwarding
  to guest `:9000`, existing credentials + pinned host key. Target writes exist:
  freeze/back up + reconcile into the stopped source before recovery; keep one
  tunnel connector active. listmonk diagnostics can expose the SMTP API key:
  use status/provider checks + the receipt's in-memory redaction procedure.

## Maintenance boundaries

- Latest package/boot handoff → `~/.local/state/t70-upgrade-20261021/RESULTS.md`.
  Post-reboot service/integrity verification → adjacent `post-reboot/RESULTS.md`;
  current service state → live checks.
- PromptVM 0.2.16 reapply uses its verified artifact without `--test-rollback`;
  recorded 0.2.15 preimages require the old Bubblewrap package first.
- Preserve accounts/keys/browser credentials; host SSH = TCP 9993 + public keys;
  retain existing public ingress + private VM boundaries.
- Package work → `zpool status -v` + relevant `/var/log/{daily,weekly,monthly}.log`,
  signed indexes/audits + exact transaction/reverse-dependency review. Stage one
  host/guest at a time with task-scoped rollback points; verify SSH + affected
  ingress/backend health between stages. Local snapshots share the pool.
- Home snapshots = `/usr/local/sbin/home-snapshot` via `/etc/cron.d/home-snapshot`,
  hourly/daily. Selected-file recovery → `~/.zfs/snapshot/`; personal `~/doc/`
  requires explicit user inclusion.
- Corruption/panic cause = unresolved; service recovery = complete. Before repair
  → `/var/log/corruption-events.md`; preserve evidence + append symptoms,
  actions/results, separating observations/hypotheses + recovery/cause resolution.
  Host panic evidence =
  `/var/backups/t70-deployment-20261020/host-panic-20261021T000843JST/`;
  guest shutdown evidence + held crash/clean-stop snapshots → rightsize records.
  Original guest journals replayed during host autostart after the crash snapshots.
  Caddy executable corruption + same-version recovery evidence →
  `/var/backups/t70-deployment-20261020/caddy-recovery-20261021/`.
