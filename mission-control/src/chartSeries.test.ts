import { describe, expect, it } from 'vitest'
import fixture from '../../scripts/fixtures/mission-control/snapshot-2026-09-29.json'
import { OTHER, coverageChart, mergesChart, openTasksChart, ratchetChart } from './chartSeries'
import type { Snapshot } from './snapshot'

// The newest archived snapshot on 2026-09-29 (08:21Z), whole, with metrics.openTasks spliced in from the archive before
// it — see scripts/mission-control/collect.logic.test.mjs. snapshot.json predates the archive, so it cannot show a series.
const snapshot = fixture as unknown as Snapshot // its conformance rows infer per-row shapes, not Record<string, number>
const GITHUB = 'https://github.com/mezivillager/hacer'
const MC7 = 'Mission Control MC-7: charts — ratchet history, merges per day, open tasks by project, verdict coverage'

describe('chart series', () => {
  it('ratchet history from git: 34 → 77 → 72 → 71 today', () => {
    const { series, points } = ratchetChart(snapshot)
    expect(series).toEqual([{ key: 'count', label: 'known violations' }])
    const counts = points.map((point) => point.values?.count)
    expect(counts.slice(0, 4)).toEqual([34, 77, 72, 71]) // later points follow as the baseline changes
    expect(counts[counts.length - 1]).toBe(snapshot.metrics.ratchet.count) // the last is today's count

    // A point per commit that changed the baseline, at its UTC time; it opens into the commit and the PR it names.
    expect(points.map((point) => point.label)).toEqual(['2026-09-23 00:15', '2026-09-23 04:13', '2026-09-23 05:10', '2026-09-24 13:41'])
    expect(points[3].items).toEqual([
      { href: `${GITHUB}/commit/d9ce783867491b811fceaf225e3dad54479483da`, text: 'd9ce783 fix(simulation): move multiBitFormat below the UI layer (#180)' },
      { href: `${GITHUB}/pull/180`, text: 'PR #180' },
    ])
    expect(points[0].items).toHaveLength(1) // a subject naming no PR opens into its commit alone
  })

  it('merges per day from PR mergedAt', () => {
    const { series, points } = mergesChart(snapshot)
    expect(series).toEqual([{ key: 'merged', label: 'merged' }])
    // Every UTC day from the oldest merge in prs.merged to the snapshot's own: the collector's per-day count agrees.
    expect(points.map(({ label, values }) => ({ date: label, merges: values?.merged }))).toEqual(snapshot.metrics.mergesPerDay)
    expect(points.flatMap((point) => point.items)).toHaveLength(snapshot.prs.merged.length)
    expect(points[points.length - 1].items).toEqual([
      { href: `${GITHUB}/pull/582`, text: '#582 docs(skills): suggest ultracode for investigations, audits and large reviews' },
    ])

    // A day inside the span with no merge is a counted zero, not a gap.
    const merged = snapshot.prs.merged.filter((pr) => !pr.mergedAt?.startsWith('2026-09-26'))
    expect(mergesChart({ ...snapshot, prs: { ...snapshot.prs, merged } }).points.map((point) => point.values?.merged))
      .toEqual([13, 12, 0, 26, 5, 1])
  })

  it('open tasks by project over time from the history archive', () => {
    const { series, points } = openTasksChart(snapshot)
    // The first five portfolio rows, in its order, so a project keeps its colour; the rest, unfiled too, are other.
    expect(series.map((each) => each.key)).toEqual(['foundation', 'harness', 'surfaces', 'pubdocs', 'core', OTHER])
    // Each day's last reading: the archive's, and for the snapshot's own day, the snapshot's.
    expect(points.map(({ label, values }) => [label, ...series.map((each) => values?.[each.key])])).toEqual([
      ['2026-09-25', 38, 31, 4, 7, 9, 49],
      ['2026-09-26', 38, 31, 4, 7, 9, 49],
      ['2026-09-27', 37, 30, 4, 7, 9, 51],
      ['2026-09-28', 37, 30, 4, 7, 9, 53],
      ['2026-09-29', 37, 30, 4, 7, 9, 53],
    ])

    // A day opens into its tasks, titled where this snapshot still lists them open; #193 left them after 2026-09-26.
    expect(points[4].items).toHaveLength(140)
    expect(points[4].items).toContainEqual({ href: `${GITHUB}/issues/478`, text: `mission-control · #478 ${MC7}` })
    expect(points[0].items).toContainEqual({ href: `${GITHUB}/issues/193`, text: 'foundation · #193' })

    // The snapshot's reading, newer than the archive's 01:49, is its day's.
    const own = openTasksChart({ ...snapshot, tasks: { ...snapshot.tasks, byProject: { harness: [1, 2], unfiled: [3] } } })
    expect(own.points[own.points.length - 1].values).toEqual({ foundation: 0, harness: 2, surfaces: 0, pubdocs: 0, core: 0, [OTHER]: 1 })

    // A day with no reading is a gap, never a zero it did not count.
    const openTasks = snapshot.metrics.openTasks?.filter((reading) => reading.date !== '2026-09-27') ?? null
    const gap = openTasksChart({ ...snapshot, metrics: { ...snapshot.metrics, openTasks } })
    expect(gap.points.map((point) => [point.label, point.values === null])).toEqual([
      ['2026-09-25', false], ['2026-09-26', false], ['2026-09-27', true], ['2026-09-28', false], ['2026-09-29', false],
    ])
  })

  it('verdict coverage over time (merged PRs with / without a verdict)', () => {
    const { series, points } = coverageChart(snapshot)
    expect(series).toEqual([{ key: 'with', label: 'with a verdict' }, { key: 'without', label: 'without a verdict' }])
    expect(points.map(({ label, values }) => [label, values?.with, values?.without])).toEqual([
      ['2026-09-24', 7, 6], ['2026-09-25', 11, 1], ['2026-09-26', 0, 3], ['2026-09-27', 18, 8], ['2026-09-28', 0, 5], ['2026-09-29', 0, 1],
    ])
    // Summed over the days, they are prs.coverage's own counts.
    const sum = (key: string) => points.reduce((total, point) => total + (point.values?.[key] ?? 0), 0)
    const { merged, withVerdict } = snapshot.prs.coverage
    expect([sum('with'), sum('without')]).toEqual([withVerdict, merged - withVerdict])

    // A day opens into its PRs, each with its verdicts in order, or none.
    expect(points[0].items.slice(0, 6).map((item) => item.text.replace(/ .* · /, ' · '))).toEqual([
      '#497 · no verdict', '#495 · no verdict', '#494 · no verdict', '#493 · no verdict', '#492 · PASS', '#491 · BLOCK → PASS',
    ])
    expect(points[0].items[5].href).toBe(`${GITHUB}/pull/491`)
  })
})
