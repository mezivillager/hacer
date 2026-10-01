import { idsOf, isExpired, walk } from './lineageWalk'
import type { LineageNode, Snapshot } from './snapshot'

const BANDS: LineageNode['kind'][] = ['adr', 'ruling', 'premise']
const LABELS = { adr: 'ADRs', ruling: 'Rulings', premise: 'Premises' }
const PITCH = 12
const LEFT = 70
const ROW = 80
const TOP = 40

const rank = (id: string) => Number(/\d+/.exec(id)?.[0] ?? 0)
const nodeLabel = (n: LineageNode) => `${n.id} ${n.title}${n.kind === 'premise' && isExpired(n.status) ? ' — expired premise' : ''}`

/** The decisions as an inline SVG: one band per kind, each ordered by id along the x axis; edges are curves between bands. */
export function LineageGraph({ lineage, selected, onSelect }: { lineage: Snapshot['lineage']; selected: string | null; onSelect: (id: string) => void }) {
  const width = Math.max(600, Math.max(...BANDS.map((k) => lineage.nodes.filter((n) => n.kind === k).length)) * PITCH)
  const at = new Map<string, { x: number; y: number }>()
  BANDS.forEach((kind, row) => {
    const members = lineage.nodes.filter((n) => n.kind === kind).sort((a, b) => rank(a.id) - rank(b.id))
    members.forEach((n, i) => at.set(n.id, { x: LEFT + ((i + 0.5) * width) / members.length, y: TOP + row * ROW }))
  })
  const up = new Set(selected ? idsOf(walk(lineage.edges, selected, false)) : [])
  const down = new Set(selected ? idsOf(walk(lineage.edges, selected, true)) : [])
  const role = (id: string) => (id === selected ? 'selected' : up.has(id) ? 'up' : down.has(id) ? 'down' : '')
  return (
    <svg viewBox={`0 0 ${LEFT + width} ${TOP + ROW * BANDS.length}`} width={LEFT + width} height={TOP + ROW * BANDS.length} role="group" aria-label="Decision lineage graph">
      {BANDS.map((kind, row) => <text key={kind} x={0} y={TOP + row * ROW + 4} className="tick">{LABELS[kind]}</text>)}
      {lineage.edges.map((e, i) => {
        const a = at.get(e.from)
        const b = at.get(e.to)
        if (!a || !b) return null
        const d = a.y === b.y
          ? `M${a.x} ${a.y} Q${(a.x + b.x) / 2} ${a.y - Math.min(60, Math.abs(a.x - b.x) / 1.5)} ${b.x} ${b.y}`
          : `M${a.x} ${a.y} C${a.x} ${(a.y + b.y) / 2} ${b.x} ${(a.y + b.y) / 2} ${b.x} ${b.y}`
        const lit = up.has(e.to) && (e.from === selected || up.has(e.from)) ? ' up' : down.has(e.from) && (e.to === selected || down.has(e.to)) ? ' down' : ''
        return <path key={i} d={d} className={`edge${lit}`} fill="none" />
      })}
      {lineage.nodes.map((n) => {
        const p = at.get(n.id)
        if (!p) return null
        const expired = n.kind === 'premise' && isExpired(n.status)
        return (
          <g key={n.id} role="button" tabIndex={0} aria-label={nodeLabel(n)} data-kind={n.kind} data-expired={expired ? 'true' : undefined}
            aria-pressed={n.id === selected} className={`node ${role(n.id)}${expired ? ' expired' : ''}`} transform={`translate(${p.x} ${p.y})`}
            onClick={() => onSelect(n.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(n.id) }}>
            <title>{nodeLabel(n)}</title>
            <circle r={9} className="hit" />
            {n.kind === 'adr' && <rect x={-6} y={-6} width={12} height={12} rx={2} />}
            {n.kind === 'ruling' && <circle r={4} />}
            {n.kind === 'premise' && <polygon points="0,-7 7,0 0,7 -7,0" />}
            {(n.kind === 'adr' || expired || role(n.id)) && <text y={-12} textAnchor="middle" className="tick">{expired ? `✕ ${n.id}` : n.id}</text>}
          </g>
        )
      })}
    </svg>
  )
}
