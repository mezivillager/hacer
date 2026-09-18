import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  DEFAULT_ALLOWLIST,
  FOUNDATION_SLUG,
  formatProjects,
  formatReady,
  parsePortfolio,
  planReady,
  summarizeProjects,
  triageTasks,
} from './backlog.logic.mjs'

// scripts/fixtures/gh-issues.json is a trimmed recording of
//   gh issue list -R mezivillager/hacer --state open --limit 500 --json number,title,labels,author,blockedBy,blocking,parent
// taken 2026-09-18, with two edits the live backlog could not supply: #151 carries `agent-ready`
// (a shaped-but-blocked task) and #227 is filed by `outsider` (an author off the allowlist).
const fixtureIssues = JSON.parse(readFileSync(path.join(import.meta.dirname, 'fixtures', 'gh-issues.json'), 'utf8'))
const livePortfolio = readFileSync(path.join(import.meta.dirname, '..', 'docs', 'portfolio.md'), 'utf8')
const portfolioRows = parsePortfolio(livePortfolio)

/** Minimal issue in the gh JSON shape; every field can be overridden. */
function issue(number, overrides = {}) {
  return {
    number,
    title: `Task ${number}`,
    labels: (overrides.labels ?? ['agent-ready']).map((name) => ({ name })),
    author: { login: overrides.author ?? DEFAULT_ALLOWLIST[0] },
    blockedBy: { nodes: overrides.blockedBy ?? [] },
    blocking: { nodes: overrides.blocking ?? [] },
    parent: overrides.parent ?? null,
  }
}

const numbers = (tasks) => tasks.map((task) => task.number)
const picks = (plan) => numbers(plan.filter((task) => task.reason === null))
const reasonOf = (plan, number) => plan.find((task) => task.number === number).reason

describe('parsePortfolio', () => {
  it('reads every row of the live docs/portfolio.md in file order', () => {
    expect(portfolioRows.map((row) => row.slug)).toEqual([
      'harness', 'spine', 'core', 'verify', 'surfaces', '3d', 'polish', 'bugs', 'upkeep', 'horizon',
    ])
    expect(portfolioRows[0]).toEqual({ rank: 1, slug: 'harness', epicNumber: 138, lane: 'enabler' })
    expect(portfolioRows[1].lane).toBe('spine')
    expect(portfolioRows[9]).toMatchObject({ rank: 10, epicNumber: 147, lane: 'research' })
  })

  it('skips the header, the separator and prose', () => {
    const rows = parsePortfolio(['| # | slug | Project | Epic | Lane | Progress |', '|---|---|---|---|---|---|',
      '| 1 | a | A | [#10](https://example.com/10) | spine | x |', 'not a row | 2 | b |'].join('\n'))
    expect(rows).toEqual([{ rank: 1, slug: 'a', epicNumber: 10, lane: 'spine' }])
  })

  it('handles empty input', () => {
    expect(parsePortfolio('')).toEqual([])
    expect(parsePortfolio(undefined)).toEqual([])
  })
})

describe('triageTasks', () => {
  it('drops epics and keeps every other open issue, by number', () => {
    const tasks = triageTasks(fixtureIssues, portfolioRows)
    expect(numbers(tasks)).not.toContain(138)
    expect(tasks).toHaveLength(fixtureIssues.length - 1)
    expect(numbers(tasks)).toEqual([...numbers(tasks)].sort((a, b) => a - b))
  })

  it('resolves the project from the project:* label', () => {
    const [task] = triageTasks([issue(1, { labels: ['agent-ready', 'project:core'] })], portfolioRows)
    expect(task).toMatchObject({ project: 'core', rank: 3, lane: 'enabler', pickable: true, reason: null })
  })

  it('falls back to the parent epic when there is no project label', () => {
    const [task] = triageTasks([issue(1, { parent: { number: 139, state: 'OPEN' } })], portfolioRows)
    expect(task).toMatchObject({ project: 'spine', pickable: true })
  })

  it('is pickable only when open, agent-ready, unclaimed, unblocked and allowlisted', () => {
    const allowlisted = issue(1, { labels: ['agent-ready', 'project:spine'] })
    expect(triageTasks([allowlisted], portfolioRows)[0].reason).toBeNull()
    expect(triageTasks([allowlisted], portfolioRows, ['someone-else'])[0].reason).toBe('author')
  })

  it.each([
    ['author', { author: 'outsider' }],
    ['in-progress', { labels: ['agent-ready', 'in-progress', 'project:spine'] }],
    ['needs-human', { labels: ['agent-ready', 'needs-human', 'project:spine'] }],
    ['unshaped', { labels: ['project:spine'] }],
    ['unshaped', { labels: ['agent-ready'] }],
    ['blocked:#7', { labels: ['agent-ready', 'project:spine'], blockedBy: [{ number: 7, state: 'OPEN' }] }],
  ])('reports %s', (reason, overrides) => {
    const [task] = triageTasks([issue(1, overrides)], portfolioRows)
    expect(task.pickable).toBe(false)
    expect(task.reason).toBe(reason)
  })

  it('lists every open blocker and ignores closed ones', () => {
    const blockedBy = [{ number: 9, state: 'CLOSED' }, { number: 5, state: 'OPEN' }, { number: 8, state: 'OPEN' }]
    const [task] = triageTasks([issue(1, { labels: ['agent-ready', 'project:spine'], blockedBy })], portfolioRows)
    expect(task.reason).toBe('blocked:#5,#8')
    const [unblocked] = triageTasks(
      [issue(1, { labels: ['agent-ready', 'project:spine'], blockedBy: [{ number: 9, state: 'CLOSED' }] })],
      portfolioRows,
    )
    expect(unblocked.reason).toBeNull()
  })

  it('applies the allowlist over the whole login, not a prefix', () => {
    const [task] = triageTasks([issue(1, { author: 'mezivillager2', labels: ['agent-ready', 'project:spine'] })], portfolioRows)
    expect(task.reason).toBe('author')
  })
})

describe('planReady', () => {
  const plan = planReady(fixtureIssues, portfolioRows)

  it('orders the fixture: foundation first, then 2 spine : 2 enabler : 1 upkeep', () => {
    expect(picks(plan)).toEqual([148, 150, 175, 190, 222, 226])
  })

  it('returns every task once: picks first, then the rest by number', () => {
    expect(numbers(plan)).toEqual([148, 150, 175, 190, 222, 226, 149, 151, 154, 162, 177, 178, 227, 230])
  })

  it.each([
    [149, 'in-progress'],
    [151, 'blocked:#150'],
    [154, 'unshaped'],
    [162, 'needs-human'],
    [177, 'unshaped'],
    [178, 'not-pulled'],
    [227, 'author'],
    [230, 'on-request'],
  ])('explains why #%i is not picked: %s', (number, reason) => {
    expect(reasonOf(plan, number)).toBe(reason)
  })

  it('keeps pickable-but-unpicked tasks marked pickable, for the project counts', () => {
    expect(plan.find((task) => task.number === 178).pickable).toBe(true)
    expect(plan.find((task) => task.number === 230).pickable).toBe(true)
    expect(plan.find((task) => task.number === 151).pickable).toBe(false)
  })

  it('puts a sev:critical bug before everything, even the foundation', () => {
    const issues = [
      issue(1, { labels: ['agent-ready', `project:${FOUNDATION_SLUG}`] }),
      issue(2, { labels: ['agent-ready', 'bug', 'sev:critical', 'project:bugs'] }),
    ]
    expect(picks(planReady(issues, portfolioRows))).toEqual([2, 1])
  })

  it('rotates 2 spine : 2 enabler : 1 upkeep and drains the buckets that outlast the others', () => {
    const spineTask = (n) => issue(n, { labels: ['agent-ready', 'project:spine'] })
    const pulledEnabler = (n, slug) =>
      issue(n, { labels: ['agent-ready', `project:${slug}`], blocking: [{ number: 11, state: 'OPEN' }] })
    const upkeepTask = (n, slug) => issue(n, { labels: ['agent-ready', `project:${slug}`] })
    const issues = [
      spineTask(11), spineTask(12), spineTask(13),
      pulledEnabler(21, 'core'), pulledEnabler(22, 'verify'), pulledEnabler(23, 'surfaces'),
      upkeepTask(31, 'bugs'), upkeepTask(32, 'upkeep'), upkeepTask(33, 'upkeep'),
    ]
    expect(picks(planReady(issues, portfolioRows))).toEqual([11, 12, 21, 22, 31, 13, 23, 32, 33])
  })

  it('orders an enabler bucket by portfolio rank, then issue number', () => {
    const pulled = (n, slug) =>
      issue(n, { labels: ['agent-ready', `project:${slug}`], blocking: [{ number: 1, state: 'OPEN' }] })
    const issues = [issue(1, { labels: ['agent-ready', 'project:spine'] }), pulled(5, '3d'), pulled(6, 'core'), pulled(4, 'core')]
    expect(picks(planReady(issues, portfolioRows))).toEqual([1, 4, 6, 5])
  })

  it('an enabler that blocks only a closed or non-spine issue is not pulled', () => {
    const issues = [
      issue(1, { labels: ['agent-ready', 'project:spine'] }),
      issue(2, { labels: ['agent-ready', 'project:core'], blocking: [{ number: 1, state: 'CLOSED' }] }),
      issue(3, { labels: ['agent-ready', 'project:verify'], blocking: [{ number: 2, state: 'OPEN' }] }),
    ]
    const plan = planReady(issues, portfolioRows)
    expect(picks(plan)).toEqual([1])
    expect(reasonOf(plan, 2)).toBe('not-pulled')
    expect(reasonOf(plan, 3)).toBe('not-pulled')
  })

  it('never picks polish or horizon', () => {
    const issues = [
      issue(1, { labels: ['agent-ready', 'project:polish'] }),
      issue(2, { labels: ['agent-ready', 'project:horizon'] }),
    ]
    const plan = planReady(issues, portfolioRows)
    expect(picks(plan)).toEqual([])
    expect(reasonOf(plan, 1)).toBe('on-request')
    expect(reasonOf(plan, 2)).toBe('on-request')
  })

  it('honours a custom allowlist', () => {
    const issues = [issue(1, { author: 'bot', labels: ['agent-ready', 'project:spine'] })]
    expect(picks(planReady(issues, portfolioRows))).toEqual([])
    expect(picks(planReady(issues, portfolioRows, ['bot']))).toEqual([1])
  })
})

describe('summarizeProjects', () => {
  const summaries = summarizeProjects(fixtureIssues, portfolioRows)
  const rowFor = (slug) => summaries.find((summary) => summary.slug === slug)

  it('emits one summary per portfolio row, in file order', () => {
    expect(summaries.map((summary) => summary.slug)).toEqual(portfolioRows.map((row) => row.slug))
  })

  it('counts open, ready, in-progress and needs-human per project', () => {
    expect(rowFor('harness')).toMatchObject({ epicNumber: 138, open: 6, ready: 2, inProgress: 1, needsHuman: 1 })
    expect(rowFor('core')).toMatchObject({ open: 2, ready: 2, inProgress: 0, needsHuman: 0 })
    expect(rowFor('upkeep')).toMatchObject({ open: 2, ready: 1 })
    expect(rowFor('verify')).toMatchObject({ open: 0, ready: 0, next: null })
  })

  it('names the next pick per project in pick order, falling back to the first pickable task', () => {
    expect(rowFor('harness').next).toEqual({ number: 148, title: expect.stringContaining('Bootstrap the backlog') })
    expect(rowFor('core').next.number).toBe(190)
    expect(rowFor('horizon').next.number).toBe(230)
  })
})

describe('formatReady', () => {
  it('prints `#number · project · title`, a blank line, then the rest with a trailing reason', () => {
    const lines = formatReady(planReady(fixtureIssues, portfolioRows)).split('\n')
    expect(lines[0]).toMatch(/^#148 · harness · Bootstrap the backlog/)
    expect(lines[5]).toMatch(/^#226 · upkeep · /)
    expect(lines[6]).toBe('')
    expect(lines[7]).toMatch(/^#149 · harness · .* · in-progress$/)
    expect(lines.at(-1)).toMatch(/^#230 · horizon · .* · on-request$/)
    expect(lines).toHaveLength(15)
  })

  it('prints nothing for an empty backlog', () => {
    expect(formatReady([])).toBe('')
  })
})

describe('formatProjects', () => {
  it('prints one greppable line per row with counts and the next pick', () => {
    const lines = formatProjects(summarizeProjects(fixtureIssues, portfolioRows)).split('\n')
    expect(lines).toHaveLength(portfolioRows.length)
    expect(lines[0]).toMatch(/^harness · open 6 · ready 2 · in-progress 1 · needs-human 1 · next: #148 Bootstrap the backlog/)
    expect(lines[3]).toBe('verify · open 0 · ready 0 · in-progress 0 · needs-human 0 · next: —')
  })
})
