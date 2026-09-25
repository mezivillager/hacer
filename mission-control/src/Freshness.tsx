import { when, type Snapshot } from './snapshot'

/** When a view's data was fetched (the oldest of its sections), and a stale banner for each section partial or in error. */
export function Freshness({ snapshot, sections }: { snapshot: Snapshot; sections: string[] }) {
  const records = sections.map((name) => ({ name, ...snapshot.freshness[name] }))
  const times = records.map((record) => record.fetchedAt)
  const asOf = times.includes(null) ? null : [...times].sort()[0]
  return (
    <>
      {records.filter((record) => record.status !== 'ok').map(({ name, status, error }) => (
        <p key={name} className="stale">{`Stale: ${name} ${status} — ${error ?? 'no reason recorded'}`}</p>
      ))}
      <p className="asof">{asOf ? `as of ${when(asOf)}` : 'never fetched'}</p>
    </>
  )
}
