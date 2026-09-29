import { Freshness } from './Freshness'
import { REPO, type Snapshot } from './snapshot'

/** Every open issue labelled `needs-human`, one list, each linked to GitHub, where the owner answers it. */
export function NeedsHuman({ snapshot }: { snapshot: Snapshot }) {
  const items = snapshot.tasks.items.filter((task) => task.labels.includes('needs-human'))
  return (
    <>
      <h2>Needs human</h2>
      <Freshness snapshot={snapshot} sections={['tasks']} />
      {items.length === 0 ? <p>Nothing is labelled needs-human.</p> : (
        <ul aria-label="Needs human">
          {items.map((task) => <li key={task.number}><a href={`${REPO}/issues/${task.number}`}>#{task.number}</a> {task.title}</li>)}
        </ul>
      )}
    </>
  )
}
