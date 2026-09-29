import { useState } from 'react'
import { Freshness } from './Freshness'
import { stagesOf } from './stages'
import { QueueImprovement } from './QueueImprovement'
import { StageDiagram } from './StageDiagram'
import { REPO, isRedCheck, type Snapshot } from './snapshot'

/** The process view (`#/process`, #474): the loop as an inline SVG diagram with live counts, a stage's items on
 *  click, the claims list already joined to issue state (a ref on a closed issue flagged), and the cloud lane. */
export function Process({ snapshot }: { snapshot: Snapshot }) {
  const stages = stagesOf(snapshot)
  const [selected, setSelected] = useState<string | null>(null)
  const redChecks = snapshot.checks.items.filter(isRedCheck)
  const stage = stages.find((each) => each.id === selected)
  return (
    <>
      <h2>Process</h2>
      <Freshness snapshot={snapshot} sections={['tasks', 'claims', 'prs', 'cloudLane']} />
      <p><QueueImprovement title="Process improvement" context={`From the Process view: ${REPO}/blob/main/docs/harness/README.md`} label="Queue an improvement" /></p>
      <StageDiagram stages={stages} selected={selected} onSelect={(id) => setSelected(id === selected ? null : id)} />
      {stage && (stage.items.length === 0
        ? <p>No items in {stage.name}.</p>
        : (
          <ul aria-label={`${stage.name} items`}>
            {stage.items.map((item) => <li key={item.number}><a href={item.url}>#{item.number}</a> {item.title}</li>)}
          </ul>
        ))}

      <h3>Claims</h3>
      {snapshot.claims.items.length === 0 ? <p>No open claim refs in the snapshot.</p> : (
        <table aria-label="Claims">
          <thead><tr><th>Issue</th><th>State</th><th>Claimed by</th><th>Intent</th><th>Improve</th></tr></thead>
          <tbody>{snapshot.claims.items.map((claim) => (
            <tr key={claim.number}>
              <td><a href={claim.url ?? `${REPO}/issues/${claim.number}`}>#{claim.number}</a> {claim.title}</td>
              <td>{claim.state ?? '—'}{claim.onClosedIssue && <span className="stale"> stale: ref on a closed issue</span>}</td>
              <td>{claim.claim?.claimedBy ?? '—'}</td>
              <td>{claim.claim?.intent ?? '—'}</td>
              <td>{claim.onClosedIssue && <QueueImprovement title={`Stale claim on #${claim.number}`}
                context={`Claim ref ${claim.ref} is held on closed issue #${claim.number}.\n${claim.url ?? `${REPO}/issues/${claim.number}`}`} />}</td>
            </tr>
          ))}</tbody>
        </table>
      )}

      <h3>Red checks</h3>
      {redChecks.length === 0 ? <p>No red checks in the snapshot.</p> : (
        <table aria-label="Red checks">
          <thead><tr><th>Check</th><th>Head</th><th>Result</th><th>Improve</th></tr></thead>
          <tbody>{redChecks.map((check) => {
            const head = check.pr ? `PR #${check.pr}` : 'main'
            return (
              <tr key={`${check.pr}-${check.check}`}>
                <td>{check.url ? <a href={check.url}>{check.check}</a> : check.check}</td>
                <td>{head}</td><td>{check.line ?? check.conclusion ?? '—'}</td>
                <td><QueueImprovement title={`Red check ${check.check} on ${head}`}
                  context={`${check.check} on ${head} (${check.sha}): ${check.line ?? check.conclusion ?? 'no result'}\n${check.url ?? ''}`.trim()} /></td>
              </tr>
            )
          })}</tbody>
        </table>
      )}

      <h3>Cloud lane</h3>
      {snapshot.cloudLane.items.length === 0 ? <p>No cloud lane rows in the snapshot.</p> : (
        <table aria-label="Cloud lane">
          <thead><tr><th>Issue</th><th>Status</th><th>Claim</th><th>Cloud agent id</th></tr></thead>
          <tbody>{snapshot.cloudLane.items.map((row, index) => (
            <tr key={row.number ?? index}>
              <td>{row.number ? <a href={`${REPO}/issues/${row.number}`}>#{row.number}</a> : '—'}</td>
              <td>{row.status}</td><td>{row.claimStatus}</td><td>{row.cloudAgentId || '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </>
  )
}
