import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import fixture from '../../scripts/fixtures/mission-control/snapshot-2026-09-29.json'
import { Ledger } from './Ledger'
import type { Snapshot } from './snapshot'

const snapshot = fixture as unknown as Snapshot
const BLOB = 'https://github.com/mezivillager/hacer/blob/main'
const ids = () => within(screen.getByRole('table', { name: 'Ledger' })).getAllByRole('row').slice(1)
  .map((row) => within(row).getAllByRole('cell')[0].textContent)

describe('Ledger', () => {
  it('Ledger renders rows filterable by Mechanised (yes / no / partly)', () => {
    render(<Ledger snapshot={snapshot} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Ledger' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'docs/harness/ledger.md' }).getAttribute('href')).toBe(`${BLOB}/docs/harness/ledger.md`)
    expect(ids()).toHaveLength(57)
    expect(ids()[0]).toBe('L001')
    expect(screen.getByText('Showing 57 of 57')).toBeTruthy()

    const filter = screen.getByRole('combobox', { name: 'Mechanised' })
    // Each filter shows exactly the rows the collector counted under it.
    for (const kind of ['yes', 'no', 'partly'] as const) {
      fireEvent.change(filter, { target: { value: kind } })
      const count = snapshot.ledger.byMechanised[kind]
      expect(ids()).toHaveLength(count)
      expect(screen.getByText(`Showing ${count} of 57`)).toBeTruthy()
      const cells = within(screen.getByRole('table', { name: 'Ledger' })).getAllByRole('row').slice(1)
        .map((row) => within(row).getAllByRole('cell')[3].textContent?.toLowerCase())
      expect(cells.every((cell) => cell?.startsWith(kind))).toBe(true)
    }
    fireEvent.change(filter, { target: { value: 'no' } })
    expect(ids()[0]).toBe('L001') // "no — #153"

    fireEvent.change(filter, { target: { value: 'all' } })
    expect(ids()).toHaveLength(57)
  })

  it('says so when the filter leaves no row', () => {
    render(<Ledger snapshot={{ ...snapshot, ledger: { items: [], byMechanised: {} } }} />)
    expect(screen.getByText('No ledger rows in the snapshot.')).toBeTruthy()
  })
})
