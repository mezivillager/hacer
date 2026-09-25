import { REPO, type Snapshot } from './snapshot'

export interface Item { number: number; title: string; url: string }
export interface Count { label: string; value: number }
export interface Stage { id: string; name: string; counts: Count[]; items: Item[] }

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const issueOf = ({ number, title }: { number: number; title: string }): Item => ({ number, title, url: `${REPO}/issues/${number}` })
const prOf = ({ number, title, url }: { number: number; title: string; url: string }): Item => ({ number, title, url })

/** The loop's six stages, live from the snapshot — every count's definition is documented in
 *  docs/harness/mission-control.md. `verifying` is `PR`'s own open PRs, split by whether a verdict has landed. */
export function stagesOf({ tasks, claims, prs, generatedAt }: Snapshot): Stage[] {
  const ready = tasks.items.filter((task) => task.pickable)
  const building = tasks.items.filter((task) => task.reason === 'in-progress')
  const cutoff = new Date(generatedAt).getTime() - WEEK_MS
  const merged = prs.merged.filter((pr) => pr.mergedAt !== null && new Date(pr.mergedAt).getTime() >= cutoff)
  const noVerdict = prs.open.filter((pr) => pr.verdicts.length === 0)
  const withVerdict = prs.open.filter((pr) => pr.verdicts.length > 0)
  return [
    { id: 'ready', name: 'Ready', counts: [{ label: 'ready', value: ready.length }], items: ready.map(issueOf) },
    {
      id: 'claimed', name: 'Claimed', counts: [{ label: 'claimed', value: claims.items.length }],
      items: claims.items.map((claim) => ({ number: claim.number, title: claim.title ?? claim.ref, url: claim.url ?? `${REPO}/issues/${claim.number}` })),
    },
    { id: 'building', name: 'Building', counts: [{ label: 'building', value: building.length }], items: building.map(issueOf) },
    { id: 'pr', name: 'PR', counts: [{ label: 'open', value: prs.open.length }], items: prs.open.map(prOf) },
    {
      id: 'verifying', name: 'Verifying', items: prs.open.map(prOf),
      counts: [{ label: 'no verdict', value: noVerdict.length }, { label: 'with verdict', value: withVerdict.length }],
    },
    { id: 'merged', name: 'Merged (7d)', counts: [{ label: 'merged', value: merged.length }], items: merged.map(prOf) },
  ]
}
