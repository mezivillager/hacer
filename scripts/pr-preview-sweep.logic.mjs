// Pure logic for the pr-preview sweep (#484): which pr-preview/pr-N folders on gh-pages no
// longer belong to an open PR. No I/O — unit tested in pr-preview-sweep.logic.test.mjs. Listing
// gh-pages, calling `gh pr list` and removing/committing live in scripts/pr-preview-sweep.mjs.

export function parsePrNumber(_folderName) {
  throw new Error('not implemented')
}

export function foldersToRemove(_folderNames, _openPrNumbers) {
  throw new Error('not implemented')
}
