import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import fixture from '../../scripts/fixtures/mission-control/snapshot.json'
import { Overview } from './Overview'
import type { Snapshot } from './snapshot'

// `collect.mjs --json` at origin/main 561dcf1, 2026-09-25 03:16Z, whole — see scripts/mission-control/collect.logic.test.mjs.
const snapshot = fixture as Snapshot
const GITHUB = 'https://github.com/mezivillager/hacer'

/** A tile's facts as [term, value] pairs: what a reader sees in it, without the markup. */
const facts = (tile: HTMLElement) =>
  [...tile.querySelectorAll('dt')].map((term) => [term.textContent, term.nextElementSibling?.textContent])

describe('Overview', () => {
  it('Overview renders the tiles: open tasks by project, PRs open/merging, last session, CI on main, ratchet count, version, verdict coverage — each with generatedAt shown', () => {
    render(<Overview snapshot={snapshot} />)
    const tile = (name: string) => screen.getByRole('region', { name })

    // The golden numbers, pinned from the fixture: a change here is a change in what the site tells people.
    expect(facts(tile('Open tasks by project'))).toEqual([
      ['open tasks', '142'], ['foundation', '38'], ['harness', '31'], ['spine', '15'], ['core', '9'], ['verify', '9'],
      ['mission-control', '8'], ['pubdocs', '7'], ['lineage', '6'], ['3d', '5'], ['upkeep', '5'], ['horizon', '4'],
      ['surfaces', '4'], ['bugs', '1'],
    ])
    expect(facts(tile('Pull requests'))).toEqual([['open', '4'], ['merging (PASS)', '0']])
    expect(facts(tile('Last session'))).toEqual([[
      '2026-09-24 · record',
      'Session record — 2026-09-24: four merges, and a defect class that keeps being caught by tools rather than readers',
    ]])
    expect(facts(tile('CI on main'))).toEqual([['status', 'not collected until MC-6']])
    expect(facts(tile('Layer ratchet'))).toEqual([['known violations', '71'], ['history', '34 → 77 → 72 → 71']])
    expect(facts(tile('Version'))).toEqual([['latest release', 'v2.33.1'], ['published', '2026-09-25 00:08 UTC']])
    expect(facts(tile('Verdict coverage'))).toEqual([
      ['merged PRs', '60'], ['with a verdict', '33 (55%)'], ['latest PASS', '32'], ['latest BLOCK', '1'],
    ])

    // Each tile is dated by its section; every section is ok here, so each shows the snapshot's generatedAt.
    const tiles = screen.getAllByRole('region')
    expect(tiles).toHaveLength(7)
    for (const each of tiles) expect(within(each).getByText('as of 2026-09-25 03:16 UTC')).toBeTruthy()
    expect(screen.queryByText(/^Stale/)).toBeNull()

    // Each tile's title opens what it summarises on GitHub; a session and a release open themselves.
    expect(tiles.map((each) => within(each).getByRole('heading').querySelector('a')?.getAttribute('href'))).toEqual([
      `${GITHUB}/issues`, `${GITHUB}/pulls`, `${GITHUB}/tree/main/docs/harness/sessions`,
      `${GITHUB}/actions/workflows/ci.yml?query=branch%3Amain`,
      `${GITHUB}/blob/main/.dependency-cruiser-known-violations.json`, `${GITHUB}/releases`,
      `${GITHUB}/pulls?q=is%3Apr+is%3Amerged`,
    ])
    expect(within(tile('Last session')).getByRole('link', { name: /^Session record/ }).getAttribute('href'))
      .toBe(`${GITHUB}/blob/main/docs/harness/sessions/2026-09-24.md`)
    expect(within(tile('Version')).getByRole('link', { name: 'v2.33.1' }).getAttribute('href'))
      .toBe(`${GITHUB}/releases/tag/v2.33.1`)
  })
})
