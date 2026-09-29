import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import fixture from '../../scripts/fixtures/mission-control/snapshot-2026-09-29.json'
import { Ledger } from './Ledger'
import { Process } from './Process'
import type { Snapshot } from './snapshot'

// Explicit timeout, not the 5 s default: a full-snapshot mount measured several seconds under load.
const SLOW_MOUNT_TIMEOUT_MS = 20000
const NEW_ISSUE = 'https://github.com/mezivillager/hacer/issues/new?template=process-improvement.yml'
const red = { pr: 410, sha: 'a'.repeat(40), check: 'pr-hygiene', conclusion: 'FAILURE', completedAt: null, url: null,
  line: 'HYGIENE: BLOCK', verdict: 'BLOCK', fields: {}, disagrees: false }
const snapshot = { ...(fixture as unknown as Snapshot), checks: { items: [...(fixture as unknown as Snapshot).checks.items, red] } } as Snapshot
const queue = (scope: HTMLElement) => within(scope).getAllByRole('link', { name: /queue an improvement/i })

describe('queue an improvement', () => {
  it('a "queue an improvement" action exists on ledger rows, stale claims, red checks and the Process view', () => {
    const { unmount } = render(<Ledger snapshot={snapshot} />)
    const rows = within(screen.getByRole('table', { name: 'Ledger' })).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(57)
    for (const row of rows) expect(queue(row)[0].getAttribute('href')).toContain(NEW_ISSUE)
    unmount()

    render(<Process snapshot={snapshot} />)
    const stale = snapshot.claims.items.filter((claim) => claim.onClosedIssue)
    expect(stale.length).toBeGreaterThan(0)
    const claimRows = within(screen.getByRole('table', { name: 'Claims' })).getAllByRole('row').slice(1)
    const staleRows = claimRows.filter((row) => /stale: ref on a closed issue/.test(row.textContent ?? ''))
    expect(staleRows).toHaveLength(stale.length)
    for (const row of staleRows) expect(queue(row)[0].getAttribute('href')).toContain(NEW_ISSUE)

    const checkRows = within(screen.getByRole('table', { name: 'Red checks' })).getAllByRole('row').slice(1)
    expect(checkRows).toHaveLength(1)
    expect(decodeURIComponent(queue(checkRows[0])[0].getAttribute('href') ?? '')).toContain('#410')

    // The Process view's own action sits outside every table.
    const general = screen.getByRole('link', { name: 'Queue an improvement' })
    expect(general.closest('table')).toBeNull()
    expect(general.getAttribute('href')).toContain(NEW_ISSUE)
  }, SLOW_MOUNT_TIMEOUT_MS)
})
