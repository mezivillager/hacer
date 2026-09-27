// A run's merge count, derived from PR metadata rather than hand-counted (#538). The first
// process-review brief gave the 2026-09-23 run 13 merges; its own record and GitHub show 17
// distinct PRs, or 15 without the two record PRs (docs/harness/reviews/2026-09-26/SYNTHESIS.md S9).
//
// No I/O — `gh` and printing live in run-prs.mjs. GitHub's `merged:<from>..<to>` search qualifier
// is day granularity, so it can only narrow the candidate set; this module does the precise
// `mergedAt` filtering.

/** The gh search's day-granularity `merged:` range covering every day `fromIso`..`toIso` touches. */
export function searchDateRange(fromIso, toIso) {
  const day = (iso) => iso.slice(0, 10)
  return `${day(fromIso)}..${day(toIso)}`
}

const labelName = (label) => (typeof label === 'string' ? label : label.name)

/**
 * PRs from `prs` (gh's `{number,title,mergedAt,labels}` shape) whose `mergedAt` falls in
 * `[fromIso, toIso)`, oldest first. `labels` is normalised to plain names.
 */
export function mergedInWindow(prs, fromIso, toIso) {
  const from = Date.parse(fromIso)
  const to = Date.parse(toIso)
  return prs
    .filter((pr) => {
      const at = Date.parse(pr.mergedAt)
      return at >= from && at < to
    })
    .map((pr) => ({
      number: pr.number,
      title: pr.title,
      mergedAt: pr.mergedAt,
      labels: (pr.labels ?? []).map(labelName),
    }))
    .sort((a, b) => (a.mergedAt < b.mergedAt ? -1 : a.mergedAt > b.mergedAt ? 1 : a.number - b.number))
}

/** `#n\t<mergedAt>\t<title>\t[label, …]`, oldest first, plus a trailing count line. */
export function formatConsole(prs) {
  const lines = prs.map(
    (pr) => `#${pr.number}\t${pr.mergedAt}\t${pr.title}${pr.labels.length > 0 ? `\t[${pr.labels.join(', ')}]` : ''}`,
  )
  lines.push(`${prs.length} PR${prs.length === 1 ? '' : 's'} merged`)
  return lines.join('\n')
}
