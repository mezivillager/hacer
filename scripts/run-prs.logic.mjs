// A run's merge count, derived from PR metadata rather than hand-counted (#538). The first
// process-review brief gave the 2026-09-23 run 13 merges; its own record and GitHub show 17
// distinct PRs, or 15 without the two record PRs (docs/harness/reviews/2026-09-26/SYNTHESIS.md S9).
//
// No I/O — `gh` and printing live in run-prs.mjs. GitHub's `merged:<from>..<to>` search qualifier
// is day granularity, so it can only narrow the candidate set; this module does the precise
// `mergedAt` filtering.
//
// Stub for the red commit — not implemented yet.

export function searchDateRange(fromIso, toIso) {
  throw new Error('not implemented')
}

export function mergedInWindow(prs, fromIso, toIso) {
  throw new Error('not implemented')
}

export function formatConsole(prs) {
  throw new Error('not implemented')
}
