import { useState } from 'react'
import { Freshness } from './Freshness'
import { LineageDetail } from './LineageDetail'
import { LineageGraph } from './LineageGraph'
import { itemsOf } from './lineageWalk'
import type { Snapshot } from './snapshot'

/** The decision lineage: click a decision to see what it rests on, what rests on it, and the artefacts that cite it. */
export function Lineage({ snapshot }: { snapshot: Snapshot }) {
  const { lineage } = snapshot
  const [selected, setSelected] = useState<string | null>(null)
  return (
    <>
      <h2>Lineage</h2>
      <Freshness snapshot={snapshot} sections={['lineage']} />
      {lineage.nodes.length === 0 ? <p>No decisions in the snapshot.</p> : (
        <>
          <p className="legend">
            <span className="key up" /> rests on · <span className="key down" /> rests on it · ◇ premise · ✕ expired premise
          </p>
          <div className="scroll"><LineageGraph lineage={lineage} selected={selected} onSelect={setSelected} /></div>
          {selected && <LineageDetail lineage={lineage} id={selected} items={itemsOf(lineage)} />}
        </>
      )}
    </>
  )
}
