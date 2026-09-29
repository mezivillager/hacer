import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import fixture from '../../scripts/fixtures/mission-control/snapshot-2026-09-29.json'
import { Adrs } from './Adrs'
import type { Snapshot } from './snapshot'

const snapshot = fixture as unknown as Snapshot
const BLOB = 'https://github.com/mezivillager/hacer/blob/main'
const row = (number: string) => within(screen.getByRole('table', { name: 'ADRs' })).getByRole('link', { name: number }).closest('tr')!

describe('ADRs', () => {
  it('ADRs render with Status parsed from the Status bullet', () => {
    render(<Adrs snapshot={snapshot} />)
    expect(screen.getByRole('heading', { level: 2, name: 'ADRs' })).toBeTruthy()
    expect(within(screen.getByRole('table', { name: 'ADRs' })).getAllByRole('row')).toHaveLength(22)

    const cells = (number: string) => within(row(number)).getAllByRole('cell').map((cell) => cell.textContent)
    expect(cells('0019')).toEqual(['0019', 'Canvas-less shell mode selected by `?renderer=none`', 'Accepted'])
    expect(within(row('0019')).getByRole('link', { name: '0019' }).getAttribute('href'))
      .toBe(`${BLOB}/docs/decisions/0019-canvas-less-shell-mode.md`)
    // A long Status shows its verdict; the whole line stays one hover away.
    expect(cells('0007')[2]).toBe('Superseded by ADR-0020')
    expect(within(row('0007')).getByText('Superseded by ADR-0020').getAttribute('title')).toMatch(/^Superseded by \[ADR-0020\].*no drag/)
  })

  it('shows a dash for an ADR whose Status line is missing', () => {
    const adrs = { items: [{ number: 5, file: 'docs/decisions/0005-x.md', title: null, status: null }] }
    render(<Adrs snapshot={{ ...snapshot, adrs }} />)
    expect(within(row('0005')).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['0005', '0005-x', '—'])
  })
})
