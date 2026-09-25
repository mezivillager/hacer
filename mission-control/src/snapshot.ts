// Mission Control's read model: the parts of snapshot v1 this site renders (docs/harness/mission-control.md), and how
// it loads and formats them. The site only reads the snapshot (REPORT.md §5: a projection, never a second truth).

export type Status = 'ok' | 'partial' | 'error'
export interface Freshness { source: string; fetchedAt: string | null; status: Status; error?: string }
export interface Task { number: number; title: string; project: string | null; pickable: boolean; reason: string | null }
export interface Project {
  rank: number; slug: string; lane: string; epicNumber: number; title: string | null
  open: number; ready: number; inProgress: number; needsHuman: number
  subIssues: { total: number; completed: number; percentCompleted: number } | null
}
export interface PR { number: number; title: string; url: string; mergedAt: string | null; verdicts: { verdict: 'PASS' | 'BLOCK' }[] }
export interface Claim {
  number: number; ref: string; title: string | null; url: string | null; state: string | null; onClosedIssue: boolean | null
  claim: { claimedBy: string | null; intent: string | null } | null
}
export interface CloudLaneItem { number: number | null; status: string; claimStatus: string; cloudAgentId: string }
export interface Snapshot {
  schemaVersion: 1; generatedAt: string; head: { sha: string; subject: string }; freshness: Record<string, Freshness>
  portfolio: { projects: Project[] }; pickRule: { next: { number: number; title: string; project: string | null }[] }
  tasks: { items: Task[]; byProject: Record<string, number[]> }
  prs: { open: PR[]; merged: PR[]; coverage: { merged: number; withVerdict: number; pass: number; block: number } }
  claims: { items: Claim[]; onClosedIssues: number }
  cloudLane: { items: CloudLaneItem[] }
  sessions: { items: { file: string; date: string; kind: string; title: string | null }[] }
  metrics: { ratchet: { count: number; history: { count: number }[] }; releases: { tag: string; publishedAt: string; isLatest: boolean }[] }
  checks: { until?: string; items: unknown[] }
}

export const REPO = 'https://github.com/mezivillager/hacer'

/** The snapshot `pnpm run build:control` put beside the page; one of another schema is refused, not half-rendered. */
export async function loadSnapshot(url = `${import.meta.env.BASE_URL}data/snapshot.json`): Promise<Snapshot> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  const snapshot = (await response.json()) as Snapshot
  if (snapshot.schemaVersion !== 1) throw new Error(`snapshot schema ${String(snapshot.schemaVersion)}: this site reads schema 1`)
  return snapshot
}

/** An ISO time as `YYYY-MM-DD HH:MM UTC`, the same wherever the page is read. */
export const when = (iso: string) => `${new Date(iso).toISOString().slice(0, 16).replace('T', ' ')} UTC`

/** The site is never meant to be more than an hour old (#476, MC-5's hourly refresh); the banner's threshold. */
export const STALE_AFTER_MS = 2 * 60 * 60 * 1000

/** Whether a snapshot's `generatedAt` is older than STALE_AFTER_MS as of `now` (injectable so App stays testable). */
export function isStale(generatedAt: string, now: number): boolean {
  throw new Error(`not implemented: ${generatedAt} ${now}`)
}

/** A row's next task exactly as `backlog.mjs ready` orders its picks (`pickRule.next`), and its place in that order. */
export function nextPick({ pickRule }: Snapshot, slug: string) {
  const index = pickRule.next.findIndex((task) => task.project === slug)
  return index < 0 ? null : { ...pickRule.next[index], place: index + 1 }
}
