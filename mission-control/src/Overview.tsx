import { Tile } from './Tile'
import { REPO, when, type Snapshot } from './snapshot'

/** Seven tiles, each read from one section of the snapshot and dated by that section's freshness. */
export function Overview({ snapshot }: { snapshot: Snapshot }) {
  const { tasks, prs, sessions, checks, metrics } = snapshot
  const byProject = Object.entries(tasks.byProject).map(([slug, numbers]): [string, number] => [slug, numbers.length])
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
  const merging = prs.open.filter(({ verdicts }) => verdicts[verdicts.length - 1]?.verdict === 'PASS').length
  const session = [...sessions.items].sort((a, b) => a.date.localeCompare(b.date)).pop()
  const release = metrics.releases.find((each) => each.isLatest) ?? metrics.releases[0]
  const { merged, withVerdict, pass, block } = prs.coverage
  const history = metrics.ratchet.history.map((row) => row.count).join(' → ')
  return (
    <>
      <h2>Overview</h2>
      <div className="tiles">
        <Tile snapshot={snapshot} section="tasks" title="Open tasks by project" href={`${REPO}/issues`}
          rows={[['open tasks', byProject.reduce((sum, [, count]) => sum + count, 0)], ...byProject]} />
        <Tile snapshot={snapshot} section="prs" title="Pull requests" href={`${REPO}/pulls`}
          rows={[['open', prs.open.length], ['merging (PASS)', merging]]} />
        <Tile snapshot={snapshot} section="sessions" title="Last session" href={`${REPO}/tree/main/docs/harness/sessions`}
          empty="No session records in the snapshot." rows={session ? [[`${session.date} · ${session.kind}`,
            <a href={`${REPO}/blob/main/${session.file}`}>{session.title ?? session.file}</a>]] : []} />
        <Tile snapshot={snapshot} section="checks" title="CI on main" href={`${REPO}/actions/workflows/ci.yml?query=branch%3Amain`}
          rows={[['status', checks.items.length > 0 ? `${checks.items.length} summary lines` : `not collected until ${checks.until}`]]} />
        <Tile snapshot={snapshot} section="metrics" title="Layer ratchet" href={`${REPO}/blob/main/.dependency-cruiser-known-violations.json`}
          rows={[['known violations', metrics.ratchet.count], ['history', history || null]]} />
        <Tile snapshot={snapshot} section="metrics" title="Version" href={`${REPO}/releases`} empty="No releases in the snapshot."
          rows={release ? [['latest release', <a href={`${REPO}/releases/tag/${release.tag}`}>{release.tag}</a>],
            ['published', when(release.publishedAt)]] : []} />
        <Tile snapshot={snapshot} section="prs" title="Verdict coverage" href={`${REPO}/pulls?q=is%3Apr+is%3Amerged`}
          rows={[['merged PRs', merged], ['with a verdict', `${withVerdict} (${merged ? Math.round((withVerdict / merged) * 100) : 0}%)`],
            ['latest PASS', pass], ['latest BLOCK', block]]} />
      </div>
    </>
  )
}
