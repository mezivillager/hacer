import { Freshness } from './Freshness'
import { REPO, type Snapshot } from './snapshot'

/** One project's open tasks in `ready`'s order: its picks first, each with its place, then the rest with ready's reason. */
export function ProjectTasks({ snapshot, slug }: { snapshot: Snapshot; slug: string }) {
  const project = snapshot.portfolio.projects.find((each) => each.slug === slug)
  const tasks = snapshot.tasks.items.filter((task) => (task.project ?? 'unfiled') === slug)
  const place = (number: number) => snapshot.pickRule.next.findIndex((pick) => pick.number === number) + 1
  return (
    <>
      <h2>{slug} {project && <a href={`${REPO}/issues/${project.epicNumber}`}>#{project.epicNumber} {project.title}</a>}</h2>
      <Freshness snapshot={snapshot} sections={['tasks']} />
      {tasks.length === 0 ? <p>No open tasks for {slug} in the snapshot.</p> : (
        <ol aria-label={`${slug} tasks`}>{tasks.map((task) => (
          <li key={task.number}><a href={`${REPO}/issues/${task.number}`}>#{task.number}</a>
            {` · ${task.reason ?? `pick ${place(task.number)}`} · ${task.title}`}</li>
        ))}</ol>
      )}
    </>
  )
}
