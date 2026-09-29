import { REPO, type PR, type Snapshot, type TasksReading } from './snapshot'
import { addDays, groupBy } from './timelineDays'

export interface Series { key: string; label: string }
/** A thing behind a point, on GitHub. */
export interface Item { href: string; text: string }
/** One column: its x label, its value per series (null: no reading that day, a gap, never a zero), and what is behind it. */
export interface Point { key: string; label: string; values: Record<string, number> | null; items: Item[] }
export interface ChartData { series: Series[]; points: Point[] }

/** The series every project past the first NAMED portfolio rows folds into. */
export const OTHER = '(other)'
const NAMED = 5
/** The history archive keeps 90 days (prune.logic.mjs); no chart runs longer, so the page stays a bounded size. */
const WINDOW_DAYS = 90

const dayOf = (iso: string) => new Date(iso).toISOString().slice(0, 10)

/** Every UTC day from `first` to `last`, oldest first: the last WINDOW_DAYS at most. */
function daysTo(first: string, last: string): string[] {
  const days = [last]
  while (days.length < WINDOW_DAYS && days[0] > first) days.unshift(addDays(days[0], -1))
  return days
}

/** The layer ratchet's count after each commit that changed its baseline, oldest first: a point per commit, at its UTC
 *  time, opening into the commit and the PR its subject names. */
export function ratchetChart({ metrics }: Snapshot): ChartData {
  const points = metrics.ratchet.history.map(({ sha, date, subject, count }) => {
    const pr = /\(#(\d+)\)$/.exec(subject)?.[1]
    const commit = { href: `${REPO}/commit/${sha}`, text: `${sha.slice(0, 7)} ${subject}` }
    return { key: sha, label: new Date(date).toISOString().slice(0, 16).replace('T', ' '), values: { count },
      items: pr ? [commit, { href: `${REPO}/pull/${pr}`, text: `PR #${pr}` }] : [commit] }
  })
  return { series: [{ key: 'count', label: 'known violations' }], points }
}

/** `prs.merged` by UTC merge day, every day from the oldest merge to the snapshot's: a day between with none is a zero. */
function byMergeDay({ generatedAt, prs }: Snapshot, series: Series[], valuesOf: (day: PR[]) => Record<string, number>,
  textOf: (pr: PR) => string): ChartData {
  const merged = prs.merged.filter((pr): pr is PR & { mergedAt: string } => pr.mergedAt !== null)
  const days = groupBy(merged, (pr) => dayOf(pr.mergedAt))
  const first = [...days.keys()].sort()[0]
  return { series, points: first === undefined ? [] : daysTo(first, dayOf(generatedAt)).map((date) => {
    const day = days.get(date) ?? []
    return { key: date, label: date, values: valuesOf(day), items: day.map((pr) => ({ href: pr.url, text: textOf(pr) })) }
  }) }
}

export const mergesChart = (snapshot: Snapshot) => byMergeDay(snapshot, [{ key: 'merged', label: 'merged' }],
  (day) => ({ merged: day.length }), (pr) => `#${pr.number} ${pr.title}`)

export const coverageChart = (snapshot: Snapshot) => byMergeDay(snapshot,
  [{ key: 'with', label: 'with a verdict' }, { key: 'without', label: 'without a verdict' }],
  (day) => {
    const verified = day.filter((pr) => pr.verdicts.length > 0).length
    return { with: verified, without: day.length - verified }
  },
  (pr) => `#${pr.number} ${pr.title} · ${pr.verdicts.map((each) => each.verdict).join(' → ') || 'no verdict'}`)

/** Each day's last reading of the open tasks per project: the archive's (`metrics.openTasks`), and the snapshot's own
 *  for its day. The first NAMED portfolio rows are series in portfolio order, so a project keeps its colour. */
export function openTasksChart({ freshness, tasks, portfolio, metrics }: Snapshot): ChartData {
  const named = [...portfolio.projects].sort((a, b) => a.rank - b.rank).slice(0, NAMED).map((project) => project.slug)
  const series = [...named.map((slug) => ({ key: slug, label: slug })), { key: OTHER, label: 'other' }]
  const at = freshness.tasks.fetchedAt
  const own: TasksReading[] = at === null ? [] : [{ date: dayOf(at), at, byProject: tasks.byProject }]
  // Sorted by time, so a day's later reading replaces its earlier one.
  const readings = new Map([...(metrics.openTasks ?? []), ...own].sort((a, b) => a.at.localeCompare(b.at))
    .map((reading) => [reading.date, reading]))
  const titles = new Map(tasks.items.map((task) => [task.number, task.title]))
  const dates = [...readings.keys()].sort()
  return { series, points: dates.length === 0 ? [] : daysTo(dates[0], dates[dates.length - 1]).map((date) => {
    const reading = readings.get(date)
    if (!reading) return { key: date, label: date, values: null, items: [] }
    const values: Record<string, number> = Object.fromEntries(series.map(({ key }) => [key, 0]))
    for (const [slug, numbers] of Object.entries(reading.byProject)) values[named.includes(slug) ? slug : OTHER] += numbers.length
    const items = Object.entries(reading.byProject).flatMap(([slug, numbers]) => numbers.map((number) => ({
      href: `${REPO}/issues/${number}`, text: `${slug} · #${number}${titles.has(number) ? ` ${titles.get(number)}` : ''}` })))
    return { key: date, label: date, values, items }
  }) }
}
