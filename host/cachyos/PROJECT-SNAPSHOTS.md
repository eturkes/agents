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

## Caches

Snapshots cover the whole Projects tree, including environments, dependencies, model downloads and caches.
Tools can create, delete or rebuild any directory, and the hooks keep working.
Data that a tool rewrites or deletes after a snapshot stays on disk until you delete that snapshot.
Only the deletion of a complete snapshot releases its data.
`snapper status` and `snapper diff` list cache changes beside source changes.

A nested subvolume stays outside every snapshot.
`project-snapshots report` lists each nested subvolume and nested snapshot except `.snapshots`.
`project-snapshots check` fails while one exists.
The migration recipe folds nested subvolumes back into ordinary directories.

## Deploy

Install `snapper` through the system package manager.
Run these commands from the agents repository, with terminals outside Projects:

```bash
host/cachyos/project-snapshots-migrate \
  --pause-unit bsc-research-protocols.timer \
  --pause-unit bsc-research-protocols.service \
  --pause-unit bsc-research-explore.timer \
  --pause-unit bsc-research-explore.service \
  --pause-unit bsc-micro-scalping.service \
  --pause-unit bsc-scanner-watch.service \
  --pause-unit bsc-opportunity-alerts.service \
  --pause-unit bsc-research-breadth.service \
  --pause-unit paper-learning.service \
  --pause-unit paper-eth-bnb-continuation.service
host/cachyos/project-snapshots-setup
```

Migration = fold nested subvolumes with units paused → reflink stage → pause active units → final sync → SHA-256 archive equality → atomic exchange.
A fold makes a full copy, compares it with `rsync` checksums and exchanges it atomically.
It deletes the old subvolume only after a second checksum comparison finds no late writes.
A nested subvolume inside a fold target must fold first; otherwise the target stays a subvolume.
The migration folds every idle subvolume, lists each skipped one and then exits with an error.
An interrupted fold leaves a path with a `.snapshot-fold` suffix beside the cache.
An ordinary directory there is an incomplete copy; delete it before the next run.
A subvolume there is the original. Compare it with the folded path, then delete it with `bcachefs subvolume delete`.
Before the final equality check, the migration clears NoCoW settings on both compared trees.
This correction preserves other file options and attributes.
The full copy ends extent sharing with files outside Projects, such as the uv cache.
Disk use can grow by up to the folded size.
A native Projects subvolume needs only the folds; its other paths can stay in use.
Open file, working-directory or mapped-file references stop activation.
Only previously active units restart. The verified duplicate retires after the exchange.
Migration evidence = `~/.local/state/project-snapshots/migration/verified.json`.
An interrupted preparation keeps the original Projects tree active and retains its stage for inspection.

Setup installs the manual-retention Snapper config and merges Claude hooks while preserving other settings.
Tracked Claude profiles carry the same hooks; the native Claude launcher and Headroom remain unchanged.

## Correct legacy NoCoW settings

Older cache migrations can leave NoCoW settings on ordinary directories and inherited settings on files.
From the agents repository, run:

```bash
host/cachyos/project-snapshots-migrate --clear-nocow
bcachefs reconcile status /
host/cachyos/project-snapshots check
```

The correction visits the live Projects tree, parent first.
It skips `.snapshots`, symlinks and other filesystems.
It clears only NoCoW settings; files, other attributes and snapshot retention remain unchanged.
New files inherit CoW policy from their corrected parents.
Changing settings does not prove that existing extents have checksums.

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
