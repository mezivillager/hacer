// Pure logic for the pr-preview sweep (#484): which pr-preview/pr-N folders on gh-pages no
// longer belong to an open PR. No I/O — unit tested in pr-preview-sweep.logic.test.mjs. Listing
// gh-pages, calling `gh pr list` and removing/committing live in scripts/pr-preview-sweep.mjs.

const PR_FOLDER_PATTERN = /^pr-(\d+)$/

/** The PR number a `pr-preview/` folder name encodes, or null when it isn't a `pr-<N>` folder. */
export function parsePrNumber(folderName) {
  const match = PR_FOLDER_PATTERN.exec(folderName)
  return match ? Number(match[1]) : null
}

/**
 * Folder names to remove: those whose PR number is not in `openPrNumbers`. A folder with no
 * parseable PR number is left alone — it isn't this sweep's to touch either way.
 *
 * @deprecated round 2 (#484): "not in the open list" removed a folder on an empty/short `gh pr
 * list` result — replaced by `planRemovals`, which requires positive per-folder evidence of
 * closure. Kept only until the CLI is rewired in the same commit that removes this.
 */
export function foldersToRemove(folderNames, openPrNumbers) {
  const open = new Set(openPrNumbers)
  return folderNames.filter((name) => {
    const prNumber = parsePrNumber(name)
    return prNumber !== null && !open.has(prNumber)
  })
}

// ---------------------------------------------------------------------------------------------
// Round 2 (#484): a verifier reproduced real data loss — an empty/short `gh pr list` result made
// every folder look closed. Below, TODO(#484 round 2): implement for real.

/** STUB — see TODO above. */
export function foldersNeedingLookup(_folderNames, _openPrNumbers) {
  throw new Error('not implemented')
}

/** STUB — see TODO above. */
export function planRemovals(_folderNames, _folderStates) {
  throw new Error('not implemented')
}

export const DEFAULT_MAX_REMOVALS = 40

/** STUB — see TODO above. */
export function safetyCheck(_folderNames, _toRemove, _maxRemovals = DEFAULT_MAX_REMOVALS) {
  throw new Error('not implemented')
}
