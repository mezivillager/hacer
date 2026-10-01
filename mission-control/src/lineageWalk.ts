import { REPO, docUrl, type Snapshot } from './snapshot'

type Lineage = Snapshot['lineage']
export interface Item { id: string; title: string; href: string; status?: string | null; expired: boolean }
export interface Branch { id: string; via: string; seen: boolean; children: Branch[] }

const WALKED = ['builds-on', 'assumes', 'amends', 'implements', 'introduced-by']

export const isExpired = (status: string | null | undefined) => /^expired/.test(status ?? '')
export const fileOf = (source: string) => source.replace(/:\d+$/, '')

/** Every decision and artefact by id, each with the link that opens it on GitHub. */
export function itemsOf({ nodes, artefacts }: Lineage): Map<string, Item> {
  const items = new Map<string, Item>()
  for (const a of artefacts) {
    const href = a.kind === 'github' ? `${REPO}/issues/${a.id.slice(1)}` : docUrl(fileOf(a.source ?? ''))
    items.set(a.id, { id: a.id, title: a.title ?? '', href, expired: false })
  }
  for (const n of nodes) {
    items.set(n.id, { id: n.id, title: n.title, href: docUrl(fileOf(n.source)), status: n.status, expired: n.kind === 'premise' && isExpired(n.status) })
  }
  return items
}

const rank = (id: string) => Number(/\d+/.exec(id)?.[0] ?? 0)

/** What `id` rests on (`down` false) or what rests on it (`down` true), as `lineage trace` and `radius` walk it: a node reached twice is expanded once. */
export function walk(edges: Lineage['edges'], id: string, down: boolean): Branch[] {
  const [near, far] = down ? (['to', 'from'] as const) : (['from', 'to'] as const)
  const seen = new Set([id])
  const grow = (key: string): Branch[] => edges
    .filter((e) => e[near] === key && WALKED.includes(e.kind))
    .sort((a, b) => WALKED.indexOf(a.kind) - WALKED.indexOf(b.kind) || rank(a[far]) - rank(b[far]))
    .map((e) => {
      const again = seen.has(e[far])
      seen.add(e[far])
      return { id: e[far], via: e.kind, seen: again, children: again ? [] : grow(e[far]) }
    })
  return grow(id)
}

export const idsOf = (branches: Branch[]): string[] => branches.flatMap((b) => [b.id, ...idsOf(b.children)])
