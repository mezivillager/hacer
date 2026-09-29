import { Freshness } from './Freshness'
import { docUrl, type Phase, type Snapshot } from './snapshot'

const DAY_MS = 864e5

function PhaseTable({ group, phases }: { group: string; phases: Phase[] }) {
  return (
    <>
      <h3>{group}</h3>
      <div className="scroll">
        <table aria-label={group}>
          <thead><tr><th>Phase</th><th>Status</th><th>Scope</th></tr></thead>
          <tbody>{phases.map(({ phase, status, scope, doc }) => (
            <tr key={phase}>
              <td>{doc ? <a href={docUrl(doc)}>{phase}</a> : phase}</td><td>{status}</td><td>{scope}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </>
  )
}

/** The roadmap's phase tables as the README states them, with the README's own date and its age against the snapshot:
 *  the roadmap is edited by hand, so how stale it is is part of what it says. */
export function Roadmap({ snapshot }: { snapshot: Snapshot }) {
  const { lastUpdated, phases } = snapshot.roadmap
  const age = lastUpdated ? Math.floor((Date.parse(snapshot.generatedAt) - Date.parse(lastUpdated)) / DAY_MS) : null
  const groups = [...new Set(phases.map((phase) => phase.group))]
  return (
    <>
      <h2>Roadmap</h2>
      <Freshness snapshot={snapshot} sections={['roadmap']} />
      <p>{lastUpdated && age !== null && !Number.isNaN(age)
        ? `Last updated ${lastUpdated} · ${age} days before this snapshot` : 'The roadmap states no last-updated date.'}
      {' '}<a href={docUrl('docs/roadmap/README.md')}>docs/roadmap/README.md</a></p>
      {groups.length === 0 ? <p>No phases in the snapshot.</p>
        : groups.map((group) => <PhaseTable key={group} group={group} phases={phases.filter((phase) => phase.group === group)} />)}
    </>
  )
}
