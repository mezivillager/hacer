import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import fixture from '../../scripts/fixtures/mission-control/snapshot.json'
import { Process } from './Process'
import type { Snapshot } from './snapshot'

// `collect.mjs --json` at origin/main 561dcf1, 2026-09-25 03:16Z — see scripts/mission-control/collect.logic.test.mjs.
const snapshot = fixture as Snapshot
const GITHUB = 'https://github.com/mezivillager/hacer'

describe('Process', () => {
  it('renders stages ready → claimed → building → PR → verifying → merged with counts from the snapshot', () => {
    render(<Process snapshot={snapshot} />)
    const stage = (label: RegExp) => screen.getByRole('button', { name: label })
    expect(stage(/^Ready: 47 ready$/)).toBeTruthy()
    expect(stage(/^Claimed: 5 claimed$/)).toBeTruthy()
    expect(stage(/^Building: 4 building$/)).toBeTruthy()
    expect(stage(/^PR: 4 open$/)).toBeTruthy()
    expect(stage(/^Verifying: 4 no verdict · 0 with verdict$/)).toBeTruthy()
    expect(stage(/^Merged \(7d\): 60 merged$/)).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(6)
  })

  it('each stage drills into its items', async () => {
    render(<Process snapshot={snapshot} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /^Building: /}))
    const list = await screen.findByRole('list', { name: 'Building items' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(4)
    expect(items[0].textContent).toBe('#182 Completed-chip tracking moves out of the engine into session state (no localStorage in src/core)')
    expect(within(list).getByRole('link', { name: '#182' }).getAttribute('href')).toBe(`${GITHUB}/issues/182`)

    // Clicking the same stage again closes it.
    await user.click(screen.getByRole('button', { name: /^Building: /}))
    expect(screen.queryByRole('list', { name: 'Building items' })).toBeNull()

    // A different stage drills into PRs instead.
    await user.click(screen.getByRole('button', { name: /^PR: /}))
    const prList = await screen.findByRole('list', { name: 'PR items' })
    expect(within(prList).getAllByRole('listitem')).toHaveLength(4)
    expect(within(prList).getByRole('link', { name: '#499' }).getAttribute('href')).toBe(`${GITHUB}/pull/499`)
  })

  it('claims are joined to issue state; a ref on a closed issue is flagged', () => {
    // The fixture's five claims are all on open issues today (#474) — flip one to show the flag.
    const flagged: Snapshot = {
      ...snapshot,
      claims: {
        items: snapshot.claims.items.map((claim) => (claim.number === 403 ? { ...claim, state: 'CLOSED', onClosedIssue: true } : claim)),
        onClosedIssues: 1,
      },
    }
    render(<Process snapshot={flagged} />)
    const table = screen.getByRole('table', { name: 'Claims' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(5)

    const row403 = rows.find((row) => within(row).queryByRole('link', { name: '#403' }))!
    expect(within(row403).getByText(/stale: ref on a closed issue/)).toBeTruthy()
    expect(within(row403).getByText('CLOSED')).toBeTruthy()
    expect(within(row403).getAllByRole('cell').map((cell) => cell.textContent)[2]).toBe('—') // no claim comment on #403

    // Every other row is unflagged, and still joined to its issue state and claim comment.
    for (const row of rows.filter((row) => row !== row403)) expect(within(row).queryByText(/stale/)).toBeNull()
    const row473 = rows.find((row) => within(row).queryByRole('link', { name: '#473' }))!
    expect(within(row473).getByText('OPEN')).toBeTruthy()
    expect(within(row473).getByText('claude-local')).toBeTruthy()
  })

  it("the cloud lane's rows render with status and agent id, linked to their issues", () => {
    render(<Process snapshot={snapshot} />)
    const table = screen.getByRole('table', { name: 'Cloud lane' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(8)
    expect(within(rows[0]).getByRole('link', { name: '#193' }).getAttribute('href')).toBe(`${GITHUB}/issues/193`)
    expect(within(rows[0]).getAllByRole('cell').map((cell) => cell.textContent))
      .toEqual(['#193', 'building', 'claimed-by-grok-bot', 'bc-6de621f1-8e3c-50c5-9115-64ca2687696e'])
    // A queued, unclaimed row shows its status and no agent id yet — never a blank cell.
    expect(within(rows[1]).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['#338', 'queued', 'unclaimed', '—'])
  })
})
