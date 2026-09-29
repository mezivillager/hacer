import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import fixture from '../../scripts/fixtures/mission-control/snapshot-2026-09-29.json'
import { Roadmap } from './Roadmap'
import type { Snapshot } from './snapshot'

const snapshot = fixture as unknown as Snapshot
const BLOB = 'https://github.com/mezivillager/hacer/blob/main'

describe('Roadmap', () => {
  it('Roadmap renders the active and future phases from docs/roadmap with the file\'s last-updated date', () => {
    render(<Roadmap snapshot={snapshot} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Roadmap' })).toBeTruthy()
    // The README's own date, and how far behind the snapshot it is: 2026-05-12 to 2026-09-29.
    expect(screen.getByText('Last updated 2026-05-12 · 140 days before this snapshot')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'docs/roadmap/README.md' }).getAttribute('href')).toBe(`${BLOB}/docs/roadmap/README.md`)

    const active = screen.getByRole('table', { name: 'Active Phase Sequence' })
    const rows = within(active).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell').map((cell) => cell.textContent))
    expect(rows).toHaveLength(10)
    expect(rows[2]).toEqual(['0.5', 'In progress', 'Project 1 chips, buses, HDL, `.tst`/`.cmp`, chip workflow UI'])
    expect(within(active).getByRole('link', { name: '0.5' }).getAttribute('href'))
      .toBe(`${BLOB}/docs/roadmap/phases/phase-0.5-nand2tetris-foundation.md`)

    const future = screen.getByRole('table', { name: 'Future Platform Phases' })
    expect(within(future).getAllByRole('row')).toHaveLength(21)
    expect(within(future).getAllByRole('link', { name: '7' })[0].getAttribute('href'))
      .toBe(`${BLOB}/docs/roadmap/phases/phase-7-ai-integration.md`)
  })

  it('says so when the README states no date', () => {
    render(<Roadmap snapshot={{ ...snapshot, roadmap: { lastUpdated: null, phases: [] } }} />)
    expect(screen.getByText('The roadmap states no last-updated date.')).toBeTruthy()
    expect(screen.getByText('No phases in the snapshot.')).toBeTruthy()
  })
})
