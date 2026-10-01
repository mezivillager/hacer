import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  AUX_ROTATION,
  CLAIM_HISTORY_PAGES,
  CLAIM_HISTORY_WINDOW,
  DEFAULT_ALLOWLIST,
  DESIGN_FIRST_SLUGS,
  DORMANT_OPEN_PRS,
  NOTHING_PICKABLE_EXIT,
  PICK_ROTATION,
  ROW_AGENT_READY_CAP,
  STALE_CLAIM_HOURS,
  bucketOf,
  claimComment,
  claimHistory,
  claimHistoryQuery,
  claimTaken,
  dormantMode,
  epicTree,
  formatDormant,
  formatProjects,
  formatReady,
  formatResume,
  formatTasks,
  historyGap,
  latestClaim,
  parsePortfolio,
  planReady,
  readClaimHistory,
  readClaims,
  releaseComment,
  releaseRefusal,
  reportNext,
  requirePortfolioRows,
  resumePoint,
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

// #531: the claims are read from the recording Mission Control's tests use (scripts/fixtures/mission-control/, taken
// 2026-09-25 at ~00:20 +03:00): `git ls-remote origin 'refs/heads/claim/*'`, the claimsQuery answer for those refs,
// and `gh pr list --state open`. Nine refs: #403 and #438 have no claim comment, and an open PR carries #403, #438
// and #482.
const recordingText = (file) => readFileSync(path.join(import.meta.dirname, 'fixtures', 'mission-control', file), 'utf8')
const recorded = {
  lsRemote: recordingText('git-claim-refs.txt'),
  answer: JSON.parse(recordingText('gh-claims.json')),
  openPrs: JSON.parse(recordingText('gh-prs-open.json')),
}
const RECORDED_AT = '2026-09-25T00:30:00.000Z'

/** A claim in readClaims' shape: held by claude-local, fresh, no open PR, unless overridden. */
const held = (number, overrides = {}) =>
  ({ number, claimedBy: 'claude-local', at: '2026-09-27T08:20:07Z', openPr: null, stale: false, ...overrides })
const claimNote = (login, body, createdAt) => ({ author: { login }, body, createdAt, url: `https://example.test/${createdAt}` })

describe('parsePortfolio', () => {
  it('reads every row of the live docs/portfolio.md in file order', () => {
    expect(portfolioRows.map((row) => row.slug)).toEqual([
      'foundation', 'harness', 'surfaces', 'pubdocs', 'core', 'verify', 'spine', '3d', 'polish', 'bugs', 'upkeep',
      'horizon', 'lineage', 'mission-control',
    ])
    expect(portfolioRows[0]).toEqual({ rank: 1, slug: 'foundation', epicNumber: 318, lane: 'feature' })
    expect(portfolioRows[1]).toEqual({ rank: 2, slug: 'harness', epicNumber: 138, lane: 'process' })
    expect(portfolioRows[2]).toEqual({ rank: 3, slug: 'surfaces', epicNumber: 142, lane: 'feature' })
    expect(portfolioRows[3]).toEqual({ rank: 4, slug: 'pubdocs', epicNumber: 260, lane: 'feature' })
    expect(portfolioRows.filter((row) => row.lane === 'enabler').map((row) => row.slug)).toEqual(['core', '3d'])
    expect(portfolioRows.filter((row) => row.lane === 'aux').map((row) => row.slug)).toEqual(['verify', 'bugs', 'upkeep'])
    expect(portfolioRows[11]).toMatchObject({ rank: 12, epicNumber: 147, lane: 'research' })
    // rows 13-14, amended 2026-09-25 (#482): lineage and mission-control join on equal footing.
    expect(portfolioRows[12]).toEqual({ rank: 13, slug: 'lineage', epicNumber: 457, lane: 'process' })
    expect(portfolioRows[13]).toEqual({ rank: 14, slug: 'mission-control', epicNumber: 458, lane: 'process' })
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
  // Amended 2026-09-21 (#330) while the foundation plan (#318) runs: three of the eight slots are
  // `foundation`, and `foundation` is design-first so the ADR the plan waits on leads its own slot.
  // Amended again 2026-09-25 (#482): `lineage` and `mission-control` join, one slot each, "equal
  // footing as the other priority projects" — literally equal to `harness` and `spine`.
  it('mirror the literal cycle and aux order written in docs/portfolio.md', () => {
    expect(PICK_ROTATION).toEqual([
      'foundation', 'lineage', 'harness', 'foundation', 'mission-control', 'spine', 'foundation', 'aux',
    ])
    expect(AUX_ROTATION).toEqual(['verify', 'upkeep', 'bugs'])
    expect(livePortfolio).toContain(`\`${PICK_ROTATION.join(' → ')}\``)
    expect(livePortfolio).toContain(`\`${AUX_ROTATION.join(' → ')}\``)
    expect(DESIGN_FIRST_SLUGS).toEqual(['foundation', 'surfaces', 'core'])
  })

  it('names the gate reason in docs/portfolio.md, so the output and the rule stay in step', () => {
    expect(livePortfolio).toContain('`foundation-gate`')
  })

  it('names the claim reasons and the stale-claim hours in docs/portfolio.md', () => {
    expect(livePortfolio).toContain('`claimed`')
    expect(livePortfolio).toContain('`stale-claim`')
    expect(livePortfolio).toContain(`${STALE_CLAIM_HOURS} h`)
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

  it('orders the fixture: foundation → lineage → harness → foundation → mission-control → spine → foundation → aux, skipping drained slots', () => {
    // round 1: #315 (foundation) · lineage empty · #148 (harness) · #329 (foundation) · mission-control
    // empty · #175 (spine) · #331 (foundation) · #226 (aux: verify is held, so upkeep)
    // round 2: foundation drained · #150 (harness) · spine drained · #222 (aux carries on at bugs)
    expect(picks(plan)).toEqual([315, 148, 329, 175, 331, 226, 150, 222])
  })

  it('returns every task once: picks first, then the rest by number', () => {
    expect(numbers(plan)).toEqual([
      315, 148, 329, 175, 331, 226, 150, 222,
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
    expect(plan.find((task) => task.number === 230).pickable).toBe(true)
    expect(plan.find((task) => task.number === 151).pickable).toBe(false)
    // every enabler in the fixture is risk:2, so the `not-pulled` case needs an issue of its own
    const [notPulled] = planReady([open(1, 'core')], portfolioRows)
    expect(notPulled).toMatchObject({ number: 1, reason: 'not-pulled', pickable: true })
  })

  it('puts a sev:critical bug before everything, even the first foundation slot', () => {
    const issues = [
      open(1, 'foundation'),
      issue(2, { labels: ['agent-ready', 'bug', 'sev:critical', 'project:bugs'] }),
    ]
    expect(picks(planReady(issues, portfolioRows))).toEqual([2, 1])
  })

  it('cycles the eight slots, rotates aux in turn, and skips a slot whose bucket is empty', () => {
    const issues = [
      open(11, 'foundation'), open(12, 'foundation'), open(13, 'foundation'), open(14, 'foundation'),
      open(21, 'harness'), open(22, 'harness'),
      open(31, 'spine'),
      open(41, 'verify'), open(51, 'upkeep'), open(52, 'upkeep'), open(61, 'bugs'),
    ]
    // round 1: 11 (foundation) · lineage empty · 21 (harness) · 12 (foundation) · mission-control
    // empty · 31 (spine) · 13 (foundation) · 41 (aux: verify)
    // round 2: 14 (foundation) · 22 (harness) · (no spine) · 51 (aux: upkeep)
    // round 3: aux → bugs 61 · round 4: aux → verify is empty → upkeep 52
    expect(picks(planReady(issues, portfolioRows))).toEqual([11, 21, 12, 31, 13, 41, 14, 22, 51, 61, 52])
  })

  it('aux skips an empty bucket and carries on in turn from the one it used', () => {
    const issues = [open(1, 'upkeep'), open(2, 'upkeep'), open(3, 'bugs')]
    expect(picks(planReady(issues, portfolioRows))).toEqual([1, 3, 2])
  })

  // Amended 2026-09-25 (#482): the two new rows each get their own slot in the cycle.
  it('an agent-ready task labelled project:lineage is pickable in the lineage slot; same for mission-control', () => {
    const issues = [open(1, 'lineage'), open(2, 'mission-control')]
    const plan = planReady(issues, portfolioRows)
    // lineage (slot 2) is drawn before mission-control (slot 5) within the same round.
    expect(picks(plan)).toEqual([1, 2])
    expect(plan.find((task) => task.number === 1)).toMatchObject({ project: 'lineage', rank: 13, pickable: true })
    expect(plan.find((task) => task.number === 2)).toMatchObject({ project: 'mission-control', rank: 14, pickable: true })
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
    expect(picks(planReady(issues, portfolioRows))).toEqual([6, 8, 1, 2, 3])
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

  // Amended 2026-09-25 (#482): lineage and mission-control join GATE_EXEMPT_ROWS for the same reason
  // harness is there — their risk:2 work is CI checks, not the store/UI/R3F paths the gate protects.
  it('does not hold a risk:2 task in lineage or mission-control', () => {
    const issues = [risky(1, 'lineage'), risky(2, 'mission-control')]
    const plan = planReady(issues, portfolioRows)
    expect(picks(plan)).toEqual([1, 2])
    expect(reasonOf(plan, 1)).not.toBe('foundation-gate')
    expect(reasonOf(plan, 2)).not.toBe('foundation-gate')
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

  it('reports on-request before the gate for a risk:2 task of a row the rotation leaves out, still held', () => {
    const plan = planReady([risky(262, 'surfaces'), risky(266, 'pubdocs'), risky(178, 'core')], portfolioRows)
    expect(reasonOf(plan, 262)).toBe('on-request')
    expect(reasonOf(plan, 266)).toBe('on-request')
    expect(reasonOf(plan, 178)).toBe('foundation-gate')
    expect(plan.every((task) => !task.pickable)).toBe(true)
  })

  it('says in docs/portfolio.md that the gate holds the risk:2 part of hand editing, not all of it', () => {
    expect(livePortfolio).not.toContain('All of it is `risk:2`')
    expect(livePortfolio).toContain('The filter holds only the `risk:2` part of it')
  })
})

// #535 (2026-09-26 reviews: 3.md F3, 2.md F14, evidence/2-controls.md): the cycle held inside one listing and reset on
// the next call, so eight successive top picks were `foundation ×3, lineage ×3, harness ×2`. The place now comes from
// the claims made before the call — claimHistory's record, not a coordinator's memory.
describe('the cycle across calls', () => {
  /** Take the top pick, claim it — it joins the history — and remove it before the next call, `count` times. */
  function successiveTopPicks(issues, count) {
    const history = []
    let remaining = issues
    for (let call = 0; call < count; call++) {
      const [top] = planReady(remaining, portfolioRows, DEFAULT_ALLOWLIST, [], history).filter((task) => task.reason === null)
      if (!top) break
      history.push(remaining.find((candidate) => candidate.number === top.number))
      remaining = remaining.filter((candidate) => candidate.number !== top.number)
    }
    return numbers(history)
  }
  const IN_THE_CYCLE = ['foundation', 'lineage', 'harness', 'mission-control', 'spine', 'verify', 'upkeep', 'bugs']
  /** Three agent-ready tasks in every bucket of the cycle — #101-103 foundation … #801-803 bugs — and one on-request. */
  const everyBucket = [...IN_THE_CYCLE.flatMap((slug, index) => [1, 2, 3].map((k) => open((index + 1) * 100 + k, slug))), open(901, 'horizon')]
  const projectOf = (issues) => (number) => triageTasks(issues, portfolioRows).find((task) => task.number === number).project

  it('eight successive top picks, each removed before the next call, equal the first eight of one listing', () => {
    const listing = picks(planReady(everyBucket, portfolioRows))
    expect(listing.slice(0, 8).map(projectOf(everyBucket))).toEqual([
      'foundation', 'lineage', 'harness', 'foundation', 'mission-control', 'spine', 'foundation', 'verify',
    ])
    expect(successiveTopPicks(everyBucket, 8)).toEqual(listing.slice(0, 8))
    // …and on through the whole listing, aux taking verify → upkeep → bugs in turn.
    expect(successiveTopPicks(everyBucket, listing.length)).toEqual(listing)
    // The recorded backlog too: a drained slot skipped, the gate holding verify, aux carrying on at bugs.
    expect(successiveTopPicks(fixtureIssues, 8)).toEqual(picks(planReady(fixtureIssues, portfolioRows)))
  })

  it('holds with a sev:critical bug and a pulled enabler in the backlog: both go where one listing puts them', () => {
    const issues = [
      ...everyBucket.filter((candidate) => candidate.number !== 102),
      open(102, 'foundation', { blockedBy: [9] }), open(9, 'core', { blocking: [102] }),
      issue(2, { labels: ['agent-ready', 'bug', 'sev:critical', 'project:bugs'] }),
    ]
    const listing = picks(planReady(issues, portfolioRows))
    expect(listing.slice(0, 5)).toEqual([2, 9, 201, 301, 101]) // critical first; the enabler takes foundation's slot
    expect(successiveTopPicks(issues, listing.length)).toEqual(listing)
  })

  it('resumes after the latest pick that took a slot; the three foundation slots told apart by the picks before', () => {
    const issues = [open(11, 'foundation'), open(21, 'lineage'), open(31, 'harness'), open(41, 'mission-control'),
      open(51, 'spine'), open(61, 'verify')]
    const after = (...history) => picks(planReady(issues, portfolioRows, DEFAULT_ALLOWLIST, [], history))
    expect(after()).toEqual([11, 21, 31, 41, 51, 61])
    expect(after(open(1, 'harness'))).toEqual([11, 41, 51, 61, 21, 31])
    expect(after(open(1, 'foundation'))).toEqual([21, 31, 11, 41, 51, 61])
    expect(after(open(1, 'lineage'), open(2, 'harness'), open(3, 'foundation'))).toEqual([41, 51, 11, 61, 21, 31])
    expect(after(open(1, 'mission-control'), open(2, 'spine'), open(3, 'foundation'))).toEqual([61, 11, 21, 31, 41, 51])
    // Aux carries on from the bucket it took last: after an upkeep pick, bugs comes before verify.
    expect(picks(planReady([open(61, 'verify'), open(81, 'bugs')], portfolioRows, DEFAULT_ALLOWLIST, [], [open(7, 'upkeep')])))
      .toEqual([81, 61])
  })

  it('a claim that took no slot leaves the place: sev:critical, the gate, on-request, unfiled, an enabler pulled by nothing', () => {
    const issues = [open(11, 'foundation'), open(21, 'lineage'), open(31, 'harness'), open(51, 'spine')]
    const after = (...history) => picks(planReady(issues, portfolioRows, DEFAULT_ALLOWLIST, [], history))
    const afterHarness = after(open(1, 'harness'))
    expect(afterHarness).toEqual([11, 51, 21, 31])
    for (const detour of [
      issue(2, { labels: ['agent-ready', 'sev:critical', 'project:bugs'] }),
      issue(3, { labels: ['agent-ready', 'risk:2', 'project:spine'] }),
      open(4, 'surfaces'), open(5, 'horizon'), issue(6, { labels: ['agent-ready'] }), open(7, 'core'),
    ]) {
      expect(after(open(1, 'harness'), detour)).toEqual(afterHarness)
    }
  })

  it('never moves sev:critical off the front, nor lets the gate go', () => {
    const issues = [open(11, 'foundation'), issue(12, { labels: ['agent-ready', 'risk:2', 'project:spine'] }),
      issue(13, { labels: ['agent-ready', 'sev:critical', 'project:bugs'] }), open(14, 'spine')]
    const plan = planReady(issues, portfolioRows, DEFAULT_ALLOWLIST, [], [open(1, 'mission-control')])
    expect(picks(plan)).toEqual([13, 14, 11])
    expect(reasonOf(plan, 12)).toBe('foundation-gate')
  })
})

// #535: gh-claim-history.json is `gh api graphql` run with gh-claim-history.graphql — the query claimHistoryQuery builds
// — on 2026-09-27 at 10:20Z (origin/main aa4d75a): the 50 most recently updated issues, every comment body cut to its
// first non-blank line, the line a claim opens with.
describe('claimHistory', () => {
  const recording = JSON.parse(recordingText('gh-claim-history.json'))
  const history = claimHistory(recording)

  it('reads each recorded claim at its first claim comment, oldest first, as issues ready can file', () => {
    expect(numbers(history)).toEqual([
      465, 472, 483, 484, 460, 485, 473, 467, 489, 477, 469, 476, 474, 470, 475, 455, 468, 530, 531, 536, 535, 537,
    ])
    // #468 was claimed again at 14:53; its pick is the first claim. #193 and #482 were claimed before the window's
    // oldest update (2026-09-24T21:21:34Z), where a claim can be missing, so they are left out.
    expect(history.find((pick) => pick.number === 468).claimedAt).toBe('2026-09-25T08:18:23Z')
    expect(history.at(-1)).toEqual({
      number: 537, parent: { number: 138 }, blocking: { nodes: [] }, claimedAt: '2026-09-27T10:16:48Z',
      labels: [{ name: 'project:harness' }, { name: 'agent-ready' }, { name: 'in-progress' }, { name: 'risk:0' }],
    })
    expect(triageTasks(history, portfolioRows).map((task) => task.project))
      .toEqual(expect.arrayContaining(['harness', 'lineage', 'mission-control']))
  })

  it('keeps every claim of a window that is not full, and only the allowlist’s claims', () => {
    const issues = recording.data.repository.issues.nodes
    expect(issues).toHaveLength(CLAIM_HISTORY_WINDOW)
    const partial = { data: { repository: { issues: { nodes: issues.slice(0, CLAIM_HISTORY_WINDOW - 1) } } } }
    expect(numbers(claimHistory(partial)).slice(0, 2)).toEqual([193, 482])
    expect(claimHistory(recording, ['outsider'])).toEqual([])
    expect(claimHistory(null)).toEqual([])
  })

  it('puts the recorded backlog’s cycle after #537, the latest claim — harness — at the fourth slot, foundation', () => {
    expect(resumePoint(fixtureIssues, portfolioRows, history)).toEqual({
      slot: 3, aux: 0, after: { number: 537, bucket: 'harness', at: '2026-09-27T10:16:48Z' },
    })
    expect(formatResume(resumePoint(fixtureIssues, portfolioRows, history)))
      .toBe('cycle: slot 4 of 8 (foundation), after #537 · harness, claimed 2026-09-27T10:16:48Z')
    expect(formatResume(resumePoint(fixtureIssues, portfolioRows, []))).toBe('cycle: slot 1 of 8 (foundation), no earlier claim on record')
    // foundation → mission-control (empty) → spine → foundation → aux (verify held, so upkeep) → foundation → …
    expect(picks(planReady(fixtureIssues, portfolioRows, DEFAULT_ALLOWLIST, [], history))).toEqual([315, 175, 329, 226, 331, 148, 222, 150])
    expect(summarizeProjects(fixtureIssues, portfolioRows, DEFAULT_ALLOWLIST, [], history))
      .toEqual(summarizeProjects(fixtureIssues, portfolioRows))
  })

  it('ha-next §1 and the pick rule say the pick continues the cycle, from the latest claim', () => {
    const skill = readFileSync(path.join(import.meta.dirname, '..', '.claude', 'skills', 'ha-next', 'SKILL.md'), 'utf8')
    const orient = skill.slice(skill.indexOf('## 1.'), skill.indexOf('## 2.'))
    expect(orient).toMatch(/continues the cycle/)
    expect(orient).toMatch(/latest claim/)
    expect(livePortfolio).toMatch(/continues across calls/)
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
    // #540: surfaces and pubdocs are on-request while #330's rotation runs, so none of their tasks is ready
    expect(rowFor('surfaces')).toMatchObject({ open: 3, ready: 0, inProgress: 0, needsHuman: 0, filedElsewhere: [315] })
    expect(rowFor('pubdocs')).toMatchObject({ epicNumber: 260, open: 1, ready: 0 })
    // the gate holds all three `core` tasks: every one of them is risk:2 outside the plan
    expect(rowFor('core')).toMatchObject({ open: 3, ready: 0, inProgress: 0, needsHuman: 0, next: null })
    expect(rowFor('verify')).toMatchObject({ open: 1, ready: 0 })
    expect(rowFor('upkeep')).toMatchObject({ open: 2, ready: 1 })
    expect(rowFor('3d')).toMatchObject({ open: 0, ready: 0, next: null })
    // no lineage/mission-control task exists in this recorded (2026-09-18/21) fixture yet.
    expect(rowFor('lineage')).toMatchObject({ epicNumber: 457, open: 0, ready: 0, next: null })
    expect(rowFor('mission-control')).toMatchObject({ epicNumber: 458, open: 0, ready: 0, next: null })
  })

  it('names the next pick per project in pick order, falling back to the first pickable task', () => {
    expect(rowFor('foundation').next).toEqual({ number: 315, title: expect.stringContaining('Canvas-less shell') })
    expect(rowFor('harness').next).toEqual({ number: 148, title: expect.stringContaining('Bootstrap the backlog') })
    expect(rowFor('surfaces').next.number).toBe(206)
    expect(rowFor('horizon').next.number).toBe(230)
  })

  it('names the issues that carry a row\'s label but file under its priority row, and counts and offers them there only', () => {
    const pulled = issue(1, { labels: ['agent-ready', 'project:surfaces', 'project:foundation'] })
    const rows = summarizeProjects([pulled, open(2, 'surfaces')], portfolioRows)
    const row = (slug) => rows.find((summary) => summary.slug === slug)
    expect(row('foundation')).toMatchObject({ open: 1, ready: 1, next: { number: 1 }, filedElsewhere: [] })
    expect(row('surfaces')).toMatchObject({ open: 1, ready: 0, next: { number: 2 }, filedElsewhere: [1] })
    expect(formatProjects(rows).split('\n')[2])
      .toBe('surfaces · open 1 · ready 0 · in-progress 0 · needs-human 0 · filed under another row #1 · next: #2 Task 2')
  })
})

describe('the shared bucket', () => {
  it('queues pubdocs in the surfaces bucket, so a surfaces slot takes either once the amendment lifts', () => {
    expect(bucketOf('pubdocs')).toBe('surfaces')
    expect(bucketOf('surfaces')).toBe('surfaces')
    expect(bucketOf('foundation')).toBe('foundation')
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
    expect(lines[3]).toMatch(/^pubdocs · open 1 · ready 0 · in-progress 0 · needs-human 0 · next: #263 docs\/public: HDL language reference/)
    expect(lines[7]).toBe('3d · open 0 · ready 0 · in-progress 0 · needs-human 0 · next: —')
  })
})

describe('the portfolio guard', () => {
  it('a zero-row portfolio table fails loudly', () => {
    const headerOnly = ['| # | slug | Project | Epic | Lane | Progress is… |', '|---|---|---|---|---|---|', '', 'prose'].join('\n')
    for (const markdown of ['', headerOnly]) expect(() => requirePortfolioRows(markdown)).toThrow(/no portfolio rows.*unshaped/)
    expect(requirePortfolioRows(livePortfolio)).toEqual(portfolioRows)
  })
})

describe('next', () => {
  it('next prints the head of the pick order', () => {
    const plan = planReady(fixtureIssues, portfolioRows)
    expect(reportNext(plan)).toEqual({ exitCode: 0, stdout: formatReady(plan).split('\n')[0], stderr: '' })
    expect(reportNext(plan).stdout).toMatch(/^#315 · foundation · Canvas-less shell/)
    expect(JSON.parse(reportNext(plan, { json: true }).stdout)).toEqual(plan[0])
  })

  it('next exits non-zero when nothing is pickable, apart from an error (1) or a usage error (2)', () => {
    const plan = planReady([open(1, 'harness', { blockedBy: [2] }), issue(3, { labels: ['project:harness'] })], portfolioRows)
    const nothing = { exitCode: NOTHING_PICKABLE_EXIT, stderr: expect.stringContaining('nothing is pickable') }
    expect(reportNext(plan)).toEqual({ ...nothing, stdout: '' })
    expect(reportNext([], { json: true })).toEqual({ ...nothing, stdout: 'null' })
    expect([0, 1, 2]).not.toContain(NOTHING_PICKABLE_EXIT)
  })
})

// `tasks` reads the Mission Control recording (21 real rows, with the portfolio.md pinned beside it), where foundation's
// epic #318 is itself a sub-issue of harness's #138 and four foundation tasks sit under other epics.
describe('tasks <slug>', () => {
  const treeIssues = JSON.parse(recordingText('gh-issues.json'))
  const pinnedRows = parsePortfolio(recordingText('portfolio.md'))
  const titleOf = (number) => treeIssues.find((each) => each.number === number).title
  const line = (depth, number, project, status) => `${'  '.repeat(depth)}#${number} · ${project} · ${titleOf(number)} · ${status}`
  const tasks = (slug) => formatTasks(epicTree(slug, treeIssues, pinnedRows)).split('\n')

  it("tasks <slug> prints the epic's tree", () => {
    expect(tasks('harness')).toEqual([
      line(0, 138, 'epic', '19/45 closed'),
      line(1, 148, 'harness', 'pick 2'),
      line(1, 149, 'harness', 'pick 8'),
      line(1, 156, 'harness', 'unshaped'),
      line(1, 315, 'foundation', 'pick 5'),
      line(1, 318, 'epic', '12/32 closed'),
      line(2, 331, 'foundation', 'pick 7'),
      line(2, 373, 'foundation', 'pick 9'),
      'outside #138, filed under harness by label:',
      line(1, 438, 'harness', 'in-progress'),
    ])
  })

  it('tasks <slug> lists the tasks a project: label files under the row from outside its epic', () => {
    expect(tasks('foundation')).toEqual([
      line(0, 318, 'epic', '12/32 closed'),
      line(1, 331, 'foundation', 'pick 7'),
      line(1, 373, 'foundation', 'pick 9'),
      'outside #318, filed under foundation by label:',
      line(1, 182, 'foundation', 'in-progress'),
      line(1, 193, 'foundation', 'pick 1'),
      line(1, 217, 'foundation', 'pick 3'),
      line(1, 315, 'foundation', 'pick 5'),
    ])
  })

  it('numbers each pick as ready orders it and gives every other task its reason', () => {
    const plan = planReady(treeIssues, pinnedRows)
    const { epic, outside } = epicTree('foundation', treeIssues, pinnedRows)
    for (const node of [...epic.children, ...outside]) {
      expect(node.pick).toBe(picks(plan).includes(node.number) ? picks(plan).indexOf(node.number) + 1 : null)
      expect(node.reason).toBe(reasonOf(plan, node.number))
    }
  })

  it('roots the tree at an epic missing from the open list, and prints no outside section when nothing is', () => {
    expect(tasks('spine')).toEqual(['#139 · epic · (not open)', line(1, 165, 'spine', 'unshaped'), line(1, 175, 'spine', 'pick 4')])
  })

  it('names the portfolio rows for a slug that is none of them', () => {
    expect(() => epicTree('mission-control', treeIssues, pinnedRows)).toThrow(/no portfolio row 'mission-control'.*foundation, harness, surfaces/)
  })
})

describe('the command line', () => {
  const SCRIPT = path.join(import.meta.dirname, 'backlog.mjs')
  // No gh on PATH or in ~/.local/bin: a command that got past its arguments fails to find gh and never reaches GitHub.
  const run = (...args) => spawnSync(process.execPath, [SCRIPT, ...args],
    { encoding: 'utf8', env: { PATH: '/nonexistent-backlog-test/bin', HOME: '/nonexistent-backlog-test' } })

  // `--by` is claim's and release's flag, so it is unknown to `ready`.
  it.each([
    ['ready --jsonn', '--jsonn'],
    ['projects --jsonn', '--jsonn'],
    ['tasks harness --bogus', '--bogus'],
    ['ready --by me', '--by'],
  ])('an unknown flag exits 2 with usage: %s', (command, flag) => {
    const { status, stdout, stderr } = run(...command.split(' '))
    expect({ status, stdout }).toEqual({ status: 2, stdout: '' })
    expect(stderr).toContain(`'${flag}'`)
    expect(stderr).toContain('usage: node scripts/backlog.mjs <ready|projects|next> [--json]')
    expect(stderr).toContain('node scripts/backlog.mjs tasks <slug> [--json]')
  })
})

// #531: a claim is the `claim/<n>` ref `backlog.mjs claim` creates exclusively; its holder is the `Claimed by` of the
// issue's latest claim comment. FINDINGS F2 (2026-09-27): #193 held claim/193 without the `in-progress` label and was
// the first row of `ready`.
describe('latestClaim', () => {
  it('reads the latest comment by an allowlisted author that opens with `Claimed by:`, field by field', () => {
    const comments = [
      claimNote('mezivillager', 'Claimed by: grok-bot\nIntent: building\nSession/run: bc-6de6', '2026-09-23T23:15:56Z'),
      claimNote('mezivillager', 'Claimed by: claude-local   # taken back\nIntent: building\nHandoff: none', '2026-09-27T08:20:07Z'),
      claimNote('mezivillager', 'Next time, claim with:\nClaimed by: someone', '2026-09-27T09:00:00Z'),
      claimNote('outsider', 'Claimed by: outsider\nIntent: building', '2026-09-27T10:00:00Z'),
    ]
    expect(latestClaim(comments)).toEqual({
      claimedBy: 'claude-local', intent: 'building', session: null, branch: null, handoff: 'none',
      author: 'mezivillager', at: '2026-09-27T08:20:07Z', url: 'https://example.test/2026-09-27T08:20:07Z',
    })
    expect(latestClaim(comments, ['outsider'])).toMatchObject({ claimedBy: 'outsider', at: '2026-09-27T10:00:00Z' })
    expect(latestClaim([])).toBeNull()
  })

  // #549's verifier, nit 1: the filter took ` Claimed by: x` for a claim while the field reader found no holder in it,
  // so the true holder was refused release.
  it('names the holder of every comment it takes for a claim — indented or after blank lines too — so the holder releases it', () => {
    const at = '2026-09-27T11:00:00Z'
    for (const body of [' Claimed by: claude-local\nIntent: building', '\tClaimed by: claude-local', '\n\n  Claimed by: claude-local   # back\n  Intent: building']) {
      expect(latestClaim([claimNote('mezivillager', body, at)])).toMatchObject({ claimedBy: 'claude-local', at })
    }
    expect(latestClaim([claimNote('mezivillager', '\n  Claimed by: claude-local\n  Intent: building', at)])).toMatchObject({ intent: 'building' })
    const lsRemote = `${'a'.repeat(40)}\trefs/heads/claim/7\n`
    const answer = { data: { repository: { i7: { number: 7, comments: { nodes: [claimNote('mezivillager', ' Claimed by: claude-local', at)] } } } } }
    const [claim] = readClaims({ lsRemote, answer, openPrs: [], now: at })
    expect(claim).toMatchObject({ claimedBy: 'claude-local', at })
    expect(releaseRefusal(claim, { by: 'claude-local' })).toBeNull()
    // A comment that does not open with the field is still no claim, however the field is indented further down.
    expect(latestClaim([claimNote('mezivillager', 'Next time, claim with:\n  Claimed by: someone', at)])).toBeNull()
  })
})

describe('readClaims', () => {
  const byNumber = (claims) => new Map(claims.map((claim) => [claim.number, claim]))
  const staleAt = (now, inputs = recorded) => numbers(readClaims({ ...inputs, now }).filter((claim) => claim.stale))

  it('joins every recorded claim ref to its holder, its latest claim comment and the open PR that carries it', () => {
    const claims = byNumber(readClaims({ ...recorded, now: RECORDED_AT }))
    expect([...claims.keys()]).toEqual([182, 193, 195, 199, 333, 403, 427, 438, 482])
    expect(claims.get(182)).toEqual({ number: 182, claimedBy: 'claude-local', at: '2026-09-24T13:57:40Z', openPr: null, stale: false })
    expect(claims.get(193)).toEqual({ number: 193, claimedBy: 'grok-bot', at: '2026-09-23T23:15:56Z', openPr: null, stale: false })
    expect(claims.get(403)).toEqual({ number: 403, claimedBy: null, at: null, openPr: 459, stale: false })
    expect(claims.get(438)).toMatchObject({ claimedBy: null, openPr: 461, stale: false })
    expect(claims.get(482)).toMatchObject({ claimedBy: 'claude-local', openPr: 486, stale: false })
  })

  it(`is stale ${STALE_CLAIM_HOURS} h after its latest claim comment, and only while no open PR carries the issue`, () => {
    expect(staleAt(RECORDED_AT)).toEqual([])
    // #193's claim comment is 2026-09-23T23:15:56Z: held at exactly 48 h, stale a millisecond later.
    expect(staleAt('2026-09-25T23:15:56.000Z')).toEqual([])
    expect(staleAt('2026-09-25T23:15:56.001Z')).toEqual([193])
    // Two days on, every claim with no open PR is stale; the three an open PR carries are not.
    expect(staleAt('2026-09-27T00:00:00.000Z')).toEqual([182, 193, 195, 199, 333, 427])
  })

  it('counts a claim with no claim comment as stale as soon as no open PR carries it', () => {
    expect(staleAt(RECORDED_AT, { ...recorded, openPrs: [] })).toEqual([403, 438])
  })

  it('calls nothing stale without the comments or the open PRs to judge by: a failed read holds every claim', () => {
    const later = '2026-09-27T00:00:00.000Z'
    const unanswered = readClaims({ ...recorded, answer: null, now: later })
    expect(unanswered.map(({ claimedBy, stale }) => [claimedBy, stale])).toEqual(Array(9).fill([null, false]))
    expect(staleAt(later, { ...recorded, openPrs: null })).toEqual([])
    expect(readClaims({ lsRemote: '', answer: null, openPrs: null, now: later })).toEqual([])
  })

  it('an open PR carries #n when it closes #n or its branch is <type>/<n>-…, not when a number merely starts with n', () => {
    const lsRemote = `${'a'.repeat(40)}\trefs/heads/claim/193\n`
    const answer = { data: { repository: { i193: { number: 193, comments: { nodes: [] } } } } }
    const carrier = (pr) => readClaims({ lsRemote, answer, openPrs: [pr], now: RECORDED_AT })[0].openPr
    expect(carrier({ number: 1, headRefName: 'feat/193-vectors-02', closingIssuesReferences: [] })).toBe(1)
    expect(carrier({ number: 2, headRefName: 'docs/other-work', closingIssuesReferences: [{ number: 193 }] })).toBe(2)
    expect(carrier({ number: 3, headRefName: 'feat/1930-other', closingIssuesReferences: [{ number: 19 }] })).toBeNull()
  })
})

describe('claims in ready and projects', () => {
  it('an open claim ref makes a task unpickable with reason `claimed`, label or no label', () => {
    const issues = [open(1, 'foundation'), issue(2, { labels: ['agent-ready', 'in-progress', 'project:foundation'] }), open(3, 'foundation')]
    const plan = planReady(issues, portfolioRows, DEFAULT_ALLOWLIST, [held(1), held(2)])
    expect(picks(plan)).toEqual([3])
    expect(plan.find((task) => task.number === 1)).toMatchObject({ pickable: false, reason: 'claimed' })
    expect(reasonOf(plan, 2)).toBe('claimed')
    expect(picks(planReady(issues, portfolioRows))).toEqual([1, 3]) // without the claims, #1 is picked
  })

  it('a stale claim reads `stale-claim`, and a claim wins over every other reason', () => {
    const issues = [
      open(1, 'spine'), issue(2, { labels: ['agent-ready', 'needs-human', 'project:spine'] }),
      issue(3, { author: 'outsider', labels: ['agent-ready', 'project:spine'] }), open(4, 'spine', { blockedBy: [9] }),
      issue(5, { labels: ['agent-ready', 'project:spine', 'risk:2'] }),
    ]
    const claims = [held(1, { stale: true }), held(2, { stale: true }), held(3), held(4), held(5), held(99)]
    const plan = planReady(issues, portfolioRows, DEFAULT_ALLOWLIST, claims)
    expect([1, 2, 3, 4, 5].map((number) => reasonOf(plan, number)))
      .toEqual(['stale-claim', 'stale-claim', 'claimed', 'claimed', 'claimed'])
    expect(numbers(plan)).toEqual([1, 2, 3, 4, 5]) // a claim on an issue not in the list (closed, say) changes nothing
    expect(numbers(triageTasks(issues, portfolioRows, DEFAULT_ALLOWLIST, claims).filter((task) => task.pickable))).toEqual([])
  })

  it('prints the claim reasons in `ready` like any other', () => {
    const plan = planReady([open(1, 'spine'), open(2, 'spine')], portfolioRows, DEFAULT_ALLOWLIST, [held(1), held(2, { stale: true })])
    expect(formatReady(plan).split('\n')).toEqual(['#1 · spine · Task 1 · claimed', '#2 · spine · Task 2 · stale-claim'])
  })

  it('names each row’s stale claims in `projects`; a row without one prints as before', () => {
    const issues = [open(1, 'harness'), open(2, 'harness'), open(3, 'spine')]
    const summaries = summarizeProjects(issues, portfolioRows, DEFAULT_ALLOWLIST, [held(1, { stale: true }), held(2)])
    expect(summaries.find((row) => row.slug === 'harness')).toMatchObject({ open: 2, ready: 0, staleClaims: [1], next: null })
    expect(summaries.find((row) => row.slug === 'spine')).toMatchObject({ open: 1, ready: 1, staleClaims: [] })
    const lines = formatProjects(summaries).split('\n')
    expect(lines[1]).toBe('harness · open 2 · ready 0 · in-progress 0 · needs-human 0 · stale-claim #1 · next: —')
    expect(lines.find((line) => line.startsWith('spine ·'))).toBe('spine · open 1 · ready 1 · in-progress 0 · needs-human 0 · next: #3 Task 3')
  })
})

describe('the claim and release commands', () => {
  const live = held(531)
  const stale = held(193, { claimedBy: 'grok-bot', at: '2026-09-23T23:15:56Z', stale: true })
  const unsigned = held(403, { claimedBy: null, at: null, stale: true })

  it('writes the claim comment the handoff convention asks for, which latestClaim reads back', () => {
    const body = claimComment({ by: 'claude-local', session: '2026-09-27 review-followups', branch: 'feat/531-exclusive-claims' })
    expect(body).toBe([
      'Claimed by: claude-local', 'Intent: building', 'Session/run: 2026-09-27 review-followups',
      'Branch: feat/531-exclusive-claims', 'Handoff: none',
    ].join('\n'))
    expect(latestClaim([claimNote('mezivillager', body, '2026-09-27T09:00:00Z')])).toMatchObject({
      claimedBy: 'claude-local', intent: 'building', session: '2026-09-27 review-followups',
      branch: 'feat/531-exclusive-claims', handoff: 'none',
    })
    expect(claimComment({ by: 'grok-bot', intent: 'paused:metering', handoff: 'docs/harness/sessions/cloud-queue-inbox.md' }))
      .toBe('Claimed by: grok-bot\nIntent: paused:metering\nHandoff: docs/harness/sessions/cloud-queue-inbox.md')
  })

  it('refuses a holder id that is not one word, and a field that would spill onto a second line', () => {
    expect(() => claimComment({ by: '' })).toThrow(/--by/)
    expect(() => claimComment({ by: 'claude local' })).toThrow(/--by/)
    expect(() => claimComment({ by: 'claude-local', branch: 'feat/1-x\nClaimed by: grok-bot' })).toThrow(/one line/)
  })

  it('tells a second claimant who holds the claim, and how a stale one is freed', () => {
    expect(claimTaken(live)).toMatch(/^claim\/531 is taken; holder: claude-local \(claimed 2026-09-27T08:20:07Z\)$/)
    expect(claimTaken(stale)).toMatch(/grok-bot.*stale.*--force-stale/)
    expect(claimTaken(unsigned)).toMatch(/no claim comment/)
  })

  it('lets the holder release, stale or not, and refuses anyone else by naming the holder', () => {
    expect(releaseRefusal(live, { by: 'claude-local' })).toBeNull()
    expect(releaseRefusal({ ...live, stale: true }, { by: 'claude-local' })).toBeNull()
    expect(releaseRefusal(live, { by: 'grok-bot' })).toMatch(/holder is claude-local .*not grok-bot/)
    expect(releaseRefusal(live, { by: 'grok-bot' })).not.toMatch(/--force-stale/)
    expect(releaseRefusal({ ...live, openPr: 540 }, { by: 'grok-bot', forceStale: true })).toMatch(/not stale.*open PR #540/)
  })

  it('--force-stale releases a stale claim, even one no claim comment names, and nothing else', () => {
    expect(releaseRefusal(stale, { by: 'claude-local' })).toMatch(/--force-stale/)
    expect(releaseRefusal(stale, { by: 'claude-local', forceStale: true })).toBeNull()
    expect(releaseRefusal(unsigned, { by: 'claude-local' })).toMatch(/--force-stale/)
    expect(releaseRefusal(unsigned, { by: 'claude-local', forceStale: true })).toBeNull()
    expect(releaseRefusal(live, { by: 'grok-bot', forceStale: true })).toMatch(/not stale/)
  })

  it('comments only when it frees another holder’s stale claim, saying whose, by whom and why', () => {
    expect(releaseComment(live, { by: 'claude-local' })).toBeNull()
    const body = releaseComment(stale, { by: 'claude-local', reason: 'no PR since the Project 1 slice' })
    expect(body).toMatch(/claim\/193/)
    expect(body).toMatch(/grok-bot/)
    expect(body).toMatch(/claude-local/)
    expect(body).toMatch(/no PR since the Project 1 slice/)
    expect(body).not.toMatch(/^\s*Claimed by:/) // never read back as a claim
    expect(releaseComment(unsigned, { by: 'claude-local' })).toMatch(/no claim comment/)
  })
})

describe('the claim docs', () => {
  const doc = (file) => readFileSync(path.join(import.meta.dirname, '..', file), 'utf8')

  it.each([
    '.claude/skills/ha-next/SKILL.md',
    'docs/harness/implementer-brief.md',
    'docs/harness/sessions/COORDINATOR-HANDOFF.md',
  ])('%s claims with backlog.mjs, states the stale-claim hours, and never pushes or deletes a claim ref by hand', (file) => {
    const text = doc(file)
    expect(text).toContain('node scripts/backlog.mjs claim <n> --by')
    expect(text).toContain(`${STALE_CLAIM_HOURS} h`)
    expect(text).not.toMatch(/git push origin \S+:refs\/heads\/claim/)
    expect(text).not.toMatch(/git push origin --delete claim/)
  })

  it('the builder agent claims with backlog.mjs too, not by pushing the ref', () => {
    const text = doc('.claude/agents/hacer-builder.md')
    expect(text).toContain('node scripts/backlog.mjs claim <n> --by')
    expect(text).not.toMatch(/git push origin \S+:refs\/heads\/claim/)
  })

  it('releases with backlog.mjs where the docs release a claim', () => {
    for (const file of ['.claude/skills/ha-next/SKILL.md', 'docs/harness/sessions/COORDINATOR-HANDOFF.md']) {
      expect(doc(file)).toContain('node scripts/backlog.mjs release <n> --by')
    }
  })
})

// #540 (docs/harness/reviews/2026-09-26/evidence/2-controls.md; reviews/1.md F12): `projects` counts ready what `ready`
// picks, dormant mode is computed, and a row's open agent-ready pile has a cap.
describe('backlog reporting', () => {
  const rowOf = (summaries, slug) => summaries.find((summary) => summary.slug === slug)

  it('counts a task ready only when ready picks it: on-request and not-pulled carry a reason, and are not', () => {
    const issues = [open(1, 'horizon'), open(2, 'surfaces'), open(3, 'core'), open(4, 'spine'),
      open(5, 'core', { blocking: [6] }), open(6, 'spine', { blockedBy: [5] })]
    const summaries = summarizeProjects(issues, portfolioRows)
    // `next` still names the row's first pickable task — what the owner gets on request (docs/harness/mission-control.md)
    expect(rowOf(summaries, 'horizon')).toMatchObject({ open: 1, ready: 0, next: { number: 1, title: 'Task 1' } })
    expect(rowOf(summaries, 'surfaces')).toMatchObject({ open: 1, ready: 0 })
    expect(rowOf(summaries, 'core')).toMatchObject({ open: 2, ready: 1 }) // #5 is pulled by spine's #6; #3 is not-pulled
    expect(rowOf(summaries, 'spine')).toMatchObject({ open: 2, ready: 1 })
    // Across the rows, ready adds up to the picks `ready` lists — on the recorded backlog too.
    for (const backlog of [issues, fixtureIssues]) {
      const total = summarizeProjects(backlog, portfolioRows).reduce((sum, summary) => sum + summary.ready, 0)
      expect(total).toBe(picks(planReady(backlog, portfolioRows)).length)
    }
  })

  it(`is dormant at ${DORMANT_OPEN_PRS} open agent PRs — the allowlist's, drafts too, never Dependabot's — and says so in one banner`, () => {
    const pr = (number, login = DEFAULT_ALLOWLIST[0]) => ({ number, author: { login }, isDraft: number === 2, headRefName: `chore/${number}-x` })
    const four = [pr(1), pr(2), pr(3), pr(4), pr(5, 'app/dependabot')]
    expect(dormantMode(four)).toEqual({ dormant: false, agentPrs: [1, 2, 3, 4] })
    expect(formatDormant(dormantMode(four))).toBeNull()
    expect(dormantMode([...four, pr(6)])).toEqual({ dormant: true, agentPrs: [1, 2, 3, 4, 6] })
    expect(formatDormant(dormantMode([...four, pr(6)]))).toBe('DORMANT MODE — 5 open agent PRs (#1, #2, #3, #4, #6), cap 5: ' +
      'no new PR-producing work; only horizon notes and issue shaping (docs/portfolio.md § Dormant mode)')
    expect(dormantMode([...four, pr(6)], ['bot'])).toEqual({ dormant: false, agentPrs: [] })
    expect(dormantMode(null)).toEqual({ dormant: false, agentPrs: [] })
    // The recorded open PRs: three by the owner's identity, which agents share, and one by Dependabot.
    expect(dormantMode(recorded.openPrs)).toEqual({ dormant: false, agentPrs: [486, 461, 459] })
  })

  it(`counts each row's open agent-ready issues and warns on a row with more than ${ROW_AGENT_READY_CAP}`, () => {
    const many = (count, from, slug) => Array.from({ length: count }, (_, index) => open(from + index, slug))
    const issues = [...many(13, 100, 'harness'), ...many(12, 200, 'spine'), issue(300, { labels: ['project:upkeep'] }),
      issue(301, { labels: ['agent-ready', 'in-progress', 'project:upkeep'] })]
    const summaries = summarizeProjects(issues, portfolioRows)
    expect(rowOf(summaries, 'harness')).toMatchObject({ open: 13, agentReady: 13 })
    expect(rowOf(summaries, 'spine')).toMatchObject({ open: 12, agentReady: 12 })
    expect(rowOf(summaries, 'upkeep')).toMatchObject({ open: 2, ready: 0, agentReady: 1 }) // #300 is unshaped; #301 is taken, still agent-ready
    const lines = formatProjects(summaries).split('\n')
    expect(lines[1]).toBe('harness · open 13 · ready 13 · in-progress 0 · needs-human 0 · over cap: 13 agent-ready > 12 · next: #100 Task 100')
    expect(lines.find((line) => line.startsWith('spine ·'))).toBe('spine · open 12 · ready 12 · in-progress 0 · needs-human 0 · next: #200 Task 200')
    expect(rowOf(summarizeProjects(fixtureIssues, portfolioRows), 'harness').agentReady).toBe(4)
  })

  it('docs/portfolio.md states the dormant cap, why the 7-day half is gone and what replaces it, and the row cap', () => {
    const start = livePortfolio.indexOf('## Dormant mode')
    const dormant = livePortfolio.slice(start, livePortfolio.indexOf('\n## ', start + 1))
    expect(dormant).toContain(`${DORMANT_OPEN_PRS} open agent PRs`)
    expect(dormant).toMatch(/7 days without a human merge/)
    expect(dormant).toMatch(/cannot be computed/)
    expect(dormant).toMatch(/replaces it/)
    expect(livePortfolio).toContain(`more than ${ROW_AGENT_READY_CAP} open \`agent-ready\``)
  })
})

// #555's verifier, nit 3: past a full window the replay starts from a guess, so it can take the wrong one of the three
// foundation slots — and, as the recorded history shows, the wrong aux bucket. readClaimHistory reads older pages until a
// claim fixes the place; historyGap says when none does.
describe('claim history past one window', () => {
  const at = (minute) => new Date(Date.UTC(2026, 8, 27, 12, minute)).toISOString()
  const node = (number, updatedAt, labels = [], comments = []) =>
    ({ number, updatedAt, parent: null, labels: { nodes: labels.map((name) => ({ name })) }, blocking: { nodes: [] }, comments: { nodes: comments } })
  const claimed = (number, slug, when) => node(number, when, ['agent-ready', `project:${slug}`], [claimNote('mezivillager', 'Claimed by: claude-local', when)])
  const page = (nodes, endCursor = null) => ({ data: { repository: { issues: { pageInfo: { hasNextPage: endCursor !== null, endCursor }, nodes } } } })
  /** A full window: the claimed issues, then quiet ones updated at `oldest`, numbered from `from`. */
  const full = (claims, from, oldest) =>
    [...claims, ...Array.from({ length: CLAIM_HISTORY_WINDOW - claims.length }, (_, index) => node(from + index, oldest))]
  const issues = [open(11, 'foundation'), open(21, 'lineage'), open(31, 'harness'), open(41, 'mission-control'),
    open(51, 'spine'), open(61, 'verify')]
  // The verifier's repro: lineage, harness, then foundation claimed; a busy day pushed the first two out of the newest window.
  const newest = page(full([claimed(3, 'foundation', at(50))], 1000, at(40)), 'c1')
  const older = page(full([claimed(2, 'harness', at(30)), claimed(1, 'lineage', at(20))], 2000, at(10)), 'c2')
  const resumed = (answer) => picks(planReady(issues, portfolioRows, DEFAULT_ALLOWLIST, [], claimHistory(answer)))
  const recording = JSON.parse(recordingText('gh-claim-history.json'))

  it('claimHistoryQuery asks for the page info, and for the page after a cursor', () => {
    expect(claimHistoryQuery('mezivillager/hacer')).toContain('pageInfo { hasNextPage endCursor }')
    expect(claimHistoryQuery('mezivillager/hacer')).not.toContain('after:')
    expect(claimHistoryQuery('mezivillager/hacer', 'Y3Vyc29yOnYy'))
      .toContain(`issues(first: ${CLAIM_HISTORY_WINDOW}, after: "Y3Vyc29yOnYy", orderBy: {field: UPDATED_AT, direction: DESC})`)
  })

  it('claimHistory reads pages as one window, kept from the oldest update of them all; an issue listed twice counts once', () => {
    expect(numbers(claimHistory(newest))).toEqual([3])
    expect(numbers(claimHistory([newest, older]))).toEqual([1, 2, 3])
    const repeated = page([claimed(3, 'foundation', at(50)), ...older.data.repository.issues.nodes.slice(0, -1)], 'c2')
    expect(numbers(claimHistory([newest, repeated]))).toEqual([1, 2, 3])
  })

  it('one full window holding only a foundation claim cannot tell which foundation slot, and historyGap says so', () => {
    expect(resumed(newest)).toEqual([21, 31, 11, 41, 51, 61]) // replayed from slot 1: a guess
    expect(historyGap(newest, issues, portfolioRows)).toBe('no claim in the 50 most recently updated issues fixes the slot')
    expect(resumed([newest, older])).toEqual([41, 51, 11, 61, 21, 31]) // the true place, after the lineage and harness claims
    expect(historyGap([newest, older], issues, portfolioRows)).toBeNull()
    expect(historyGap(newest, fixtureIssues, portfolioRows)).toMatch(/fixes the slot or the aux turn$/)
  })

  it('pages that reach the oldest issue hold every claim, so the replay from slot 1 is no guess', () => {
    expect(historyGap(page(full([claimed(3, 'foundation', at(50))], 1000, at(40))), issues, portfolioRows)).toBeNull()
    expect(historyGap({ data: { repository: { issues: { nodes: [claimed(3, 'foundation', at(50))] } } } }, issues, portfolioRows)).toBeNull()
    expect(historyGap(null, issues, portfolioRows)).toBeNull()
    expect(historyGap([], issues, portfolioRows)).toBeNull()
  })

  it('the aux turn is fixed by an aux claim, and unknown only matters while two aux buckets hold a task', () => {
    // The recorded window's claims are harness, lineage and mission-control: they fix the slot, never the aux turn.
    expect(historyGap(recording, fixtureIssues, portfolioRows)) // upkeep and bugs both hold a task
      .toBe('no claim in the 50 most recently updated issues fixes the aux turn')
    expect(historyGap(recording, issues, portfolioRows)).toBeNull() // only verify does
    const auxClaimed = page(full([claimed(4, 'upkeep', at(55)), claimed(2, 'harness', at(30))], 1000, at(10)), 'c1')
    expect(historyGap(auxClaimed, fixtureIssues, portfolioRows)).toBeNull()
  })

  it('readClaimHistory reads older pages until a claim fixes the place, the pages end, or CLAIM_HISTORY_PAGES are read', async () => {
    const reader = (pages) => {
      const asked = []
      return { asked, fetchPage: async (after) => pages[asked.push(after) - 1] }
    }
    const paged = reader([newest, older, page(full([], 3000, at(0)))])
    const read = await readClaimHistory(paged.fetchPage, issues, portfolioRows)
    expect(paged.asked).toEqual([null, 'c1'])
    expect(read).toEqual([newest, older])
    expect(resumePoint(issues, portfolioRows, claimHistory(read))).toMatchObject({ slot: 4, after: { number: 3, bucket: 'foundation' } })

    const fixedAtOnce = reader([older])
    expect(await readClaimHistory(fixedAtOnce.fetchPage, issues, portfolioRows)).toEqual([older])
    expect(fixedAtOnce.asked).toEqual([null])

    const ends = reader([newest, page(full([], 2000, at(10)))])
    const all = await readClaimHistory(ends.fetchPage, issues, portfolioRows)
    expect(ends.asked).toEqual([null, 'c1'])
    expect(historyGap(all, issues, portfolioRows)).toBeNull()

    const endless = reader(Array.from({ length: 20 }, (_, index) => page(full([], (index + 1) * 1000, at(0)), `p${index}`)))
    const capped = await readClaimHistory(endless.fetchPage, issues, portfolioRows)
    expect(capped).toHaveLength(CLAIM_HISTORY_PAGES)
    expect(historyGap(capped, issues, portfolioRows))
      .toBe(`no claim in the ${CLAIM_HISTORY_PAGES * CLAIM_HISTORY_WINDOW} most recently updated issues fixes the slot`)
  })
})
