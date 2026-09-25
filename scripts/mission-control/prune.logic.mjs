// Pure logic for pruning Mission Control's snapshot archive (#476, MC-5): which files under gh-pages'
// control/history/ are old enough to remove, keeping the last KEEP_DAYS days. No I/O — unit tested in
// prune.logic.test.mjs. Listing the directory and deleting files live in scripts/mission-control/prune.mjs.
//
// Two invariants, both enforced here so a caller cannot get them wrong: the newest snapshot is never removed,
// even when every snapshot on disk is older than the window (a long-idle workflow must not empty the archive);
// and a name that is not exactly a `<toISOString()>.json` archive file is never a removal candidate — it is
// always kept, whatever it is — so the prune step can never reach outside what it recognizes as history/'s own.

export const KEEP_DAYS = 90

const SNAPSHOT_FILE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\.json$/

/** The ISO instant a `control/history/` file name encodes, or null when the name is not exactly one snapshot's
 *  `<Date#toISOString()>.json` — including anything with a path separator, which this pattern cannot match. */
export function parseSnapshotTime(fileName) {
  return SNAPSHOT_FILE.exec(fileName)?.[1] ?? null
}

/**
 * Which archived snapshots to remove and which to keep, given every file name currently in `control/history/`.
 * `now` and `keepDays` are injectable for tests; production calls with neither. Both arrays are chronological,
 * oldest first. A file whose name is not a recognised snapshot is always in `kept`, never a removal candidate;
 * among recognised snapshots, the newest is always kept too, however old it is — the window only ever thins the
 * ones behind it.
 * @returns {{toRemove: string[], kept: string[]}}
 */
export function planPrune(fileNames, { now = new Date(), keepDays = KEEP_DAYS } = {}) {
  const other = fileNames.filter((name) => parseSnapshotTime(name) === null)
  const snapshots = fileNames.map((name) => ({ name, at: parseSnapshotTime(name) })).filter(({ at }) => at !== null)
    .sort((a, b) => a.at.localeCompare(b.at))
  const cutoff = now.getTime() - keepDays * 24 * 60 * 60 * 1000
  const newest = snapshots.at(-1)?.name
  const toRemove = snapshots.filter(({ name, at }) => name !== newest && new Date(at).getTime() < cutoff).map(({ name }) => name)
  const kept = [...snapshots.filter(({ name }) => !toRemove.includes(name)).map(({ name }) => name), ...other]
  return { toRemove, kept }
}
