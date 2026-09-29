import { REPO } from './snapshot'

/** GitHub truncates or rejects very long URLs; the context keeps its head, where the ids and links are. */
const MAX_CONTEXT = 3000

/** The link that opens the process-improvement issue form prefilled: a link only, nothing is written until the
 *  owner submits the form on GitHub. `context` fills the form's `context` field (the field id in the template). */
export function buildIssueUrl({ title, context }: { title: string; context: string }): string {
  const params = new URLSearchParams({ template: 'process-improvement.yml', title, context: context.slice(0, MAX_CONTEXT) })
  return `${REPO}/issues/new?${params.toString()}`
}
