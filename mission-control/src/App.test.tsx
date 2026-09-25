import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fixture from '../../scripts/fixtures/mission-control/snapshot.json'
import { App } from './App'
import { routeOf } from './route'
import { loadSnapshot, type Freshness, type Snapshot } from './snapshot'

// `collect.mjs --json` at origin/main 561dcf1, 2026-09-25 03:16Z, whole — see scripts/mission-control/collect.logic.test.mjs.
const snapshot = fixture as Snapshot
const GITHUB = 'https://github.com/mezivillager/hacer'

/** A tile's facts as [term, value] pairs: what a reader sees in it, without the markup. */
const facts = (tile: HTMLElement) =>
  [...tile.querySelectorAll('dt')].map((term) => [term.textContent, term.nextElementSibling?.textContent])
/** Navigate the way a link or the address bar does: a new hash, then `hashchange`. */
const go = (hash: string) => act(() => {
  history.replaceState(null, '', hash)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
})

beforeEach(() => history.replaceState(null, '', '#/'))
afterEach(() => vi.unstubAllGlobals())

describe('App', () => {
  it('a section flagged partial or error renders its last-known data with a stale banner; nothing renders blank', async () => {
    // An hour after the fixture: the open-PR call failed (prs keeps the last-known data, dated when it was fetched);
    // releases, optional for metrics, failed (this run's metrics, without them); and the issue list failed with no
    // snapshot to fall back on (portfolio, pickRule and tasks are empty and were never fetched) — as collect.mjs writes it.
    const failed = (name: string, fetchedAt: string | null, error: string): Freshness =>
      ({ source: snapshot.freshness[name].source, fetchedAt, status: 'error', error })
    const issues = 'issues: HTTP 403: API rate limit exceeded'
    const later = '2026-09-25T04:16:09.339Z'
    const stale: Snapshot = {
      ...snapshot,
      generatedAt: later,
      freshness: {
        ...Object.fromEntries(Object.entries(snapshot.freshness).map(([name, record]) => [name, { ...record, fetchedAt: later }])),
        prs: failed('prs', snapshot.generatedAt, 'prsOpen: HTTP 502: Bad Gateway'),
        metrics: { ...snapshot.freshness.metrics, fetchedAt: later, status: 'partial', error: 'releases: HTTP 403: API rate limit exceeded' },
        portfolio: failed('portfolio', null, issues), pickRule: failed('pickRule', null, issues), tasks: failed('tasks', null, issues),
      },
      metrics: { ...snapshot.metrics, releases: [] },
      portfolio: { projects: [] }, pickRule: { next: [] }, tasks: { items: [], byProject: {} },
    }
    render(<App load={async () => stale} />)
    const tile = (name: string) => screen.getByRole('region', { name })
    await screen.findByRole('heading', { name: 'Overview' })

    // Last-known data, under its banner, dated when it was fetched.
    expect(facts(tile('Pull requests'))).toEqual([['open', '4'], ['merging (PASS)', '0']])
    expect(within(tile('Pull requests')).getByText('Stale: prs error — prsOpen: HTTP 502: Bad Gateway')).toBeTruthy()
    expect(within(tile('Pull requests')).getByText('as of 2026-09-25 03:16 UTC')).toBeTruthy()
    // Partial: this run's data, without the input that failed.
    expect(within(tile('Version')).getByText('Stale: metrics partial — releases: HTTP 403: API rate limit exceeded')).toBeTruthy()
    expect(within(tile('Version')).getByText('No releases in the snapshot.')).toBeTruthy()
    expect(facts(tile('Layer ratchet'))).toEqual([['known violations', '71'], ['history', '34 → 77 → 72 → 71']])
    // Nothing last-known: it says so, and shows no zeros it never counted.
    expect(within(tile('Open tasks by project')).getByText(`Stale: tasks error — ${issues}`)).toBeTruthy()
    expect(within(tile('Open tasks by project')).getByText('No data in the snapshot.')).toBeTruthy()
    expect(within(tile('Open tasks by project')).getByText('never fetched')).toBeTruthy()
    expect(facts(tile('Open tasks by project'))).toEqual([])
    // A fresh section shows no banner and this run's time; and no tile is blank.
    expect(within(tile('Last session')).queryByText(/^Stale/)).toBeNull()
    expect(within(tile('Last session')).getByText('as of 2026-09-25 04:16 UTC')).toBeTruthy()
    for (const each of screen.getAllByRole('region')) {
      const said = [...each.querySelectorAll('p')].some((line) => /^No .* in the snapshot\.$/.test(line.textContent ?? ''))
      expect(facts(each).length > 0 || said).toBe(true)
    }
    expect(screen.getAllByText(/^No .* in the snapshot\.$/)).toHaveLength(2)

    // The same in the other views: why there are no rows, never an empty table.
    go('#/projects')
    expect(await screen.findByText('No portfolio rows in the snapshot.')).toBeTruthy()
    expect(screen.getByText(`Stale: portfolio error — ${issues}`)).toBeTruthy()
    expect(screen.getByText(`Stale: pickRule error — ${issues}`)).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    go('#/projects/harness')
    expect(await screen.findByText('No open tasks for harness in the snapshot.')).toBeTruthy()
    expect(screen.getByText(`Stale: tasks error — ${issues}`)).toBeTruthy()

    // And a snapshot that cannot be loaded at all says why.
    render(<App load={() => Promise.reject(new Error('data/snapshot.json: HTTP 404'))} />)
    expect(await screen.findByText('Could not load the snapshot: data/snapshot.json: HTTP 404')).toBeTruthy()
  })

  it('hash routes: #/, #/projects, #/projects/<slug>', async () => {
    expect(['', '#', '#/', '#/nowhere'].map(routeOf)).toEqual(Array(4).fill({ view: 'overview' }))
    expect(['#/projects', '#/projects/'].map(routeOf)).toEqual(Array(2).fill({ view: 'projects' }))
    expect(routeOf('#/projects/mission-control')).toEqual({ view: 'project', slug: 'mission-control' })
    expect(routeOf('#/process')).toEqual({ view: 'process' })

    render(<App load={async () => snapshot} />)
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeTruthy()
    go('#/projects')
    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeTruthy()
    go('#/projects/mission-control')
    expect(await screen.findByRole('heading', { name: /^mission-control #458/ })).toBeTruthy()
    go('#/projects/no-such-project')
    expect(await screen.findByText('No open tasks for no-such-project in the snapshot.')).toBeTruthy()
    go('#/process')
    expect(await screen.findByRole('heading', { name: 'Process' })).toBeTruthy()
    go('#/')
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeTruthy()

    // Every view is one link away, and the header dates the snapshot and names the commit it was taken at.
    const nav = screen.getByRole('navigation')
    expect(within(nav).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['#/', '#/projects', '#/process'])
    expect(screen.getByText(/^Snapshot 2026-09-25 03:16 UTC/)).toBeTruthy()
    expect(screen.getByRole('link', { name: '561dcf1' }).getAttribute('href'))
      .toBe(`${GITHUB}/commit/561dcf13f2f82603bf933778b76e6f605f3785f4`)
  })

  it('loads data/snapshot.json beside the page, and refuses a missing file or another schema', async () => {
    const answer = (status: number, body: unknown) => vi.fn(async () => ({ ok: status === 200, status, json: async () => body }))
    const url = `${import.meta.env.BASE_URL}data/snapshot.json`
    vi.stubGlobal('fetch', answer(200, snapshot))
    await expect(loadSnapshot()).resolves.toBe(snapshot)
    expect(fetch).toHaveBeenCalledWith(url)
    vi.stubGlobal('fetch', answer(404, null))
    await expect(loadSnapshot()).rejects.toThrow(`${url}: HTTP 404`)
    vi.stubGlobal('fetch', answer(200, { ...snapshot, schemaVersion: 2 }))
    await expect(loadSnapshot()).rejects.toThrow('snapshot schema 2: this site reads schema 1')
  })
})
