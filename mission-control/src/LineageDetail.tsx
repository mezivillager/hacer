import { LineageBranches } from './LineageBranches'
import { fileOf, walk, type Item } from './lineageWalk'
import type { Snapshot } from './snapshot'

/** One decision: what it rests on, what rests on it, the artefacts that cite it, and the file it is written in. */
export function LineageDetail({ lineage, id, items }: { lineage: Snapshot['lineage']; id: string; items: Map<string, Item> }) {
  const node = lineage.nodes.find((n) => n.id === id)
  if (!node) return null
  const up = walk(lineage.edges, id, false)
  const down = walk(lineage.edges, id, true)
  const cited = lineage.artefacts.filter((a) => a.citedBy?.includes(id))
  return (
    <section aria-label={id} className="lineage-detail">
      <h3>{id} — {node.title}</h3>
      <p><a href={items.get(id)?.href}>{fileOf(node.source)}</a>{node.status && <> · {node.status}</>}</p>
      <h4>Rests on</h4>
      {up.length === 0 ? <p className="muted">Nothing: the record stops here.</p> : <LineageBranches branches={up} items={items} label="Rests on" />}
      <h4>What rests on it</h4>
      {down.length === 0 ? <p className="muted">Nothing rests on it.</p> : <LineageBranches branches={down} items={items} label="What rests on it" />}
      {cited.length > 0 && <>
        <h4>Cited by</h4>
        <p>{cited.map((a) => <span key={a.id}><a href={items.get(a.id)?.href}>{a.id}</a>{' '}</span>)}</p>
      </>}
    </section>
  )
}
