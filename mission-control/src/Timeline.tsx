import { Freshness } from './Freshness'
import { REPO, type Snapshot } from './snapshot'
import { timelineOf } from './timelineDays'

/** Sessions, merges and releases on one axis (`#/timeline`, #475): a calendar day per row, newest first — see
 *  timeline.ts for the 14-day window. A session's title opens its record on GitHub, the same link Overview's "Last
 *  session" tile uses; a merge opens its PR; a release opens its tag. */
export function Timeline({ snapshot }: { snapshot: Snapshot }) {
  const days = timelineOf(snapshot)
  return (
    <>
      <h2>Timeline</h2>
      <Freshness snapshot={snapshot} sections={['sessions', 'prs', 'metrics']} />
      <ol className="timeline" aria-label="Timeline">
        {days.map(({ date, sessions, merges, releases }) => (
          <li key={date}>
            <h3>{date}</h3>
            {sessions.length === 0 && merges.length === 0 && releases.length === 0 ? <p className="empty">No activity.</p> : (
              <ul aria-label={`${date} events`}>
                {sessions.map((session) => (
                  <li key={session.file}>{session.kind} · <a href={`${REPO}/blob/main/${session.file}`}>{session.title ?? session.file}</a></li>
                ))}
                {merges.map((pr) => <li key={pr.number}>merged <a href={pr.url}>#{pr.number}</a> {pr.title}</li>)}
                {releases.map((release) => (
                  <li key={release.tag}>released <a href={`${REPO}/releases/tag/${release.tag}`}>{release.tag}</a></li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </>
  )
}
