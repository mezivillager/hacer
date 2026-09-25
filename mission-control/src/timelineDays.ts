import type { PR, Snapshot } from './snapshot'

export interface TimelineDay {
  date: string // YYYY-MM-DD
  sessions: Snapshot['sessions']['items']
  merges: (PR & { mergedAt: string })[]
  releases: Snapshot['metrics']['releases']
}

const WINDOW_DAYS = 14
const dayOf = (iso: string) => iso.slice(0, 10)

function addDays(date: string, delta: number): string {
  const at = new Date(`${date}T00:00:00Z`)
  at.setUTCDate(at.getUTCDate() + delta)
  return at.toISOString().slice(0, 10)
}

function groupBy<T>(items: T[], keyOf: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return groups
}

/** Sessions, merges and releases merged onto one day-by-day axis, newest first, over the 14 days ending the day the
 *  snapshot was taken (`generatedAt`) — a fixed window, so the page stays a bounded size as sessions and releases
 *  keep accumulating, rather than growing one row per release back to the project's first tag in March. A day with
 *  nothing in any of the three series is still a row: it says so, rather than closing the gap over it (#475). */
export function timelineOf({ generatedAt, sessions, prs, metrics }: Snapshot): TimelineDay[] {
  const last = dayOf(generatedAt)
  const sessionsByDay = groupBy(sessions.items, (session) => session.date)
  const merged = prs.merged.filter((pr): pr is PR & { mergedAt: string } => pr.mergedAt !== null)
  const mergesByDay = groupBy(merged, (pr) => dayOf(pr.mergedAt))
  const releasesByDay = groupBy(metrics.releases, (release) => dayOf(release.publishedAt))
  return Array.from({ length: WINDOW_DAYS }, (_, index) => {
    const date = addDays(last, -index)
    return { date, sessions: sessionsByDay.get(date) ?? [], merges: mergesByDay.get(date) ?? [], releases: releasesByDay.get(date) ?? [] }
  })
}
