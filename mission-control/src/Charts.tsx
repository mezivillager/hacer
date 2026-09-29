import { Chart } from './Chart'
import { coverageChart, mergesChart, openTasksChart, ratchetChart } from './chartSeries'
import { Freshness } from './Freshness'
import type { Snapshot } from './snapshot'

/** Four charts over time (`#/charts`, #478), each point opening into the commits, PRs or tasks behind it. */
export function Charts({ snapshot }: { snapshot: Snapshot }) {
  const merged = snapshot.prs.merged.length
  return (
    <>
      <h2>Charts</h2>
      <Freshness snapshot={snapshot} sections={['metrics', 'prs', 'tasks']} />
      <div className="charts">
        <Chart title="Layer ratchet" caption="Known violations after each commit that changed the baseline."
          data={ratchetChart(snapshot)} />
        <Chart title="Merges per day" caption={`The last ${merged} merged PRs by UTC day; the first day may be cut short.`}
          data={mergesChart(snapshot)} />
        <Chart title="Verdict coverage" caption="The same PRs, with and without a verifier verdict."
          data={coverageChart(snapshot)} />
        <Chart title="Open tasks by project" caption="Each day's last reading from the history archive; today's is this snapshot's."
          data={openTasksChart(snapshot)} />
      </div>
    </>
  )
}
