import { Fragment, useState } from 'react'
import { OTHER, type ChartData, type Point } from './chartSeries'

// viewBox units: the plot stretches to its card's width at a fixed 160px height, so a unit is a pixel vertically.
const W = 600
const H = 160
const GAP = 2 // the surface gap between stacked segments

/** Twice the smallest 1-2-5 step reaching half of `max`, so the gridlines at 0, half and top fall on round numbers. */
function niceTop(max: number): number {
  const base = 10 ** Math.max(0, Math.floor(Math.log10(Math.max(max, 1) / 2)))
  return 2 * ([1, 2, 5].map((k) => k * base).find((step) => 2 * step >= max) ?? 10 * base)
}

/** A column standing on the baseline: its top corners rounded by `r`, its baseline end square. */
const column = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`

const colorOf = (key: string, index: number) => (key === OTHER ? 'var(--series-other)' : `var(--series-${index + 1})`)

/** Columns over time, stacked past one series: a hue per series in fixed order, a legend past one, and a table of every
 *  value, the chart's text twin. Hover or focus shows a point's values; a click, Enter or Space lists what is behind it. */
export function Chart({ title, caption, data: { series, points } }: { title: string; caption: string; data: ChartData }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const valueOf = (point: Point, key: string) => point.values?.[key] ?? 0
  const top = niceTop(Math.max(0, ...points.map((point) => series.reduce((sum, { key }) => sum + valueOf(point, key), 0))))
  const band = W / Math.max(points.length, 1)
  const width = Math.min(24, band * 0.6)
  const y = (value: number) => H - (value / top) * H
  const said = (point: Point) => (point.values ? series.map(({ key, label }) => `${valueOf(point, key)} ${label}`).join(', ') : 'no reading')
  const shown = picked === null ? null : points[picked]
  const ticks = [top, top / 2, 0]

  const stack = (point: Point, index: number) => {
    const segments = series.map(({ key }, slot) => ({ key, fill: colorOf(key, slot), value: valueOf(point, key) }))
      .filter(({ value }) => value > 0)
    let base = 0
    return segments.map(({ key, fill, value }, level) => {
      const bottom = y(base) - (level > 0 ? GAP : 0)
      base += value
      const height = Math.max(0, bottom - y(base))
      const r = level === segments.length - 1 ? Math.min(4, width / 2, height) : 0
      return <path key={key} d={column(index * band + (band - width) / 2, y(base), width, height, r)} fill={fill} />
    })
  }

  return (
    <figure className="chart" aria-label={title}>
      <figcaption><h3>{title}</h3><p>{caption}</p></figcaption>
      {series.length > 1 && (
        <ul className="legend" aria-label="Legend">
          {series.map(({ key, label }, slot) => <li key={key}><i style={{ background: colorOf(key, slot) }} />{label}</li>)}
        </ul>
      )}
      {points.length === 0 ? <p className="empty">No points in the snapshot.</p> : (
        <>
          <div className="plot">
            {ticks.map((tick) => <span key={tick} className="tick" style={{ top: `${(1 - tick / top) * 100}%` }}>{tick}</span>)}
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
              {ticks.map((tick) => <line key={tick} className="grid" x1={0} x2={W} y1={y(tick)} y2={y(tick)} />)}
              {points.map((point, index) => <g key={point.key}>{stack(point, index)}</g>)}
              {points.map((point, index) => (
                <rect key={point.key} className="hit" x={index * band} y={0} width={band} height={H} role="button" tabIndex={0}
                  aria-label={`${point.label}: ${said(point)}`} aria-pressed={picked === index}
                  onPointerEnter={() => setHovered(index)} onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} onClick={() => setPicked(index)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    setPicked(index)
                  }} />
              ))}
            </svg>
            {hovered !== null && (
              <p role="tooltip" className="tip" style={hovered < points.length / 2
                ? { left: `${(hovered / points.length) * 100}%` } : { right: `${(1 - (hovered + 1) / points.length) * 100}%` }}>
                {`${points[hovered].label} · `}
                {points[hovered].values ? series.map(({ key, label }, slot) => (
                  <Fragment key={key}>{slot > 0 && ', '}<strong>{valueOf(points[hovered], key)}</strong>{` ${label}`}</Fragment>
                )) : 'no reading'}
              </p>
            )}
          </div>
          <p className="axis"><span>{points[0].label}</span>{points.length > 1 && <span>{points[points.length - 1].label}</span>}</p>
        </>
      )}
      {shown && (
        <section className="picked" aria-label={`${title}: ${shown.label}`}>
          <h4>{`${shown.label}: ${said(shown)}`}</h4>
          {shown.items.length === 0 ? <p className="empty">Nothing behind this point.</p>
            : <ul>{shown.items.map((item) => <li key={item.href}><a href={item.href}>{item.text}</a></li>)}</ul>}
        </section>
      )}
      <details>
        <summary>Table</summary>
        <div className="scroll">
          <table>
            <thead><tr><th>date</th>{series.map(({ key, label }) => <th key={key}>{label}</th>)}</tr></thead>
            <tbody>{points.map((point) => (
              <tr key={point.key}><td>{point.label}</td>{series.map(({ key }) => <td key={key}>{point.values ? valueOf(point, key) : '—'}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
