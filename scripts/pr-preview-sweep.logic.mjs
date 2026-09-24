// Pure logic for the pr-preview sweep (#484): which pr-preview/pr-N folders on gh-pages have
// positive evidence of closure and may be removed. No I/O — unit tested in
// pr-preview-sweep.logic.test.mjs. Listing gh-pages, calling `gh pr list`/`gh pr view` and
// removing/committing live in scripts/pr-preview-sweep.mjs.
//
// The rule (round 2, after a verifier reproduced real data loss on PR #491): removal needs PROOF
// a PR is closed or merged, never just "absent from the open list" — an empty or short `gh pr
// list` result must never read as "everything is closed."

const PR_FOLDER_PATTERN = /^pr-(\d+)$/
const CLOSED_STATES = new Set(['CLOSED', 'MERGED'])

/** The PR number a `pr-preview/` folder name encodes, or null when it isn't a `pr-<N>` folder. */
export function parsePrNumber(folderName) {
  const match = PR_FOLDER_PATTERN.exec(folderName)
  return match ? Number(match[1]) : null
}

/**
 * Folder names that can skip an individual `gh pr view` lookup because the `gh pr list --state
 * open` pre-filter already proves them open. Everything else needs a lookup — including every
 * folder when the pre-filter came back empty: a failed call and a genuine zero-open-PRs day look
 * identical from here, so both get the same safe treatment, a real per-folder check, rather than
 * either being trusted as "nothing is open."
 */
export function foldersNeedingLookup(folderNames, openPrNumbers) {
  const open = new Set(openPrNumbers)
  return folderNames.filter((name) => {
    const prNumber = parsePrNumber(name)
    return prNumber !== null && !open.has(prNumber)
  })
}

/**
 * Which folders to remove and which to keep, given each folder's resolved PR state (a Map of
 * folder name -> the `state` field `gh pr view` returned, or no entry when no lookup ran or it
 * produced nothing usable). Removal requires *positive evidence of closure*: state is exactly
 * 'CLOSED' or 'MERGED'. No PR number, an 'OPEN' state, and a missing/failed/unparseable lookup
 * are ALL kept — "not proven open" is never grounds for removal; only "proven closed" is. `kept`
 * carries a reason for anything worth explaining (everything but a plain open PR).
 */
export function planRemovals(folderNames, folderStates) {
  const toRemove = []
  const kept = []
  for (const name of folderNames) {
    const prNumber = parsePrNumber(name)
    if (prNumber === null) {
      kept.push({ name, reason: 'no PR number in folder name' })
      continue
    }
    const state = folderStates.get(name)
    if (CLOSED_STATES.has(state)) {
      toRemove.push(name)
    } else if (state === 'OPEN') {
      kept.push({ name, reason: null })
    } else {
      kept.push({ name, reason: `pr #${prNumber}: no positive evidence of closure (state=${state ?? 'unknown'})` })
    }
  }
  return { toRemove, kept }
}

export const DEFAULT_MAX_REMOVALS = 40

/**
 * The last gate before anything destructive happens. Refuses when the plan would wipe every
 * folder present — a near-certain sign the PR data was empty or wrong, not that every preview is
 * genuinely stale — or when it wants to remove more than `maxRemovals` folders in one run.
 */
export function safetyCheck(folderNames, toRemove, maxRemovals = DEFAULT_MAX_REMOVALS) {
  if (folderNames.length > 0 && toRemove.length === folderNames.length) {
    return { allowed: false, reason: `would remove every folder present (${toRemove.length}/${folderNames.length})` }
  }
  if (toRemove.length > maxRemovals) {
    return { allowed: false, reason: `${toRemove.length} removals exceeds --max-removals ${maxRemovals}` }
  }
  return { allowed: true, reason: null }
}
