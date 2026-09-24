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
 */
export function foldersToRemove(folderNames, openPrNumbers) {
  const open = new Set(openPrNumbers)
  return folderNames.filter((name) => {
    const prNumber = parsePrNumber(name)
    return prNumber !== null && !open.has(prNumber)
  })
}
