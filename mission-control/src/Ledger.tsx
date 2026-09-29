import { useState } from 'react'
import { Freshness } from './Freshness'
import { MECHANISED, docUrl, mechanisedOf, type Snapshot } from './snapshot'

const LEDGER = 'docs/harness/ledger.md'
const FILTERS = ['all', ...MECHANISED, 'other']

/** The failure ledger, one row per entry, filterable by whether its fix is mechanised; each id opens the ledger file. */
export function Ledger({ snapshot }: { snapshot: Snapshot }) {
  const [filter, setFilter] = useState('all')
  const { items } = snapshot.ledger
  const shown = filter === 'all' ? items : items.filter((row) => mechanisedOf(row.mechanised) === filter)
  return (
    <>
      <h2>Ledger</h2>
      <Freshness snapshot={snapshot} sections={['ledger']} />
      <p><a href={docUrl(LEDGER)}>{LEDGER}</a></p>
      {items.length === 0 ? <p>No ledger rows in the snapshot.</p> : (
        <>
          <p>
            <label>Mechanised{' '}
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                {FILTERS.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>{' '}
            <span>{`Showing ${shown.length} of ${items.length}`}</span>
          </p>
          <div className="scroll">
            <table aria-label="Ledger">
              <thead><tr><th>Id</th><th>Date</th><th>What went wrong</th><th>Mechanised?</th><th>Should have been caught by</th><th>Decision</th></tr></thead>
              <tbody>{shown.map((row, index) => (
                <tr key={row.id ?? index}>
                  <td><a href={docUrl(LEDGER)}>{row.id ?? '—'}</a></td><td>{row.date}</td><td>{row.whatWentWrong}</td>
                  <td>{row.mechanised}</td><td>{row.shouldHaveBeenCaughtBy}</td><td>{row.decision ?? '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
