import { buildIssueUrl } from './issueUrl'

/** A "queue an improvement" link: opens the prefilled GitHub issue form for `title`, carrying `context` (ids and links).
 *  `label` is the visible text; the accessible name always names what it is about. */
export function QueueImprovement({ title, context, label }: { title: string; context: string; label?: string }) {
  return (
    <a href={buildIssueUrl({ title, context })} target="_blank" rel="noreferrer"
      aria-label={label ?? `Queue an improvement: ${title}`}>{label ?? 'Queue an improvement'}</a>
  )
}
