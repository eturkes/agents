# Project snapshots

- Scope = `~/Projects` + its ordinary descendants; storage = `~/Projects/.snapshots`.
- Claude `SessionStart` → read-only pre snapshot; `SessionEnd` → its paired post snapshot. Pair = the whole Projects subvolume, concurrent changes from other processes included. Launches outside Projects + compaction events → none; an interrupted session can leave an unpaired pre.
- Retention = manual; timeline, number + empty-pair cleanup = off.

## Inspect + remove

```bash
project-snapshots report
snapper -c projects list
snapper -c projects status PRE..POST
snapper -c projects diff PRE..POST
snapper -c projects delete ID
project-snapshots clear-errors
```

- `PRE`/`POST`/`ID` = snapshot numbers from the list; browse `~/Projects/.snapshots/ID/snapshot/` before restoring.
- Storage shares the live filesystem ⇒ file history, no protection against device failure.
- Report = snapshot-attributed data apart from shared history + current data; bcachefs counters = data attribution, not exact deletion savings or complete physical storage. `upgrade` + `upgrade --check` show the same report, deleting nothing.
- Hook errors stay in the report until reviewed; `clear-errors` moves them to `errors-cleared.jsonl` beside the log.

## Caches

- Snapshots cover the whole tree — environments, dependencies, model downloads + caches; tools create, delete or rebuild any directory with the hooks unaffected.
- Data a tool rewrites or deletes after a snapshot stays on disk until that snapshot goes; only deleting a complete snapshot releases its data. `snapper status` + `diff` list cache changes beside source changes.
- A nested subvolume stays outside every snapshot: `project-snapshots report` lists each nested subvolume + nested snapshot except `.snapshots`; `project-snapshots check` fails while one exists; the migration recipe folds nested subvolumes back into ordinary directories.

## Deploy

`snapper` via the system package manager; then, from the agents repo with terminals outside Projects:

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

- Migration = fold nested subvolumes with units paused → reflink stage → pause active units → final sync → SHA-256 archive equality → atomic exchange.
- Fold = full copy + `rsync` checksum comparison + atomic exchange; the old subvolume goes only after a second checksum comparison finds no late writes. A nested subvolume inside a fold target folds first, else the target stays a subvolume. Every idle subvolume folds; each skipped one is listed, then the migration exits with an error.
- Interrupted fold → a `.snapshot-fold`-suffixed path beside the cache: ordinary directory = an incomplete copy → delete it before the next run; subvolume = the original → compare it with the folded path, then `bcachefs subvolume delete`.
- Before the final equality check, NoCoW settings clear on both compared trees; other file options + attributes stay.
- The full copy ends extent sharing with files outside Projects (e.g. the uv cache) ⇒ disk use can grow by up to the folded size.
- Native Projects subvolume → the folds alone; its other paths can stay in use. Open file, working-directory or mapped-file references block activation. Only previously active units restart; the verified duplicate retires after the exchange. Evidence = `~/.local/state/project-snapshots/migration/verified.json`. Interrupted preparation → the original tree stays active + its stage stays for inspection.
- Setup installs the manual-retention Snapper config + merges Claude hooks, other settings preserved; tracked Claude profiles carry the same hooks; the native Claude launcher stays unchanged.

## Legacy NoCoW correction

Target = NoCoW on ordinary directories + NoCoW that files inherited. From the agents repo:

```bash
host/cachyos/project-snapshots-migrate --clear-nocow
bcachefs reconcile status /
host/cachyos/project-snapshots check
```

- Walks the live Projects tree parent first; skips `.snapshots`, symlinks + other filesystems.
- Clears NoCoW settings alone: files, other attributes + snapshot retention unchanged; new files inherit CoW from their corrected parents.
- Changed settings prove nothing about checksums on existing extents.

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

Migration checks = disposable native subvolumes; hook regressions = isolated command dependencies; the live check removes only its temp files + its tagged snapshot pair.

References: [bcachefs snapshot boundaries](https://bcachefs.org/Snapshots/),
[Claude session hooks](https://code.claude.com/docs/en/hooks),
[Snapper bcachefs backend](https://github.com/openSUSE/snapper/blob/master/snapper/Bcachefs.cc).
