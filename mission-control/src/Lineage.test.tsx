import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import graph from '../../scripts/fixtures/mission-control/lineage-graph.json'
import fixture from '../../scripts/fixtures/mission-control/snapshot.json'
import { Lineage } from './Lineage'
import type { Snapshot } from './snapshot'

const snapshot = { ...fixture, lineage: graph } as unknown as Snapshot
const GITHUB = 'https://github.com/mezivillager/hacer'
const node = (id: string) => screen.getByRole('button', { name: new RegExp(`^${id}\\b`) })

describe('Lineage', () => {
  it("renders the graph from the snapshot's lineage section", () => {
    const { container } = render(<Lineage snapshot={snapshot} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Lineage' })).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(15)
    expect(node('ADR-0020').getAttribute('data-kind')).toBe('adr')
    expect(node('R398').getAttribute('data-kind')).toBe('ruling')
    expect(node('P-001').getAttribute('data-kind')).toBe('premise')
    expect(container.querySelectorAll('path.edge')).toHaveLength(13)
  })

  it('clicking a node shows trace and radius; artefacts link to GitHub', async () => {
    render(<Lineage snapshot={snapshot} />)
    await userEvent.click(node('ADR-0020'))
    const detail = screen.getByRole('region', { name: 'ADR-0020' })
    const trace = within(within(detail).getByRole('list', { name: 'Rests on' }))
    expect(trace.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('ADR-0008'), expect.stringContaining('ADR-0009'),
    ])
    const radius = within(within(detail).getByRole('list', { name: 'What rests on it' }))
    expect(radius.getByText('ADR-0022')).toBeTruthy()
    expect(radius.getByText('R769')).toBeTruthy()
    expect(within(detail).getByRole('link', { name: '#318' }).getAttribute('href')).toBe(`${GITHUB}/issues/318`)
    expect(within(detail).getByRole('link', { name: 'docs/decisions/0020-spec-only-writes-read-only-projections.md' }).getAttribute('href'))
      .toBe(`${GITHUB}/blob/main/docs/decisions/0020-spec-only-writes-read-only-projections.md`)
  })

  it('an expired premise is visibly marked', async () => {
    render(<Lineage snapshot={snapshot} />)
    expect(node('P-001').getAttribute('aria-label')).toMatch(/expired/)
    expect(node('P-001').getAttribute('data-expired')).toBe('true')
    await userEvent.click(node('R398'))
    const trace = within(screen.getByRole('list', { name: 'Rests on' }))
    expect(trace.getByText(/P-001/).closest('li')?.textContent).toMatch(/expired 2026-09-22/)
    expect(trace.getByText(/P-001/).closest('li')?.getAttribute('data-expired')).toBe('true')
  })
})
