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
// #315, #329 and #331 were recorded 2026-09-21 (#330) so the foundation slots have pickable tasks
// and one double-labelled issue (#315: `project:surfaces` listed first, `project:foundation` second)
// exercises the label-priority rule against a real recording.
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
      'foundation', 'harness', 'surfaces', 'pubdocs', 'core', 'verify', 'spine', '3d', 'polish', 'bugs', 'upkeep',
      'horizon',
    ])
    expect(portfolioRows[0]).toEqual({ rank: 1, slug: 'foundation', epicNumber: 318, lane: 'feature' })
    expect(portfolioRows[1]).toEqual({ rank: 2, slug: 'harness', epicNumber: 138, lane: 'process' })
    expect(portfolioRows[2]).toEqual({ rank: 3, slug: 'surfaces', epicNumber: 142, lane: 'feature' })
    expect(portfolioRows[3]).toEqual({ rank: 4, slug: 'pubdocs', epicNumber: 260, lane: 'feature' })
    expect(portfolioRows.filter((row) => row.lane === 'enabler').map((row) => row.slug)).toEqual(['core', '3d'])
    expect(portfolioRows.filter((row) => row.lane === 'aux').map((row) => row.slug)).toEqual(['verify', 'bugs', 'upkeep'])
    expect(portfolioRows[11]).toMatchObject({ rank: 12, epicNumber: 147, lane: 'research' })
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
  // Amended 2026-09-21 (#330) while the foundation plan (#318) runs: three of the six slots are
  // `foundation`, and `foundation` is design-first so the ADR the plan waits on leads its own slot.
  it('mirror the literal cycle and aux order written in docs/portfolio.md', () => {
    expect(PICK_ROTATION).toEqual(['foundation', 'foundation', 'harness', 'foundation', 'spine', 'aux'])
    expect(AUX_ROTATION).toEqual(['verify', 'upkeep', 'bugs'])
    expect(livePortfolio).toContain(`\`${PICK_ROTATION.join(' → ')}\``)
    expect(livePortfolio).toContain(`\`${AUX_ROTATION.join(' → ')}\``)
    expect(DESIGN_FIRST_SLUGS).toEqual(['foundation', 'surfaces', 'core'])
  })

  it('names the gate reason in docs/portfolio.md, so the output and the rule stay in step', () => {
    expect(livePortfolio).toContain('`foundation-gate`')
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
    expect(task).toMatchObject({ project: 'core', rank: 5, lane: 'enabler', pickable: true, reason: null })
  })

  it('files an issue carrying project:foundation under foundation, whichever label GitHub lists first', () => {
    const labelled = (...names) => triageTasks([issue(1, { labels: ['agent-ready', ...names] })], portfolioRows)[0]
    expect(labelled('project:surfaces', 'project:foundation')).toMatchObject({ project: 'foundation', rank: 1 })
    expect(labelled('project:foundation', 'project:core').project).toBe('foundation')
    // …and the real recording: #315 lists `project:surfaces` first and is pulled forward by the plan.
    const recorded = triageTasks(fixtureIssues, portfolioRows).find((task) => task.number === 315)
    expect(recorded.labels).toContain('project:surfaces')
    expect(recorded.project).toBe('foundation')
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

  it('orders the fixture: foundation → foundation → harness → foundation → spine → aux, skipping drained slots', () => {
    // round 1: #315 · #329 · #148 · #331 · #175 (spine) · #226 (aux: verify is held, so upkeep)
    // round 2: foundation drained · #150 · spine drained · #222 (aux carries on at bugs)
    expect(picks(plan)).toEqual([315, 329, 148, 331, 175, 226, 150, 222])
  })

  it('returns every task once: picks first, then the rest by number', () => {
    expect(numbers(plan)).toEqual([
      315, 329, 148, 331, 175, 226, 150, 222,
      149, 151, 154, 162, 177, 178, 188, 190, 193, 206, 210, 211, 227, 230, 263,
    ])
  })

  it.each([
    [149, 'in-progress'],
    [151, 'blocked:#150'],
    [154, 'unshaped'],
    [162, 'needs-human'],
    [177, 'unshaped'],
    [178, 'foundation-gate'],
    [188, 'foundation-gate'],
    [193, 'foundation-gate'],
    [206, 'on-request'],
    [211, 'unshaped'],
    [227, 'author'],
    [230, 'on-request'],
    [263, 'on-request'],
  ])('explains why #%i is not picked: %s', (number, reason) => {
    expect(reasonOf(plan, number)).toBe(reason)
  })

  it('keeps pickable-but-unpicked tasks marked pickable, for the project counts', () => {
    expect(plan.find((task) => task.number === 178).pickable).toBe(true)
    expect(plan.find((task) => task.number === 230).pickable).toBe(true)
    expect(plan.find((task) => task.number === 151).pickable).toBe(false)
  })

  it('puts a sev:critical bug before everything, even the first foundation slot', () => {
    const issues = [
      open(1, 'foundation'),
      issue(2, { labels: ['agent-ready', 'bug', 'sev:critical', 'project:bugs'] }),
    ]
    expect(picks(planReady(issues, portfolioRows))).toEqual([2, 1])
  })

  it('cycles the six slots, rotates aux in turn, and skips a slot whose bucket is empty', () => {
    const issues = [
      open(11, 'foundation'), open(12, 'foundation'), open(13, 'foundation'), open(14, 'foundation'),
      open(21, 'harness'), open(22, 'harness'),
      open(31, 'spine'),
      open(41, 'verify'), open(51, 'upkeep'), open(52, 'upkeep'), open(61, 'bugs'),
    ]
    // round 1: 11 12 21 13 31 41 · round 2: 14 (no foundation) 22 (no foundation) (no spine) 51
    // round 3: aux → bugs 61 · round 4: aux → verify is empty → upkeep 52
    expect(picks(planReady(issues, portfolioRows))).toEqual([11, 12, 21, 13, 31, 41, 14, 22, 51, 61, 52])
  })

  it('aux skips an empty bucket and carries on in turn from the one it used', () => {
    const issues = [open(1, 'upkeep'), open(2, 'upkeep'), open(3, 'bugs')]
    expect(picks(planReady(issues, portfolioRows))).toEqual([1, 3, 2])
  })

  it('queues the rows the amended rotation leaves out as on-request, until one is pulled forward', () => {
    const issues = [open(5, 'surfaces'), open(3, 'pubdocs'), open(1, 'harness'),
      issue(7, { labels: ['agent-ready', 'project:surfaces', 'project:foundation'] })]
    const plan = planReady(issues, portfolioRows)
    expect(picks(plan)).toEqual([7, 1])
    expect(reasonOf(plan, 5)).toBe('on-request')
    expect(reasonOf(plan, 3)).toBe('on-request')
  })

  it('ranks research foundation/core tasks before the rest inside a slot (design first), then by number', () => {
    const issues = [
      open(2, 'foundation'), open(6, 'foundation', { research: true }),
      open(8, 'core', { research: true, blocking: [9] }), open(9, 'foundation', { blockedBy: [8] }),
      open(1, 'spine', { research: true }), open(3, 'spine'),
    ]
    expect(picks(planReady(issues, portfolioRows))).toEqual([6, 8, 2, 1, 3])
  })

  it('an enabler is pulled by an open task in any bucket and takes a slot of that bucket', () => {
    const issues = [
      open(1, 'spine'),
      open(8, 'foundation', { blockedBy: [9] }), open(9, 'core', { blocking: [8] }),
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
      open(2, 'spine', { blockedBy: [5] }), open(3, 'foundation', { blockedBy: [5] }),
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

// docs/research/2026-09-21-foundation-audit/REPORT.md §7: while the foundation plan (#318) runs, the
// safe-to-proceed test is this filter over `risk:2` — the label that already marks the store, UI, R3F
// and architecture paths — and not a second label.
describe('the foundation gate', () => {
  const risky = (number, slug, extra = []) =>
    issue(number, { labels: ['agent-ready', `project:${slug}`, 'risk:2', ...extra] })

  it('holds a risk:2 task outside foundation and harness, and says why', () => {
    const issues = [risky(1, 'spine'), risky(2, 'harness'), risky(3, 'foundation'), open(4, 'spine')]
    const plan = planReady(issues, portfolioRows)
    expect(picks(plan)).toEqual([3, 2, 4])
    expect(reasonOf(plan, 1)).toBe('foundation-gate')
  })

  it('stops new hand-editing work: wire drawing, junction placement, dragging and previews are risk:2', () => {
    // e.g. #224 "Gate placement preview lacks contrast in light mode" — bugs row, risk:2.
    const plan = planReady([risky(224, 'bugs'), open(1, 'foundation')], portfolioRows)
    expect(picks(plan)).toEqual([1])
    expect(reasonOf(plan, 224)).toBe('foundation-gate')
  })

  it('a held task is not pickable, so no project offers it as its next pick', () => {
    const plan = planReady([risky(1, 'spine')], portfolioRows)
    expect(plan.find((task) => task.number === 1).pickable).toBe(false)
    expect(summarizeProjects([risky(1, 'spine')], portfolioRows).find((row) => row.slug === 'spine'))
      .toMatchObject({ open: 1, ready: 0, next: null })
  })

  it('never holds a sev:critical bug — an evaluation defect is still fixed', () => {
    const issues = [risky(1, 'bugs', ['sev:critical']), open(2, 'foundation')]
    expect(picks(planReady(issues, portfolioRows))).toEqual([1, 2])
  })

  it('lets a risk:0 or risk:1 task outside the plan through', () => {
    const issues = [issue(1, { labels: ['agent-ready', 'project:spine', 'risk:1'] }),
      issue(2, { labels: ['agent-ready', 'project:upkeep', 'risk:0'] })]
    expect(picks(planReady(issues, portfolioRows))).toEqual([1, 2])
  })
})

describe('summarizeProjects', () => {
  const summaries = summarizeProjects(fixtureIssues, portfolioRows)
  const rowFor = (slug) => summaries.find((summary) => summary.slug === slug)

  it('emits one summary per portfolio row, in file order', () => {
    expect(summaries.map((summary) => summary.slug)).toEqual(portfolioRows.map((row) => row.slug))
  })

  it('counts open, ready, in-progress and needs-human per project', () => {
    expect(rowFor('foundation')).toMatchObject({ epicNumber: 318, open: 3, ready: 3, inProgress: 0, needsHuman: 0 })
    expect(rowFor('harness')).toMatchObject({ epicNumber: 138, open: 6, ready: 2, inProgress: 1, needsHuman: 1 })
    expect(rowFor('surfaces')).toMatchObject({ open: 3, ready: 2, inProgress: 0, needsHuman: 0 })
    expect(rowFor('pubdocs')).toMatchObject({ epicNumber: 260, open: 1, ready: 1 })
    // the gate holds all three `core` tasks: every one of them is risk:2 outside the plan
    expect(rowFor('core')).toMatchObject({ open: 3, ready: 0, inProgress: 0, needsHuman: 0, next: null })
    expect(rowFor('verify')).toMatchObject({ open: 1, ready: 0 })
    expect(rowFor('upkeep')).toMatchObject({ open: 2, ready: 1 })
    expect(rowFor('3d')).toMatchObject({ open: 0, ready: 0, next: null })
  })

  it('names the next pick per project in pick order, falling back to the first pickable task', () => {
    expect(rowFor('foundation').next).toEqual({ number: 315, title: expect.stringContaining('Canvas-less shell') })
    expect(rowFor('harness').next).toEqual({ number: 148, title: expect.stringContaining('Bootstrap the backlog') })
    expect(rowFor('surfaces').next.number).toBe(206)
    expect(rowFor('horizon').next.number).toBe(230)
  })
})

describe('formatReady', () => {
  it('prints `#number · project · title`, a blank line, then the rest with a trailing reason', () => {
    const lines = formatReady(planReady(fixtureIssues, portfolioRows)).split('\n')
    expect(lines[0]).toMatch(/^#315 · foundation · Canvas-less shell/)
    expect(lines[7]).toMatch(/^#222 · bugs · /)
    expect(lines[8]).toBe('')
    expect(lines[9]).toMatch(/^#149 · harness · .* · in-progress$/)
    expect(lines).toContainEqual(expect.stringMatching(/^#193 · verify · .* · foundation-gate$/))
    expect(lines.at(-1)).toMatch(/^#263 · pubdocs · .* · on-request$/)
    expect(lines).toHaveLength(24)
  })

  it('prints nothing for an empty backlog', () => {
    expect(formatReady([])).toBe('')
  })
})

describe('formatProjects', () => {
  it('prints one greppable line per row with counts and the next pick', () => {
    const lines = formatProjects(summarizeProjects(fixtureIssues, portfolioRows)).split('\n')
    expect(lines).toHaveLength(portfolioRows.length)
    expect(lines[0]).toMatch(/^foundation · open 3 · ready 3 · in-progress 0 · needs-human 0 · next: #315 Canvas-less shell/)
    expect(lines[1]).toMatch(/^harness · open 6 · ready 2 · in-progress 1 · needs-human 1 · next: #148 Bootstrap the backlog/)
    expect(lines[3]).toMatch(/^pubdocs · open 1 · ready 1 · in-progress 0 · needs-human 0 · next: #263 docs\/public: HDL language reference/)
    expect(lines[7]).toBe('3d · open 0 · ready 0 · in-progress 0 · needs-human 0 · next: —')
  })
})
