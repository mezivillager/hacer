import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  AUX_ROTATION,
  DEFAULT_ALLOWLIST,
  DESIGN_FIRST_SLUGS,
  PICK_ROTATION,
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
// #188, #193, #206, #210, #211 and #263 were recorded later the same day (#259) so that every
// rotation bucket has a pickable task, `pubdocs` shares the `surfaces` slot, and a `core` ADR
// (#188) is pulled by a `surfaces` task (#211).
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

/** An open, agent-ready issue of `slug`, optionally blocking or blocked by other issues. */
const open = (number, slug, { blocking = [], blockedBy = [], research = false } = {}) =>
  issue(number, {
    labels: ['agent-ready', `project:${slug}`, ...(research ? ['research'] : [])],
    blocking: blocking.map((n) => ({ number: n, state: 'OPEN' })),
    blockedBy: blockedBy.map((n) => ({ number: n, state: 'OPEN' })),
  })

const numbers = (tasks) => tasks.map((task) => task.number)
const picks = (plan) => numbers(plan.filter((task) => task.reason === null))
const reasonOf = (plan, number) => plan.find((task) => task.number === number).reason

describe('parsePortfolio', () => {
  it('reads every row of the live docs/portfolio.md in file order', () => {
    expect(portfolioRows.map((row) => row.slug)).toEqual([
      'harness', 'surfaces', 'pubdocs', 'core', 'verify', 'spine', '3d', 'polish', 'bugs', 'upkeep', 'horizon',
    ])
    expect(portfolioRows[0]).toEqual({ rank: 1, slug: 'harness', epicNumber: 138, lane: 'process' })
    expect(portfolioRows[1]).toEqual({ rank: 2, slug: 'surfaces', epicNumber: 142, lane: 'feature' })
    expect(portfolioRows[2]).toEqual({ rank: 3, slug: 'pubdocs', epicNumber: 260, lane: 'feature' })
    expect(portfolioRows.filter((row) => row.lane === 'enabler').map((row) => row.slug)).toEqual(['core', '3d'])
    expect(portfolioRows.filter((row) => row.lane === 'aux').map((row) => row.slug)).toEqual(['verify', 'bugs', 'upkeep'])
    expect(portfolioRows[10]).toMatchObject({ rank: 11, epicNumber: 147, lane: 'research' })
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

describe('the rotation constants', () => {
  it('mirror the literal cycle and aux order written in docs/portfolio.md', () => {
    expect(PICK_ROTATION).toEqual(['surfaces', 'harness', 'spine', 'aux', 'surfaces', 'harness'])
    expect(AUX_ROTATION).toEqual(['verify', 'upkeep', 'bugs'])
    expect(livePortfolio).toContain(`\`${PICK_ROTATION.join(' → ')}\``)
    expect(livePortfolio).toContain(`\`${AUX_ROTATION.join(' → ')}\``)
    expect(DESIGN_FIRST_SLUGS).toEqual(['surfaces', 'core'])
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
    expect(task).toMatchObject({ project: 'core', rank: 4, lane: 'enabler', pickable: true, reason: null })
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

  it('orders the fixture: surfaces → harness → spine → aux → surfaces → harness, skipping drained slots', () => {
    // round 1: #188 (core ADR pulled by #211, design first) · #148 · #190 (core ADR pulled by #177) · #193 (verify) · #210 · #150
    // round 2: #206 · harness drained · #175 · #226 (upkeep) · #263 (pubdocs shares the surfaces slot) · harness drained
    // round 3: only aux is left → #222 (bugs)
    expect(picks(plan)).toEqual([188, 148, 190, 193, 210, 150, 206, 175, 226, 263, 222])
  })

  it('returns every task once: picks first, then the rest by number', () => {
    expect(numbers(plan)).toEqual([
      188, 148, 190, 193, 210, 150, 206, 175, 226, 263, 222,
      149, 151, 154, 162, 177, 178, 211, 227, 230,
    ])
  })

  it.each([
    [149, 'in-progress'],
    [151, 'blocked:#150'],
    [154, 'unshaped'],
    [162, 'needs-human'],
    [177, 'unshaped'],
    [178, 'not-pulled'],
    [211, 'unshaped'],
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

  it('puts a sev:critical bug before everything, even the first surfaces slot', () => {
    const issues = [
      open(1, 'surfaces'),
      issue(2, { labels: ['agent-ready', 'bug', 'sev:critical', 'project:bugs'] }),
    ]
    expect(picks(planReady(issues, portfolioRows))).toEqual([2, 1])
  })

  it('cycles the six slots, rotates aux in turn, and skips a slot whose bucket is empty', () => {
    const issues = [
      open(11, 'surfaces'), open(12, 'surfaces'), open(13, 'surfaces'),
      open(21, 'harness'), open(22, 'harness'), open(23, 'harness'),
      open(31, 'spine'),
      open(41, 'verify'), open(51, 'upkeep'), open(52, 'upkeep'), open(61, 'bugs'),
    ]
    // round 1: 11 21 31 41 12 22 · round 2: 13 23 (no spine) 51 (no surfaces) (no harness)
    // round 3: aux → bugs 61 · round 4: aux → verify is empty → upkeep 52
    expect(picks(planReady(issues, portfolioRows))).toEqual([11, 21, 31, 41, 12, 22, 13, 23, 51, 61, 52])
  })

  it('aux skips an empty bucket and carries on in turn from the one it used', () => {
    const issues = [open(1, 'upkeep'), open(2, 'upkeep'), open(3, 'bugs')]
    expect(picks(planReady(issues, portfolioRows))).toEqual([1, 3, 2])
  })

  it('a surfaces slot takes the oldest pickable surfaces or pubdocs task', () => {
    const issues = [open(5, 'surfaces'), open(3, 'pubdocs'), open(7, 'surfaces'), open(1, 'harness')]
    expect(picks(planReady(issues, portfolioRows))).toEqual([3, 1, 5, 7])
  })

  it('ranks research surfaces/core tasks before the rest inside a slot (design first), then by number', () => {
    const issues = [
      open(2, 'surfaces'), open(6, 'surfaces', { research: true }),
      open(8, 'core', { research: true, blocking: [9] }), open(9, 'surfaces', { blockedBy: [8] }),
      open(1, 'spine', { research: true }), open(3, 'spine'),
    ]
    expect(picks(planReady(issues, portfolioRows))).toEqual([6, 1, 8, 2, 3])
  })

  it('an enabler is pulled by an open task in any bucket and takes a slot of that bucket', () => {
    const issues = [
      open(1, 'spine'),
      open(8, 'surfaces', { blockedBy: [9] }), open(9, 'core', { blocking: [8] }),
      open(7, 'upkeep', { blockedBy: [10] }), open(10, '3d', { blocking: [7] }),
    ]
    const plan = planReady(issues, portfolioRows)
    expect(picks(plan)).toEqual([9, 1, 10])
    expect(reasonOf(plan, 8)).toBe('blocked:#9')
    expect(reasonOf(plan, 7)).toBe('blocked:#10')
  })

  it('an enabler blocking tasks in several buckets takes the earliest slot in the cycle', () => {
    const issues = [
      open(4, 'harness'),
      open(2, 'spine', { blockedBy: [5] }), open(3, 'surfaces', { blockedBy: [5] }),
      open(5, 'core', { blocking: [2, 3] }),
    ]
    expect(picks(planReady(issues, portfolioRows))).toEqual([5, 4])
  })

  it('an enabler that blocks only a closed, enabler or on-request issue is not pulled', () => {
    const issues = [
      open(1, 'spine'),
      issue(2, { labels: ['agent-ready', 'project:core'], blocking: [{ number: 1, state: 'CLOSED' }] }),
      open(3, '3d', { blocking: [2] }),
      open(4, 'core', { blocking: [6] }), open(6, 'polish', { blockedBy: [4] }),
    ]
    const plan = planReady(issues, portfolioRows)
    expect(picks(plan)).toEqual([1])
    expect(reasonOf(plan, 2)).toBe('not-pulled')
    expect(reasonOf(plan, 3)).toBe('not-pulled')
    expect(reasonOf(plan, 4)).toBe('not-pulled')
    expect(reasonOf(plan, 6)).toBe('blocked:#4')
  })

  it('never picks polish or horizon', () => {
    const issues = [open(1, 'polish'), open(2, 'horizon')]
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
    expect(rowFor('surfaces')).toMatchObject({ open: 3, ready: 2, inProgress: 0, needsHuman: 0 })
    expect(rowFor('pubdocs')).toMatchObject({ epicNumber: 260, open: 1, ready: 1 })
    expect(rowFor('core')).toMatchObject({ open: 3, ready: 3, inProgress: 0, needsHuman: 0 })
    expect(rowFor('verify')).toMatchObject({ open: 1, ready: 1 })
    expect(rowFor('upkeep')).toMatchObject({ open: 2, ready: 1 })
    expect(rowFor('3d')).toMatchObject({ open: 0, ready: 0, next: null })
  })

  it('names the next pick per project in pick order, falling back to the first pickable task', () => {
    expect(rowFor('harness').next).toEqual({ number: 148, title: expect.stringContaining('Bootstrap the backlog') })
    expect(rowFor('surfaces').next.number).toBe(210)
    expect(rowFor('core').next.number).toBe(188)
    expect(rowFor('horizon').next.number).toBe(230)
  })
})

describe('formatReady', () => {
  it('prints `#number · project · title`, a blank line, then the rest with a trailing reason', () => {
    const lines = formatReady(planReady(fixtureIssues, portfolioRows)).split('\n')
    expect(lines[0]).toMatch(/^#188 · core · ADR: document/)
    expect(lines[10]).toMatch(/^#222 · bugs · /)
    expect(lines[11]).toBe('')
    expect(lines[12]).toMatch(/^#149 · harness · .* · in-progress$/)
    expect(lines.at(-1)).toMatch(/^#230 · horizon · .* · on-request$/)
    expect(lines).toHaveLength(21)
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
    expect(lines[2]).toMatch(/^pubdocs · open 1 · ready 1 · in-progress 0 · needs-human 0 · next: #263 docs\/public: HDL language reference/)
    expect(lines[6]).toBe('3d · open 0 · ready 0 · in-progress 0 · needs-human 0 · next: —')
  })
})
