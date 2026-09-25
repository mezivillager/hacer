import type { ReactNode } from 'react'
import { Freshness } from './Freshness'
import type { Snapshot } from './snapshot'

interface Props {
  snapshot: Snapshot; section: string; title: string; empty?: string
  href: string // what the tile summarises, on GitHub
  rows: [string, ReactNode][] // [term, value] pairs; a null value leaves its row out
}

/** One Overview tile: its facts, or why there are none (never a zero it did not count), dated by its section. */
export function Tile({ snapshot, section, title, href, rows, empty = 'No data in the snapshot.' }: Props) {
  const shown = snapshot.freshness[section].fetchedAt === null ? [] : rows.filter(([, value]) => value !== null)
  return (
    <section className="tile" aria-label={title}>
      <h3><a href={href}>{title}</a></h3>
      <Freshness snapshot={snapshot} sections={[section]} />
      {shown.length > 0
        ? <dl>{shown.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
        : <p>{empty}</p>}
    </section>
  )
}
