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
  throw new Error(`not implemented: ${fileName}`)
}

/**
 * Which archived snapshots to remove and which to keep, given every file name currently in `control/history/`.
 * `now` and `keepDays` are injectable for tests; production calls with neither.
 * @returns {{toRemove: string[], kept: string[]}}
 */
export function planPrune(fileNames, { now = new Date(), keepDays = KEEP_DAYS } = {}) {
  throw new Error(`not implemented: ${fileNames.length} files, keepDays=${keepDays}, now=${now.toISOString()}`)
}
