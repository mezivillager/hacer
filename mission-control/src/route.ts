// Hash routes, so a static sub-folder needs no 404 tricks: #/ · #/projects · #/projects/<slug>.

export type Route = { view: 'overview' } | { view: 'projects' } | { view: 'project'; slug: string }

export function routeOf(hash: string): Route {
  throw new Error(`routeOf(${hash}): not implemented`)
}
