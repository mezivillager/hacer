import { Freshness } from './Freshness'
import { REPO, nextPick, type Snapshot } from './snapshot'

const COLUMNS = ['#', 'Project', 'Lane', 'Progress', 'Open', 'Ready', 'In progress', 'Needs human', 'Next']

/** The portfolio, one row per project: its epic's progress, its counts, and "next" as `backlog.mjs ready` picks it. */
export function Projects({ snapshot }: { snapshot: Snapshot }) {
  const { projects } = snapshot.portfolio
  return (
    <>
      <h2>Projects</h2>
      <Freshness snapshot={snapshot} sections={['portfolio', 'pickRule']} />
      {projects.length === 0 ? <p>No portfolio rows in the snapshot.</p> : (
        <div className="scroll">
          <table aria-label="Projects">
            <thead><tr>{COLUMNS.map((name) => <th key={name}>{name}</th>)}</tr></thead>
            <tbody>{projects.map(({ slug, rank, lane, epicNumber, title, subIssues: epic, ...counts }) => {
              const pick = nextPick(snapshot, slug)
              // No pick: say why, as ready does: the reason of the row's first task that could be picked, if any.
              const held = snapshot.tasks.items.find((task) => task.project === slug && task.pickable)?.reason
              return (
                <tr key={slug}>
                  <td>{rank}</td>
                  <td><a href={`#/projects/${slug}`}>{slug}</a> <a href={`${REPO}/issues/${epicNumber}`} title={title ?? undefined}>#{epicNumber}</a></td>
                  <td>{lane}</td>
                  <td>{epic ? <><progress max={epic.total} value={epic.completed} />
                    {`${epic.completed}/${epic.total} (${epic.percentCompleted}%)`}</> : '—'}</td>
                  <td>{counts.open}</td><td>{counts.ready}</td><td>{counts.inProgress}</td><td>{counts.needsHuman}</td>
                  <td>{pick ? <><a href={`${REPO}/issues/${pick.number}`}>#{pick.number}</a>{` · pick ${pick.place} · ${pick.title}`}</>
                    : held ? `none: ${held}` : 'none ready'}</td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}
    </>
  )
}
