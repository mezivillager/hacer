/** Dispatched on `window` to hide the demo tour without clicking (e.g. Playwright). */
export const DISMISS_DEMO_TOUR_EVENT = 'hacer-dismiss-demo-tour'

/**
 * When true, the floating demo tour is not shown. Used by E2E (`?notour=1`) and
 * optional manual testing.
 */
export function shouldSuppressDemoTourFromSearchParams(search: string): boolean {
  const trimmed = search.startsWith('?') ? search.slice(1) : search
  const q = new URLSearchParams(trimmed)
  return q.get('notour') === '1' || q.get('noTour') === '1'
}
