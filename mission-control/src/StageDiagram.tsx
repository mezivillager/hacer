import type { Stage } from './stages'

const W = 150 // box width
const GAP = 24 // gap between boxes, and the arrow's length
const H = 92 // box height, and the SVG's height

/** The loop as inline SVG — one box per stage with its live counts, clickable to drill into its items. No diagram
 *  library: plain rects, text and a shared arrowhead marker, coloured from the page's own CSS variables. */
export function StageDiagram({ stages, selected, onSelect }: { stages: Stage[]; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <svg viewBox={`0 0 ${stages.length * (W + GAP) - GAP} ${H}`}>
      <defs>
        <marker id="mc-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--muted)" />
        </marker>
      </defs>
      {stages.map((stage, index) => {
        const x = index * (W + GAP)
        const isSelected = stage.id === selected
        const label = `${stage.name}: ${stage.counts.map((count) => `${count.value} ${count.label}`).join(' · ')}`
        return (
          <g key={stage.id} role="button" tabIndex={0} aria-label={label} aria-pressed={isSelected} style={{ cursor: 'pointer' }}
            onClick={() => onSelect(stage.id)}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(stage.id) } }}>
            {index > 0 && <line x1={x - GAP} y1={H / 2} x2={x} y2={H / 2} stroke="var(--muted)" markerEnd="url(#mc-arrow)" />}
            <rect x={x} y={0} width={W} height={H} rx={8} fill={isSelected ? 'var(--link)' : 'var(--card)'} stroke="var(--line)" />
            <text x={x + W / 2} y={22} textAnchor="middle" fontSize={13} fill={isSelected ? 'var(--card)' : 'var(--text)'}>{stage.name}</text>
            {stage.counts.map((count, row) => (
              <text key={count.label} x={x + W / 2} y={44 + row * 18} textAnchor="middle" fontSize={12}
                fill={isSelected ? 'var(--card)' : 'var(--muted)'}>{count.value} {count.label}</text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}
