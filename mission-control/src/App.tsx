import { useEffect, useState } from 'react'
import { Overview } from './Overview'
import { Process } from './Process'
import { ProjectTasks } from './ProjectTasks'
import { Projects } from './Projects'
import { useRoute } from './route'
import { REPO, loadSnapshot, when, type Snapshot } from './snapshot'

/** Loads the snapshot once, then shows the view the hash names; a snapshot that will not load says why. */
export function App({ load = loadSnapshot }: { load?: () => Promise<Snapshot> }) {
  const [loaded, setLoaded] = useState<{ snapshot?: Snapshot; error?: string }>({})
  const route = useRoute()
  useEffect(() => {
    load().then((snapshot) => setLoaded({ snapshot }),
      (error: unknown) => setLoaded({ error: error instanceof Error ? error.message : String(error) }))
  }, [load])
  const { snapshot, error } = loaded
  if (!snapshot) return <main className="mc"><p>{error ? `Could not load the snapshot: ${error}` : 'Loading the snapshot…'}</p></main>
  return (
    <main className="mc">
      <header>
        <h1>Mission Control</h1>
        <nav><a href="#/">Overview</a> <a href="#/projects">Projects</a> <a href="#/process">Process</a></nav>
        <p>Snapshot {when(snapshot.generatedAt)} · <a href={`${REPO}/commit/${snapshot.head.sha}`} title={snapshot.head.subject}>
          {snapshot.head.sha.slice(0, 7)}</a></p>
      </header>
      {route.view === 'overview' && <Overview snapshot={snapshot} />}
      {route.view === 'projects' && <Projects snapshot={snapshot} />}
      {route.view === 'project' && <ProjectTasks snapshot={snapshot} slug={route.slug} />}
      {route.view === 'process' && <Process snapshot={snapshot} />}
    </main>
  )
}
