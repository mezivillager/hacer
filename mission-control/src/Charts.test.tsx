import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import fixture from '../../scripts/fixtures/mission-control/snapshot-2026-09-29.json'
import { Charts } from './Charts'
import type { Snapshot } from './snapshot'

// The newest archived snapshot on 2026-09-29 — see chartSeries.test.ts for why not snapshot.json.
const snapshot = fixture as unknown as Snapshot // its conformance rows infer per-row shapes, not Record<string, number>
const GITHUB = 'https://github.com/mezivillager/hacer'

const chart = (name: string) => screen.getByRole('figure', { name })
const links = (region: HTMLElement) => within(region).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])

describe('Charts', () => {
  it('draws the four charts: a point per day or commit, named for its values, a legend past one series, and a table view', () => {
    render(<Charts snapshot={snapshot} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Charts' })).toBeTruthy()
    expect(screen.getAllByRole('figure').map((figure) => figure.getAttribute('aria-label')))
      .toEqual(['Layer ratchet', 'Merges per day', 'Verdict coverage', 'Open tasks by project'])

    const merges = chart('Merges per day')
    expect(within(merges).getAllByRole('button').map((point) => point.getAttribute('aria-label'))).toEqual([
      '2026-09-24: 13 merged', '2026-09-25: 12 merged', '2026-09-26: 3 merged', '2026-09-27: 26 merged', '2026-09-28: 5 merged',
      '2026-09-29: 1 merged',
    ])
    expect(within(merges).queryByRole('list', { name: 'Legend' })).toBeNull() // one series: the title names it
    expect(within(chart('Verdict coverage')).getByRole('list', { name: 'Legend' }).textContent).toBe('with a verdictwithout a verdict')
    expect(within(chart('Verdict coverage')).getAllByRole('row', { hidden: true }).map((row) => row.textContent)).toEqual([
      'datewith a verdictwithout a verdict', '2026-09-24' + '76', '2026-09-25' + '111', '2026-09-26' + '03', '2026-09-27' + '188',
      '2026-09-28' + '05', '2026-09-29' + '01',
    ])
    // Focus shows what hover shows: the point's values.
    fireEvent.focus(within(chart('Layer ratchet')).getAllByRole('button')[1])
    expect(within(chart('Layer ratchet')).getByRole('tooltip').textContent).toBe('2026-09-23 04:13 · 77 known violations')
  })

  it('clicking a point lists that day\'s PRs or tasks', () => {
    render(<Charts snapshot={snapshot} />)
    fireEvent.click(within(chart('Merges per day')).getByRole('button', { name: '2026-09-29: 1 merged' }))
    expect(links(screen.getByRole('region', { name: 'Merges per day: 2026-09-29' }))).toEqual([
      ['#582 docs(skills): suggest ultracode for investigations, audits and large reviews', `${GITHUB}/pull/582`],
    ])

    fireEvent.click(within(chart('Open tasks by project')).getAllByRole('button')[0])
    const tasks = links(screen.getByRole('region', { name: 'Open tasks by project: 2026-09-25' }))
    expect(tasks).toHaveLength(138)
    expect(tasks).toContainEqual(['foundation · #193', `${GITHUB}/issues/193`])

    // The keyboard picks a point as a click does.
    fireEvent.keyDown(within(chart('Layer ratchet')).getAllByRole('button')[3], { key: 'Enter' })
    expect(links(screen.getByRole('region', { name: 'Layer ratchet: 2026-09-24 13:41' }))).toEqual([
      ['d9ce783 fix(simulation): move multiBitFormat below the UI layer (#180)', `${GITHUB}/commit/d9ce783867491b811fceaf225e3dad54479483da`],
      ['PR #180', `${GITHUB}/pull/180`],
    ])
  })
})
