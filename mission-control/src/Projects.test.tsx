import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import fixture from '../../scripts/fixtures/mission-control/snapshot.json'
import { App } from './App'
import type { Snapshot } from './snapshot'

// `collect.mjs --json` at origin/main 561dcf1, 2026-09-25 03:16Z, whole — see scripts/mission-control/collect.logic.test.mjs.
const snapshot = fixture as Snapshot
const GITHUB = 'https://github.com/mezivillager/hacer'

/** "next" per row, as `backlog.mjs ready` put it for this fixture: its first pick for the row and that pick's place in
 *  the whole order, else why none. Four rows have a portfolio `next` that ready never picks (#206, #263, #371, #230). */
const NEXT = {
  foundation: '#193 · pick 1', harness: '#148 · pick 3', surfaces: 'none: on-request', pubdocs: 'none: on-request',
  core: 'none: not-pulled', verify: 'none ready', spine: '#175 · pick 6', '3d': 'none ready', polish: 'none ready',
  bugs: 'none ready', upkeep: '#253 · pick 8', horizon: 'none: on-request', lineage: '#467 · pick 2',
  'mission-control': '#477 · pick 5',
}

beforeEach(() => history.replaceState(null, '', '#/projects'))

describe('Projects', () => {
  it('Projects renders the portfolio rows with progress and "next" exactly as the snapshot\'s ready section says; a row drills into its tasks; every row links to GitHub', async () => {
    render(<App load={async () => snapshot} />)
    const table = await screen.findByRole('table', { name: 'Projects' })
    const rows = within(table).getAllByRole('row').slice(1) // the header row first
    const cells = rows.map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent))

    // One row per portfolio row, in its order: rank, project and epic, lane, the epic's progress, the counts.
    expect(cells.map((row) => row.slice(0, 8))).toEqual(snapshot.portfolio.projects.map((project) => [
      String(project.rank), `${project.slug} #${project.epicNumber}`, project.lane,
      `${project.subIssues?.completed}/${project.subIssues?.total} (${project.subIssues?.percentCompleted}%)`,
      String(project.open), String(project.ready), String(project.inProgress), String(project.needsHuman),
    ]))
    expect(cells[0].slice(0, 4)).toEqual(['1', 'foundation #318', 'feature', '12/32 (37%)'])

    // "next" is ready's pick, never the portfolio row's own first pickable task.
    expect(Object.fromEntries(snapshot.portfolio.projects.map((project, index) =>
      [project.slug, cells[index][8]?.split(' · ').slice(0, 2).join(' · ')]))).toEqual(NEXT)
    for (const { slug } of snapshot.portfolio.projects) {
      const pick = snapshot.pickRule.next.find((task) => task.project === slug)
      expect(cells[snapshot.portfolio.projects.findIndex((project) => project.slug === slug)][8])
        .toBe(pick ? `${NEXT[slug as keyof typeof NEXT]} · ${pick.title}` : NEXT[slug as keyof typeof NEXT])
    }

    // Every row links to its epic on GitHub, and a pick to its issue.
    for (const [index, row] of rows.entries()) {
      const hrefs = within(row).getAllByRole('link').map((link) => link.getAttribute('href'))
      expect(hrefs).toContain(`${GITHUB}/issues/${snapshot.portfolio.projects[index].epicNumber}`)
    }
    expect(within(rows[0]).getByRole('link', { name: '#193' }).getAttribute('href')).toBe(`${GITHUB}/issues/193`)

    // A row drills into its tasks, in ready's order: its picks first, then the rest with ready's reason.
    await userEvent.setup().click(within(rows[1]).getByRole('link', { name: 'harness' }))
    const list = await screen.findByRole('list', { name: 'harness tasks' })
    const items = within(list).getAllByRole('listitem')
    const harness = snapshot.tasks.items.filter((task) => task.project === 'harness')
    const place = (number: number) => snapshot.pickRule.next.findIndex((task) => task.number === number) + 1
    expect(items.map((item) => item.textContent)).toEqual(harness.map((task) =>
      `#${task.number} · ${task.reason ?? `pick ${place(task.number)}`} · ${task.title}`))
    expect(items[0].textContent).toBe(`#148 · pick 3 · ${harness[0].title}`)
    expect(items.filter((item) => / · pick \d+ · /.test(item.textContent ?? ''))).toHaveLength(23) // harness has 23 picks, then 8 held
    for (const [index, item] of items.entries()) {
      expect(within(item).getByRole('link').getAttribute('href')).toBe(`${GITHUB}/issues/${harness[index].number}`)
    }
    expect(screen.getByRole('heading', { name: /^harness/ }).querySelector('a')?.getAttribute('href')).toBe(`${GITHUB}/issues/138`)
  })
})
