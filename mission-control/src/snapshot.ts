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
export interface Snapshot {
  schemaVersion: 1; generatedAt: string; head: { sha: string; subject: string }; freshness: Record<string, Freshness>
  portfolio: { projects: Project[] }; pickRule: { next: { number: number; title: string; project: string | null }[] }
  tasks: { items: Task[]; byProject: Record<string, number[]> }
  prs: { open: { verdicts: { verdict: 'PASS' | 'BLOCK' }[] }[]; coverage: { merged: number; withVerdict: number; pass: number; block: number } }
  sessions: { items: { file: string; date: string; kind: string; title: string | null }[] }
  metrics: { ratchet: { count: number; history: { count: number }[] }; releases: { tag: string; publishedAt: string; isLatest: boolean }[] }
  checks: { until?: string; items: unknown[] }
}

/** The snapshot `pnpm run build:control` put beside the page; one of another schema is refused, not half-rendered. */
export async function loadSnapshot(url = `${import.meta.env.BASE_URL}data/snapshot.json`): Promise<Snapshot> {
  throw new Error(`loadSnapshot(${url}): not implemented`)
}
