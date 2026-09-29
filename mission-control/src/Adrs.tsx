import { Freshness } from './Freshness'
import { docUrl, type Adr, type Snapshot } from './snapshot'

/** The Status line's verdict: what it says before the first ` — ` or ` (`, links flattened to their text. */
const verdict = (status: string) => status.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').split(/ — | \(/)[0]

function AdrRow({ adr }: { adr: Adr }) {
  const number = String(adr.number).padStart(4, '0')
  return (
    <tr>
      <td><a href={docUrl(adr.file)}>{number}</a></td>
      <td>{adr.title ?? adr.file.split('/').pop()?.replace(/\.md$/, '')}</td>
      <td>{adr.status ? <span title={adr.status}>{verdict(adr.status)}</span> : '—'}</td>
    </tr>
  )
}

/** The decision records, in number order, each with the Status its own Status bullet gives; a row opens the ADR file. */
export function Adrs({ snapshot }: { snapshot: Snapshot }) {
  const { items } = snapshot.adrs
  return (
    <>
      <h2>ADRs</h2>
      <Freshness snapshot={snapshot} sections={['adrs']} />
      {items.length === 0 ? <p>No ADRs in the snapshot.</p> : (
        <div className="scroll">
          <table aria-label="ADRs">
            <thead><tr><th>ADR</th><th>Title</th><th>Status</th></tr></thead>
            <tbody>{items.map((adr) => <AdrRow key={adr.number} adr={adr} />)}</tbody>
          </table>
        </div>
      )}
    </>
  )
}
