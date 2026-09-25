import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import fixture from '../../scripts/fixtures/mission-control/snapshot.json'
import { Timeline } from './Timeline'
import type { Snapshot } from './snapshot'

// `collect.mjs --json` at origin/main 561dcf1, 2026-09-25 03:16Z — see scripts/mission-control/collect.logic.test.mjs.
const snapshot = fixture as Snapshot
const GITHUB = 'https://github.com/mezivillager/hacer'

const day = (date: string) => screen.getByRole('heading', { level: 3, name: date }).closest('li')!

describe('Timeline', () => {
  it('renders sessions, merges and releases on one axis, newest first, over the 14 days to the snapshot', () => {
    render(<Timeline snapshot={snapshot} />)
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      '2026-09-25', '2026-09-24', '2026-09-23', '2026-09-22', '2026-09-21', '2026-09-20', '2026-09-19', '2026-09-18',
      '2026-09-17', '2026-09-16', '2026-09-15', '2026-09-14', '2026-09-13', '2026-09-12',
    ])
    expect(screen.getByText('as of 2026-09-25 03:16 UTC')).toBeTruthy()

    // The busiest day merges all three series in one list: its session first, then its 32 merges, then its 12 releases.
    const items = within(day('2026-09-24')).getAllByRole('listitem')
    expect(items).toHaveLength(1 + 32 + 12)
    expect(items[0].textContent).toBe(
      'record · Session record — 2026-09-24: four merges, and a defect class that keeps being caught by tools rather than readers')
    expect(items[1].textContent?.startsWith('merged #')).toBe(true)
    expect(items[items.length - 1].textContent).toBe('released v2.25.3')

    // A quieter day still carries all three kinds: one session, no merges, seven releases.
    const quiet = within(day('2026-09-21')).getAllByRole('listitem')
    expect(quiet).toHaveLength(1 + 0 + 7)
    expect(quiet[0].textContent).toBe('record · Session record — 2026-09-21: the foundation question, and a change of direction')
  })

  it("a session's title opens its record on GitHub", () => {
    render(<Timeline snapshot={snapshot} />)
    const link = within(day('2026-09-24')).getByRole('link', { name: /^Session record — 2026-09-24:/ })
    expect(link.getAttribute('href')).toBe(`${GITHUB}/blob/main/docs/harness/sessions/2026-09-24.md`)
  })

  it('an empty day renders without error', () => {
    render(<Timeline snapshot={snapshot} />)
    const gap = day('2026-09-20') // a real gap: no session, no merge, no release, between two active days
    expect(within(gap).getByText('No activity.')).toBeTruthy()
    expect(within(gap).queryAllByRole('listitem')).toHaveLength(0)
  })
})
