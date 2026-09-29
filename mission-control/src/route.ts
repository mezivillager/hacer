import { useSyncExternalStore } from 'react'

// Hash routes, so a static sub-folder needs no 404 tricks: #/ · #/projects · #/projects/<slug> · #/process · #/timeline · #/charts · #/roadmap · #/ledger · #/adrs · #/needs-human.

export type Route =
  | { view: 'overview' } | { view: 'projects' } | { view: 'project'; slug: string } | { view: 'process' } | { view: 'timeline' } | { view: 'charts' }
  | { view: 'roadmap' } | { view: 'ledger' } | { view: 'adrs' } | { view: 'needs-human' }

/** Anything unrecognised is the Overview: a mistyped link lands on a view, never on a blank page. */
export function routeOf(hash: string): Route {
  const [view, slug] = hash.replace(/^#\/?/, '').split('/')
  if (view === 'process') return { view: 'process' }
  if (view === 'timeline') return { view: 'timeline' }
  if (view === 'charts') return { view: 'charts' }
  if (view === 'roadmap' || view === 'ledger' || view === 'adrs' || view === 'needs-human') return { view }
  if (view !== 'projects') return { view: 'overview' }
  return slug ? { view: 'project', slug } : { view: 'projects' }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

/** The route in the address bar, followed as links and the back button change it. */
export const useRoute = () => routeOf(useSyncExternalStore(subscribe, () => window.location.hash))
