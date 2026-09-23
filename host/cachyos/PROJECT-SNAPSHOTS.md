# Project snapshots

Scope = `~/Projects` and its ordinary descendants. Storage = `~/Projects/.snapshots`.
Claude `SessionStart` creates a read-only pre snapshot; `SessionEnd` creates its paired post snapshot.
Each pair covers the whole Projects subvolume, including concurrent changes from other processes.
Launches outside Projects and compaction events create no snapshots.
Interrupted sessions can leave an unpaired pre snapshot.

Retention = manual. Timeline, number and empty-pair cleanup remain disabled.

## Inspect and remove

```bash
project-snapshots report
snapper -c projects list
snapper -c projects status PRE..POST
snapper -c projects diff PRE..POST
snapper -c projects delete ID
```

Replace `PRE`, `POST` and `ID` with snapshot numbers from the list.
Browse files under `~/Projects/.snapshots/ID/snapshot/` before restoring them.
Snapshot storage shares the live filesystem; it provides file history, not protection against device failure.

The report separates snapshot-attributed data from shared history and current data.
These bcachefs counters describe data attribution, not exact deletion savings or complete physical storage.
`upgrade` and `upgrade --check` show the same report without deleting snapshots.

## Cache boundaries

[project-snapshots-excludes](project-snapshots-excludes) lists rebuildable environments, dependencies, model downloads and caches.
Each existing path becomes a separate NoCoW subvolume.
Native snapshots omit these subvolumes; files remain available at their original live paths.
NoCoW disables data checksums, compression and encryption for those paths.
Project sources, uncommitted work, `.scratch`, private configuration and application databases retain snapshot coverage.
Home directories outside Projects remain unchanged.

The hook checks each configured boundary before capture.
When a tool recreates a cache as an ordinary directory, rerun the migration recipe after its users stop.
Update the exclusion list and rerun setup to add another approved cache boundary.

## Deploy

Install `snapper` through the system package manager.
Run these commands from the agents repository, with terminals outside Projects:

```bash
host/cachyos/project-snapshots-migrate \
  --pause-unit bsc-research-protocols.timer \
  --pause-unit bsc-research-protocols.service \
  --pause-unit bsc-scanner-watch.service \
  --pause-unit bsc-opportunity-alerts.service \
  --pause-unit bsc-research-breadth.service \
  --pause-unit paper-learning.service \
  --pause-unit paper-eth-bnb-continuation.service
host/cachyos/project-snapshots-setup
```

Migration = reflink stage → pause active units → final sync → cache boundaries → SHA-256 archive equality → atomic exchange.
Open file, working-directory or mapped-file references stop activation.
Only previously active units restart. The verified duplicate retires after the exchange.
Cross-boundary cache hardlinks become separate inodes; file contents remain identical.
Migration evidence = `~/.local/state/project-snapshots/migration/verified.json`.
An interrupted preparation keeps the original Projects tree active and retains its stage for inspection.

Setup installs the manual-retention Snapper config and merges Claude hooks while preserving other settings.
Tracked Claude profiles carry the same hooks; the native Claude launcher and Headroom remain unchanged.

## Checks

```bash
python -B host/cachyos/check-project-snapshots-migrate -q
python -B host/cachyos/check-project-snapshots -q
host/cachyos/project-snapshots check
python -B host/cachyos/check-project-snapshots-live
bash -n host/cachyos/project-snapshots-setup
shellcheck host/cachyos/project-snapshots-setup
ruff check host/cachyos/project-snapshots{,-migrate} host/cachyos/check-project-snapshots{,-migrate}
```

Migration checks use disposable native subvolumes. Hook regressions use isolated command dependencies.
The live check removes only its temporary files and tagged snapshot pair.

References: [bcachefs snapshot boundaries](https://bcachefs.org/Snapshots/),
[Claude session hooks](https://code.claude.com/docs/en/hooks),
[Snapper bcachefs backend](https://github.com/openSUSE/snapper/blob/master/snapper/Bcachefs.cc).
