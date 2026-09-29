import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AUX_ROTATION, PICK_ROTATION, claimHistory, dormantMode, parsePortfolio, planReady, readClaims, summarizeProjects,
} from '../backlog.logic.mjs'
import { VENDORED_PROJECTS } from '../sync-vectors.logic.mjs'
import {
  FLOW_PAGES, SCHEMA_VERSION, archiveDays, buildSnapshot, checksQuery, claimHistoryQuery, claimsQuery, flowQuery, parsePrevious, readFlowPages, report,
  validateSnapshot,
} from './collect.logic.mjs'

// scripts/fixtures/mission-control/ holds recordings of the collector's own calls, taken 2026-09-25 at
// origin/main ed7c983 (the commands are in collect.mjs), trimmed as follows:
//   gh-issues.json     `gh issue list --state open --limit 500 --json <ISSUE_FIELDS>` — 21 of the 163 rows,
//                      chosen so that counting `project:` labels gives the wrong open-task count (last test)
//   gh-prs-open.json   `gh pr list --state open --json <PR_FIELDS>` — all 4 open PRs
//   gh-prs-merged.json `gh pr list --state merged --limit 60 --json <PR_FIELDS>` — 13 of the 60; in both PR files
//                      every comment body keeps only its lines that mention "verdict" or "verified on", the
//                      only lines the parser reads
//   git-claim-refs.txt `git ls-remote origin 'refs/heads/claim/*'` at ~00:20 +03:00, before a sweep released
//                      the four refs on closed issues; gh-claims.json is `gh api graphql` run with
//                      gh-claims.graphql, the query claimsQuery builds for those refs
//   gh-releases.json   the newest 6 rows of `gh release list --limit 1000 --json tagName,publishedAt,isLatest`
//   git-ratchet.json   `git log --format=%H%x09%cI%x09%s -- .dependency-cruiser-known-violations.json`, and each
//                      commit's baseline reduced to the one field read, `rule.name`
//   portfolio.md       docs/portfolio.md at ed7c983, pinned so the pick-rule expectations do not move with it
//   snapshot.json      `collect.mjs --json` whole, at origin/main 561dcf1 on 2026-09-25 (03:16Z): the fixture the
//                      site renders in mission-control/src/*.test.tsx (#473); the last test keeps it valid v1. The
//                      fields v1 declared after it (#540, #539) are spliced in from its own data at its own time, so
//                      its other pins hold: `portfolio.projects[].agentReady` counted from its `tasks.items`,
//                      `pickRule.dormant` from its `prs.open`, `metrics.flow` this collector over gh-flow.json at its
//                      `generatedAt` (a test below holds that), `metrics.conformance` from `git ls-tree 561dcf1`
//   gh-check-runs.json `gh api graphql` run with gh-check-runs.graphql, the query checksQuery builds, whole, at
//                      04:51Z on 2026-09-25 (origin/main 1b01240, its ci still running): the required checks' runs
//                      on main's head and on the 3 open PRs. #507 is MC-6's own PR: its ci and browser-qa runs ran
//                      its code and published their lines; its pr-hygiene runs ran main's copy (pull_request_target)
//   gh-claim-history.json `gh api graphql` run with gh-claim-history.graphql, the query claimHistoryQuery builds, at
//                      10:20Z on 2026-09-27 (origin/main aa4d75a): the 50 most recently updated issues, each comment
//                      body cut to its first non-blank line, the line a claim opens with (#535)
//   gh-flow.json       `gh api graphql` run with gh-flow.graphql, the query flowQuery builds for NOW, both pages, at
//                      11:51Z on 2026-09-27 (origin/main 76bd9bb): all 154 merged PRs, 2026-09-17 to 09-27 — the 118
//                      merged by NOW are the window — one per line, each comment body cut to its first non-blank line,
//                      the line a verdict opens with (#539)
//   gh-pages-history.json `git ls-tree --name-only origin/gh-pages control/history/` at 11:14Z on 2026-09-29 (`names`,
//                      all 37), and `git show` of the archived snapshots archiveDays picks for 2026-09-29T08:21:27.364Z,
//                      each reduced to the fields read: `generatedAt`, `freshness.tasks`, `tasks.byProject` (#478)
//   snapshot-2026-09-29.json the newest of those names, whole, as archived: the fixture the charts render (#478), since
//                      snapshot.json predates the archive. Its `metrics.openTasks` is spliced in, this collector over
//                      gh-pages-history.json at its own `generatedAt`; snapshot.json's is [], the archive not yet begun
// The process records (ledger, sessions, ADRs, roadmap, cloud inbox) are read live, as
// backlog.logic.test.mjs reads docs/portfolio.md: a format change there fails here, not silently in the site.

const ROOT = path.join(import.meta.dirname, '..', '..')
const FIXTURES = path.join(ROOT, 'scripts', 'fixtures', 'mission-control')
const fixtureText = (file) => readFileSync(path.join(FIXTURES, file), 'utf8')
const fixture = (file) => JSON.parse(fixtureText(file))
const repoText = (file) => readFileSync(path.join(ROOT, file), 'utf8')
const repoDir = (dir) => readdirSync(path.join(ROOT, dir)).filter((file) => file.endsWith('.md'))
  .map((file) => ({ file: `${dir}/${file}`, text: repoText(`${dir}/${file}`) }))

/** conformance/vectors/, read live as collect.mjs reads it: every file, relative to it. */
const vectorFiles = (dir = path.join(ROOT, 'conformance', 'vectors')) => readdirSync(dir, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile()).map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))

const ratchet = fixture('git-ratchet.json')
const ok = (source, value) => ({ source, value })
const failed = (source, error) => ({ source, error })
const NOW = '2026-09-25T00:30:00.000Z'
const LATER = '2026-09-25T01:30:00.000Z'
const HEAD = { sha: 'ed7c98349226a302e1a0ef449069f14bfe5599ee', date: '2026-09-25T00:21:37+03:00', subject: 'docs(research): …' }

/** Every input the collector gathers, in the shape collect.mjs hands over: {source, value} or {source, error}. */
function inputs(overrides = {}) {
  return {
    issues: ok('gh issue list --state open', fixture('gh-issues.json')),
    prsOpen: ok('gh pr list --state open', fixture('gh-prs-open.json')),
    prsMerged: ok('gh pr list --state merged --limit 60', fixture('gh-prs-merged.json')),
    claimRefs: ok('git ls-remote origin refs/heads/claim/*', fixtureText('git-claim-refs.txt')),
    claimIssues: ok('gh api graphql', fixture('gh-claims.json')),
    claimHistory: ok('gh api graphql (claim history)', fixture('gh-claim-history.json')),
    releases: ok('gh release list', fixture('gh-releases.json')),
    ratchetLog: ok('git log -- .dependency-cruiser-known-violations.json', ratchet),
    baseline: ok('.dependency-cruiser-known-violations.json', ratchet.rows['d9ce783867491b811fceaf225e3dad54479483da']),
    portfolio: ok('docs/portfolio.md', fixtureText('portfolio.md')),
    ledger: ok('docs/harness/ledger.md', repoText('docs/harness/ledger.md')),
    inbox: ok('docs/harness/sessions/cloud-queue-inbox.md', repoText('docs/harness/sessions/cloud-queue-inbox.md')),
    roadmap: ok('docs/roadmap/README.md', repoText('docs/roadmap/README.md')),
    sessions: ok('docs/harness/sessions', repoDir('docs/harness/sessions')),
    adrs: ok('docs/decisions', repoDir('docs/decisions')),
    checkRuns: ok('gh api graphql (check runs)', fixture('gh-check-runs.json')),
    flowPrs: ok('gh api graphql (flow)', fixture('gh-flow.json')),
    vectors: ok('conformance/vectors', vectorFiles()),
    archive: ok('git show origin/gh-pages:control/history', fixture('gh-pages-history.json').snapshots),
    ...overrides,
  }
}
const build = (overrides, options = {}) => buildSnapshot(inputs(overrides), { now: NOW, head: HEAD, ...options })
const verdictsOf = (prs, number) =>
  prs.find((pr) => pr.number === number).verdicts.map(({ verdict, round, model }) => [verdict, round, model])
const comment = (login, body) => ({ author: { login }, body, createdAt: NOW, url: `https://example.test/${login}` })

describe('collect.logic', () => {
  it('builds the portfolio section by calling backlog.logic.mjs (projects + ready) — no second pick rule', () => {
    const issues = fixture('gh-issues.json')
    const rows = parsePortfolio(fixtureText('portfolio.md'))
    const claims = readClaims({
      lsRemote: fixtureText('git-claim-refs.txt'), answer: fixture('gh-claims.json'), openPrs: fixture('gh-prs-open.json'), now: NOW,
    })
    const history = claimHistory(fixture('gh-claim-history.json'))
    const plan = planReady(issues, rows, undefined, claims, history)
    const snapshot = build()

    // Every field but the four the collector adds is summarizeProjects' own, whatever fields it grows (#540: agentReady).
    const summaries = snapshot.portfolio.projects.map(({ rank, lane, title, subIssues, ...summary }) => summary)
    expect(summaries).toEqual(summarizeProjects(issues, rows, undefined, claims, history))
    expect(snapshot.portfolio.projects.map(({ rank, lane }) => ({ rank, lane }))).toEqual(rows.map(({ rank, lane }) => ({ rank, lane })))
    expect(snapshot.tasks.items).toEqual(plan)
    expect(snapshot.pickRule).toEqual({
      rotation: PICK_ROTATION,
      auxRotation: AUX_ROTATION,
      next: plan.filter((task) => task.reason === null).map(({ number, title, project }) => ({ number, title, project })),
      dormant: dormantMode(fixture('gh-prs-open.json')),
    })
    expect(snapshot.pickRule.next.length).toBeGreaterThan(5) // the fixture exercises the rotation, not an empty plan

    // The row's epic brings its title and its sub-issue counts; a row whose epic is not in the recording has none.
    expect(snapshot.portfolio.projects.find((project) => project.slug === 'harness')).toMatchObject({
      title: 'Epic: harness — autonomous-run improvements & agent-readiness',
      subIssues: { completed: 19, percentCompleted: 42, total: 45 },
    })
    expect(snapshot.portfolio.projects.find((project) => project.slug === 'spine')).toMatchObject({ title: null, subIssues: null })
  })

  // #531 (FINDINGS F2): claim/193 stood without an `in-progress` label and #193 was the first row of `ready`. The
  // pick sections read the claims `ready` reads, so the snapshot cannot offer a held issue either.
  it('reads the claims ready reads: `claimed` label or no label, `stale-claim` 48 h on with no open PR', () => {
    const reasons = (snapshot) => [182, 193, 438].map((number) => snapshot.tasks.items.find((task) => task.number === number).reason)
    const unread = build({ claimRefs: ok('git ls-remote origin refs/heads/claim/*', '') })
    expect(unread.pickRule.next[0].number).toBe(193)
    expect(reasons(unread)).toEqual(['in-progress', null, 'in-progress'])

    const snapshot = build()
    expect(reasons(snapshot)).toEqual(['claimed', 'claimed', 'claimed'])
    expect(snapshot.pickRule.next.map((task) => task.number)).not.toContain(193)
    expect(snapshot.portfolio.projects.find((project) => project.slug === 'foundation').next.number).not.toBe(193)

    // Two days on, #182 and #193 have no open PR and go stale; #438's open PR #461 keeps it held.
    const later = build({}, { now: '2026-09-27T00:00:00.000Z' })
    expect(reasons(later)).toEqual(['stale-claim', 'stale-claim', 'claimed'])
    expect(later.portfolio.projects.find((project) => project.slug === 'foundation').staleClaims).toEqual([182, 193])

    // Without the claim comments nothing can be judged stale, and the pick sections say what they could not read.
    const unanswered = build({ claimIssues: failed('gh api graphql', 'HTTP 403') }, { now: '2026-09-27T00:00:00.000Z' })
    expect(reasons(unanswered)).toEqual(['claimed', 'claimed', 'claimed'])
    for (const name of ['portfolio', 'pickRule', 'tasks']) {
      expect(unanswered.freshness[name]).toMatchObject({ status: 'partial', error: 'claimIssues: HTTP 403' })
    }
  })

  // #535: the cycle continues across calls from the claims made before, and the snapshot resumes it where `ready` does.
  it('resumes the cycle where ready does, from the claim history; without it, starts at slot 1 and says partial', () => {
    // The recording predates the page info (#540); the query is otherwise the one it was run with.
    expect(claimHistoryQuery('mezivillager/hacer').replace(' pageInfo { hasNextPage endCursor }', ''))
      .toBe(fixtureText('gh-claim-history.graphql').trim())
    const next = (snapshot) => snapshot.pickRule.next.map((task) => `${task.number} ${task.project}`)
    const snapshot = build()
    // The recording's latest claim is #537, harness, the cycle's third slot: it resumes at the fourth, foundation.
    expect(next(snapshot)).toEqual(['217 foundation', '175 spine', '315 foundation', '253 upkeep', '331 foundation',
      '148 harness', '373 foundation', '149 harness'])

    const unread = build({ claimHistory: failed('gh api graphql (claim history)', 'HTTP 502') })
    expect(next(unread)).toEqual(['217 foundation', '148 harness', '315 foundation', '175 spine', '331 foundation',
      '253 upkeep', '373 foundation', '149 harness'])
    expect(unread.tasks.items.map((task) => task.number).sort()).toEqual(snapshot.tasks.items.map((task) => task.number).sort())
    for (const name of ['portfolio', 'pickRule', 'tasks']) {
      expect(unread.freshness[name]).toMatchObject({ status: 'partial', error: 'claimHistory: HTTP 502' })
    }
  })

  // #540: ready's dormant banner and its claim-history warning reach the snapshot too.
  it('carries ready’s dormant mode in pickRule, and marks the pick sections partial when the claim history cannot fix the place', () => {
    const recordedPrs = fixture('gh-prs-open.json')
    expect(build().pickRule.dormant).toEqual({ dormant: false, agentPrs: [486, 461, 459] }) // #410 is Dependabot's
    const five = [...recordedPrs, { ...recordedPrs[0], number: 900 }, { ...recordedPrs[0], number: 901 }]
    expect(build({ prsOpen: ok('gh pr list --state open', five) }).pickRule.dormant).toEqual({ dormant: true, agentPrs: [486, 461, 459, 900, 901] })

    const recording = fixture('gh-claim-history.json')
    const unclaimed = { data: { repository: { issues: { nodes: recording.data.repository.issues.nodes.map((issue) => ({ ...issue, comments: { nodes: [] } })) } } } }
    const blind = build({ claimHistory: ok('gh api graphql (claim history)', unclaimed) })
    for (const name of ['portfolio', 'pickRule', 'tasks']) {
      expect(blind.freshness[name]).toMatchObject({ status: 'partial', error: 'claimHistory: no claim in the 50 most recently updated issues fixes the slot' })
    }
    // The recording's claims fix the slot, and only upkeep holds a task in the aux slot: nothing is a guess.
    expect(build().freshness.pickRule).toMatchObject({ status: 'ok' })
  })

  it('parses verdicts from the "## Verifier verdict:" heading, including round and model, and counts merged PRs without one', () => {
    const { prs } = build()
    const opus = 'Opus 5 (claude-opus-5[1m])'
    // `## Verifier verdict: BLOCK`, then `(round 2, `e8ba8c2`): BLOCK`, then `(round 3, `2bbfbdc`): PASS`
    expect(verdictsOf(prs.merged, 399)).toEqual([['BLOCK', 1, opus], ['BLOCK', 2, opus], ['PASS', 3, opus]])
    // `(re-review of `9a415cf`)` states no round: the verdict's position among the PR's verdicts is its round
    expect(verdictsOf(prs.merged, 396)).toEqual([['BLOCK', 1, opus], ['PASS', 2, opus]])
    // `Verified on **Opus**.` — no colon, bold — and later prose that says "verified on" is not the field
    expect(verdictsOf(prs.merged, 351)).toEqual([
      ['BLOCK', 1, 'Opus'], ['BLOCK', 2, 'Opus 5 (claude-opus-5)'], ['PASS', 3, opus],
    ])
    expect(verdictsOf(prs.merged, 451)).toEqual([['PASS', 1, 'Claude Opus 5.5 (claude-opus-5-5[1m])']])
    expect(verdictsOf(prs.merged, 434)).toEqual([['PASS', 1, 'Sonnet 5 (Claude, claude-sonnet-5)']])
    expect(verdictsOf(prs.merged, 422)).toEqual([['PASS', 1, 'Grok Bot (executor subagent)']])
    expect(verdictsOf(prs.merged, 387)).toEqual([['PASS', 1, 'Sonnet 5 (claude-sonnet-5)']]) // plain `Verified on:`, at the foot
    expect(verdictsOf(prs.merged, 347)).toEqual([['PASS', 1, null]]) // before the brief asked for the model
    expect(verdictsOf(prs.merged, 423)).toEqual([]) // `**VERDICT: PASS**` is not the brief's heading
    expect(verdictsOf(prs.merged, 358)).toEqual([]) // nor is a design review's `**Verdict: `accept …`.**`
    expect(prs.merged.find((pr) => pr.number === 399).verdicts[1]).toEqual({
      verdict: 'BLOCK', round: 2, model: opus, at: '2026-09-23T04:16:44Z',
      url: 'https://github.com/mezivillager/hacer/pull/399#issuecomment-5788949503',
    })
    expect(prs.coverage).toEqual({ merged: 13, withVerdict: 9, withoutVerdict: 4, pass: 8, block: 1 })
    expect(prs.open.map((pr) => pr.verdicts)).toEqual([[], [], [], []]) // "Verification interrupted — not a verdict."
    expect(prs.merged.find((pr) => pr.number === 451)).toMatchObject({
      author: 'mezivillager', closes: [180, 450], labels: ['released', 'risk:1', 'project:foundation'],
      headRefName: 'fix/180-signal-display-layering', mergedAt: '2026-09-24T13:41:36Z',
    })

    // A bold verdict word still counts; a heading posted by an author off the allowlist does not.
    const [pr] = fixture('gh-prs-open.json')
    const edited = { ...pr, comments: [comment('mezivillager', '## Verifier verdict: **PASS**\n**Verified on:** Sonnet 5'),
      comment('outsider', '## Verifier verdict: BLOCK\n**Verified on:** Opus 5')] }
    expect(verdictsOf(build({ prsOpen: ok('gh pr list --state open', [edited]) }).prs.open, pr.number))
      .toEqual([['PASS', 1, 'Sonnet 5']])
  })

  it('joins claim refs to issue state and to the latest claim-comment fields; flags refs on closed issues', () => {
    expect(claimsQuery('mezivillager/hacer', fixtureText('git-claim-refs.txt'))).toBe(fixtureText('gh-claims.graphql').trim())
    expect(claimsQuery('mezivillager/hacer', '')).toBeNull()

    const { claims } = build()
    expect(claims.items.map(({ number, state, onClosedIssue }) => [number, state, onClosedIssue])).toEqual([
      [182, 'OPEN', false], [193, 'OPEN', false], [195, 'CLOSED', true], [199, 'CLOSED', true], [333, 'CLOSED', true],
      [403, 'OPEN', false], [427, 'CLOSED', true], [438, 'OPEN', false], [482, 'OPEN', false],
    ])
    expect(claims.onClosedIssues).toBe(4)
    expect(claims.items[0]).toMatchObject({
      ref: 'refs/heads/claim/182', sha: '8909e66d525e0f6a60a9877d8cf5140594c20b65',
      claim: {
        claimedBy: 'claude-local', intent: 'paused:owner-stopped-run', session: '2026-09-24 hacer-loop-93',
        branch: 'fix/182-chip-completion-to-session', handoff: 'docs/harness/sessions/2026-09-24.md',
        author: 'mezivillager', at: '2026-09-24T13:57:40Z',
      },
    })
    // Two in-progress claims carry no claim comment; #482's comment has no Handoff line.
    expect(claims.items.filter((item) => item.claim === null).map((item) => item.number)).toEqual([403, 438])
    expect(claims.items.at(-1).claim).toMatchObject({ claimedBy: 'claude-local', intent: 'building', handoff: null })
    // Fields only, never bodies: #193's claim comment goes on to mention a meter reading.
    expect(JSON.stringify(fixture('gh-claims.json'))).toMatch(/Spending before-shot/)
    expect(JSON.stringify(claims)).not.toMatch(/Spending/)

    // The latest claim comment wins, and one written by an author off the allowlist is not a claim.
    const answer = fixture('gh-claims.json')
    answer.data.repository.i182.comments.nodes.push(
      comment('mezivillager', 'Claimed by: claude-local\nIntent: building   # resumed\nSession/run: r2\nBranch: fix/182-x'),
      comment('outsider', 'Claimed by: outsider\nIntent: building'),
    )
    const resumed = build({ claimIssues: ok('gh api graphql', answer) }).claims.items[0].claim
    expect(resumed).toMatchObject({ claimedBy: 'claude-local', intent: 'building', session: 'r2', handoff: null })
  })

  it('derives the ratchet history from git log of the baseline file', () => {
    const { ratchet: metric } = build().metrics
    expect(metric.history.map(({ sha, count }) => [sha.slice(0, 7), count])).toEqual([
      ['c3638a0', 34], ['c5d43df', 77], ['3fca1b3', 72], ['d9ce783', 71],
    ])
    expect(metric.history[0]).toEqual({
      sha: 'c3638a0539d43c7f3c5333c7ccf16d4e8c0e2785', date: '2026-09-23T03:15:54+03:00',
      subject: 'feat(guards): layer rules as a shrink-only ratchet in lint', count: 34,
    })
    expect(metric.count).toBe(71)
    expect(metric.byRule).toEqual({
      'core-through-index': 43, 'engine-no-state': 9, 'no-circular': 7, 'src-no-e2e': 2, 'state-no-3d': 2, 'state-no-ui': 8,
    })
  })

  it('carries the releases and the merges per day of prs.merged in metrics', () => {
    const { metrics } = build()
    expect(metrics.releases).toHaveLength(6)
    expect(metrics.releases[0]).toEqual({ tag: 'v2.29.1', publishedAt: '2026-09-24T13:43:55Z', isLatest: true })
    expect(metrics.mergesPerDay).toEqual([
      { date: '2026-09-21', merges: 1 }, { date: '2026-09-23', merges: 7 }, { date: '2026-09-24', merges: 5 },
    ])
  })

  it('records per-section freshness {source, fetchedAt, ok|partial|error}; a failing section keeps last-known data and is flagged', () => {
    const good = build()
    expect(Object.values(good.freshness).map((record) => record.status)).toEqual(Array(13).fill('ok'))
    expect(good.freshness.prs).toEqual({
      source: 'gh pr list --state open · gh pr list --state merged --limit 60', fetchedAt: NOW, status: 'ok',
    })
    expect(good.freshness.checks).toEqual({ source: 'gh api graphql (check runs)', fetchedAt: NOW, status: 'ok' })
    expect(good.checks.items).toHaveLength(10) // main's ci, and the three checks on each of 3 open PRs
    expect(good.lineage).toEqual({ until: 'DL-7', items: [] })

    // An hour later: the issue list is rate-limited, GraphQL answers 403, and the open-PR JSON has drifted.
    const failing = {
      issues: failed('gh issue list --state open', 'HTTP 403: API rate limit exceeded'),
      claimIssues: failed('gh api graphql', 'HTTP 403: Resource not accessible by integration'),
      prsOpen: ok('gh pr list --state open', [{ number: 7 }]),
    }
    const next = build(failing, { now: LATER, previous: good })
    for (const name of ['portfolio', 'pickRule', 'tasks', 'prs']) expect(next[name]).toEqual(good[name])
    expect(next.freshness.portfolio).toEqual({
      source: 'docs/portfolio.md · gh issue list --state open · git ls-remote origin refs/heads/claim/* · gh api graphql · ' +
        'gh pr list --state open · gh api graphql (claim history)',
      fetchedAt: NOW, status: 'error', error: 'issues: HTTP 403: API rate limit exceeded',
    })
    expect(next.freshness.prs).toMatchObject({ fetchedAt: NOW, status: 'error', error: expect.stringMatching(/^could not build: /) })
    // Claims still come from the refs, flagged partial: no issue state and no claim fields without GraphQL.
    expect(next.freshness.claims).toMatchObject({
      fetchedAt: LATER, status: 'partial', error: 'claimIssues: HTTP 403: Resource not accessible by integration',
    })
    expect(next.claims.items[2]).toMatchObject({ number: 195, state: null, onClosedIssue: null, claim: null })
    expect(next.freshness.ledger).toMatchObject({ fetchedAt: LATER, status: 'ok' })
    // Freshness, not failure: the snapshot still validates and the run succeeds.
    expect(validateSnapshot(next)).toEqual([])
    expect(report(next)).toEqual({
      exitCode: 0, stderr: '',
      stdout: 'MISSION-CONTROL: VALID schema 1 · ok 8 · partial 1 (claims) · error 4 (portfolio, pickRule, tasks, prs)',
    })

    // With no last-known snapshot, a failed section is empty, says why, and has never been fetched.
    const cold = build(failing, { now: LATER })
    expect(cold.portfolio).toEqual({ projects: [] })
    expect(cold.freshness.portfolio).toMatchObject({ fetchedAt: null, status: 'error' })
    expect(validateSnapshot(cold)).toEqual([])
  })

  it('validates the snapshot against schemaVersion 1; an invalid snapshot fails the run', () => {
    const snapshot = build()
    expect(snapshot.schemaVersion).toBe(SCHEMA_VERSION)
    expect(SCHEMA_VERSION).toBe(1)
    expect(validateSnapshot(snapshot)).toEqual([])
    expect(report(snapshot, { json: true })).toEqual({
      exitCode: 0, stdout: JSON.stringify(snapshot, null, 2),
      stderr: 'MISSION-CONTROL: VALID schema 1 · ok 13 · partial 0 · error 0',
    })

    const { claims, ...withoutClaims } = snapshot
    expect(claims.items.length).toBeGreaterThan(0)
    const invalid = {
      ...withoutClaims,
      schemaVersion: 2,
      prs: { ...snapshot.prs, coverage: { ...snapshot.prs.coverage, merged: '13' } },
      freshness: { ...snapshot.freshness, ledger: { ...snapshot.freshness.ledger, status: 'stale' } },
    }
    expect(validateSnapshot(invalid)).toEqual([
      'schemaVersion must be 1',
      'freshness.ledger.status must be ok|partial|error',
      'prs.coverage.merged must be a number',
      'claims must be an object',
    ])
    const run = report(invalid, { json: true })
    expect(run.exitCode).toBe(1)
    expect(run.stdout).toBe('') // an invalid snapshot is never printed
    expect(run.stderr.split('\n')).toEqual([
      'MISSION-CONTROL: INVALID schema 2 · ok 12 · partial 0 · error 0',
      '  invalid: schemaVersion must be 1',
      '  invalid: freshness.ledger.status must be ok|partial|error',
      '  invalid: prs.coverage.merged must be a number',
      '  invalid: claims must be an object',
    ])
  })

  it('reads the process records — cloud lane, sessions, ledger, ADRs, roadmap — from the repo\'s own files', () => {
    const snapshot = build()
    expect(snapshot.adrs.items.find((adr) => adr.number === 20)).toMatchObject({
      file: 'docs/decisions/0020-spec-only-writes-read-only-projections.md',
      title: 'Spec-only writes, read-only projections', status: expect.stringMatching(/^Accepted/),
    })
    expect(snapshot.adrs.items.every((adr) => adr.number > 0 && adr.title && adr.status)).toBe(true) // not the template

    expect(snapshot.sessions.items).toContainEqual(expect.objectContaining({
      file: 'docs/harness/sessions/2026-09-18.md', date: '2026-09-18', kind: 'record',
      title: expect.stringMatching(/^Session record — 2026-09-18: /),
    }))
    expect(snapshot.sessions.items).toContainEqual(expect.objectContaining({
      file: 'docs/harness/sessions/2026-09-23-grok-bot-cloud-trial-handoff.md', kind: 'handoff', status: 'done',
    }))
    expect(snapshot.sessions.items.map((item) => item.file)).not.toContain('docs/harness/sessions/COORDINATOR-HANDOFF.md')

    const { ledger } = snapshot
    expect(ledger.items.length).toBeGreaterThan(50)
    // #469: the ledger gained Id and Decision columns — Id first, Decision last (docs/harness/ledger.md).
    expect(Object.keys(ledger.items[0])).toEqual(['id', 'date', 'whatWentWrong', 'shouldHaveBeenCaughtBy', 'mechanised', 'decision'])
    expect(ledger.items[0]).toMatchObject({ id: 'L001', date: '2026-09-18', decision: '—' })
    expect(ledger.items.some((row) => row.decision !== '—')).toBe(true)
    expect(Object.values(ledger.byMechanised).reduce((sum, count) => sum + count, 0)).toBe(ledger.items.length)
    expect(ledger.byMechanised.yes).toBeGreaterThan(ledger.byMechanised.no)

    expect(snapshot.roadmap.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(snapshot.roadmap.phases).toContainEqual(expect.objectContaining({
      phase: '0.5', group: 'Active Phase Sequence', doc: 'docs/roadmap/phases/phase-0.5-nand2tetris-foundation.md',
    }))

    // The cloud lane is the inbox's table and nothing else: the meter reading under it never reaches the snapshot.
    const inbox = [
      '| Issue | Claim status | Status | Cloud agent id | Notes |', '|---|---|---|---|---|',
      '| [#193](https://github.com/mezivillager/hacer/issues/193) | claimed-by-grok-bot | building | bc-6de6 | `ls a \\| wc -l` |',
      '', '**Spending before-shot 2026-09-24 ~03:54 EAT:** Cursor Models 5% / Other Models 94%',
    ].join('\n')
    const { cloudLane } = build({ inbox: ok('inbox', inbox) })
    expect(cloudLane.items).toEqual([{
      number: 193, issue: '[#193](https://github.com/mezivillager/hacer/issues/193)', claimStatus: 'claimed-by-grok-bot',
      status: 'building', cloudAgentId: 'bc-6de6', notes: '`ls a \\| wc -l`',
    }])
    expect(JSON.stringify(cloudLane)).not.toMatch(/Spending|Other Models/)
    expect(snapshot.cloudLane.items.every((row) => 'claimStatus' in row && 'cloudAgentId' in row)).toBe(true)
  })

  it('a fixture built to yield a wrong open-task count is shown RED before the transform is trusted', () => {
    // gh-issues.json is 21 real rows on which counting `project:` labels — what a GitHub label filter shows —
    // miscounts open tasks: three epics carry project labels (#138, #318, #458), five tasks carry two (#156,
    // #182, #193, #217, #315), and `project:mission-control` has no portfolio row yet (#472, #473).
    const issues = fixture('gh-issues.json')
    const byLabel = {}
    for (const { name } of issues.flatMap((issue) => issue.labels)) {
      if (name.startsWith('project:')) byLabel[name.slice('project:'.length)] = (byLabel[name.slice('project:'.length)] ?? 0) + 1
    }
    const truth = { foundation: 6, harness: 4, spine: 2, upkeep: 1, verify: 1, core: 1, horizon: 1, unfiled: 2 }
    expect(byLabel).not.toEqual(truth) // the fixture does yield a wrong count for the obvious transform

    // RED at the red commit, whose stub filed each issue under every `project:` label it carries, this printed
    //   AssertionError: expected { 'mission-control': 4, …(9) } to deeply equal { foundation: 6, harness: 4, …(6) }
    // with the diff foundation 7 · harness 5 · core 3 · verify 2 · mission-control 4 · surfaces 1 · 3d 1 (spine,
    // upkeep, horizon right; no `unfiled`): 27 "open tasks" where there are 18. If this ever passes because the
    // fixture stopped discriminating, the `not.toEqual` above fails first.
    const snapshot = build()
    const counts = Object.fromEntries(Object.entries(snapshot.tasks.byProject).map(([slug, numbers]) => [slug, numbers.length]))
    expect(counts).toEqual(truth)
    expect(snapshot.tasks.byProject.unfiled).toEqual([472, 473])
    // The portfolio's per-row `open` is the same count, from the same plan.
    const open = Object.fromEntries(snapshot.portfolio.projects.filter((project) => project.open > 0).map((project) => [project.slug, project.open]))
    const { unfiled, ...filed } = truth
    expect(unfiled).toBe(2)
    expect(open).toEqual(filed)
  })
  // 14648c7 changed three behaviours with no test (the MC-1 verifier's note, carried to #473). Each of the three tests
  // below goes red with that commit's hunks in collect.logic.mjs reverted.
  it('a section whose built data leaves schema v1 fails alone: flagged error, last-known data kept, the run still valid', () => {
    const good = build()
    // An open PR whose number arrives as a string: nothing throws, yet prs.open is out of schema.
    const [pr] = fixture('gh-prs-open.json')
    const drifted = build({ prsOpen: ok('gh pr list --state open', [{ ...pr, number: String(pr.number) }]) }, { now: LATER, previous: good })
    expect(drifted.prs).toEqual(good.prs)
    expect(drifted.freshness.prs).toEqual({
      source: 'gh pr list --state open · gh pr list --state merged --limit 60', fetchedAt: NOW, status: 'error',
      error: 'could not build: prs.open[0].number must be a number',
    })
    // pickRule reads the open PRs too, for dormant mode (#540): once v1 declares `dormant` (#539), its numbers leave
    // schema with them and pickRule keeps its last-known data as well; every other section stands.
    expect(drifted.pickRule).toEqual(good.pickRule)
    expect(report(drifted)).toEqual({
      exitCode: 0, stderr: '', stdout: 'MISSION-CONTROL: VALID schema 1 · ok 11 · partial 0 · error 2 (pickRule, prs)',
    })
  })

  it('a verdict or a claim must open its comment: the heading or first field quoted further down is neither', () => {
    const [pr] = fixture('gh-prs-open.json')
    const quoting = comment('mezivillager', 'The brief asks the verifier to open with\n## Verifier verdict: PASS\nwhich this is not.')
    expect(build({ prsOpen: ok('gh pr list --state open', [{ ...pr, comments: [quoting] }]) }).prs.open[0].verdicts).toEqual([])

    const answer = fixture('gh-claims.json')
    answer.data.repository.i182.comments.nodes.push(comment('mezivillager', 'Next time, claim with:\nClaimed by: grok-bot\nIntent: building'))
    const { claim } = build({ claimIssues: ok('gh api graphql', answer) }).claims.items[0]
    expect(claim).toMatchObject({ claimedBy: 'claude-local', intent: 'paused:owner-stopped-run' }) // still the real claim
  })

  it('a ref under claim/ that is not claim/<n> is skipped, in the GraphQL query and in the section', () => {
    const refs = `${fixtureText('git-claim-refs.txt')}8909e66d525e0f6a60a9877d8cf5140594c20b65\trefs/heads/claim/notes\n`
    expect(claimsQuery('mezivillager/hacer', refs)).toBe(fixtureText('gh-claims.graphql').trim())
    expect(build({ claimRefs: ok('git ls-remote origin refs/heads/claim/*', refs) }).claims.items.map((item) => item.number))
      .toEqual([182, 193, 195, 199, 333, 403, 427, 438, 482])
  })

  it('the site\'s fixture, snapshot.json, is a valid schema v1 snapshot', () => {
    const site = fixture('snapshot.json')
    expect(validateSnapshot(site)).toEqual([])
    // Its metrics.flow, spliced in, is this collector's over the recording at the fixture's own time (#539).
    expect(site.metrics.flow).toEqual(build({}, { now: site.generatedAt }).metrics.flow)
    expect(site.metrics.openTasks).toEqual(build({}, { now: site.generatedAt }).metrics.openTasks)
  })

  it('the charts\' fixture, snapshot-2026-09-29.json, is a valid schema v1 snapshot; its openTasks is this collector\'s', () => {
    const site = fixture('snapshot-2026-09-29.json')
    expect(validateSnapshot(site)).toEqual([])
    expect(site.metrics.openTasks).toEqual(build({}, { now: site.generatedAt }).metrics.openTasks)
  })

  // MC-6 (#477): each required check publishes its line as a notice — an annotation on its own check run.
  it('reads each required check\'s published line from its newest run on main\'s head and on every open PR\'s', () => {
    expect(checksQuery('mezivillager/hacer')).toBe(fixtureText('gh-check-runs.graphql').trim())
    const { checks } = build()
    // main's ci was still running; #410 and #496 ran before MC-6; #507's pr-hygiene runs were main's copy.
    expect(checks.items.map(({ pr, check, conclusion, verdict }) => [pr, check, conclusion, verdict])).toEqual([
      [null, 'ci', null, null],
      [410, 'pr-hygiene', 'SUCCESS', null], [410, 'browser-qa', 'SUCCESS', null], [410, 'ci', 'SUCCESS', null],
      [496, 'pr-hygiene', 'SUCCESS', null], [496, 'browser-qa', 'SUCCESS', null], [496, 'ci', 'SUCCESS', null],
      [507, 'pr-hygiene', 'SUCCESS', null], [507, 'browser-qa', 'SUCCESS', 'SKIPPED'], [507, 'ci', 'SUCCESS', 'PASS'],
    ])
    const ratchet = 'LAYER-RATCHET: 71 known violations (39 production edges · 25 test-only · 7 cycle edges in 3 cycles) · ' +
      '8 engine globals suppressed · 0 new'
    expect(checks.items.filter((item) => item.line !== null).map((item) => item.line))
      .toEqual(['BROWSER-QA: skipped (no critical paths)', ratchet])
    expect(checks.items.at(-1)).toEqual({
      pr: 507, sha: 'a7ebb775729f1170cf88fce8a99b7285ebe1b012', check: 'ci', conclusion: 'SUCCESS', completedAt: '2026-09-25T04:51:05Z',
      url: 'https://github.com/mezivillager/hacer/actions/runs/36095931702/job/107948090620',
      line: ratchet, verdict: 'PASS', fields: { known: 71, new: 0 }, disagrees: false,
    })
    // A run still going has no conclusion and no line yet; main's head never runs pr-hygiene or browser-qa.
    expect(checks.items[0]).toMatchObject({ pr: null, sha: '1b012400aa3dbcaa5ef9977c97f8ee389351326a', completedAt: null, line: null, fields: {} })
  })

  it('reads the newest run of each check, as GitHub judges a required context — and only that check\'s own line', () => {
    const answer = fixture('gh-check-runs.json')
    const runsOf = (number) => answer.data.repository.pullRequests.nodes.find((pr) => pr.number === number)
      .commits.nodes[0].commit.statusCheckRollup.contexts.nodes
    // The rollup lists #496's two browser-qa runs oldest first, so the obvious `find` would read the older one.
    const [older, newer] = runsOf(496).filter((run) => run.name === 'browser-qa')
    expect(older.databaseId).toBeLessThan(newer.databaseId)
    expect(build().checks.items.find((item) => item.pr === 496 && item.check === 'browser-qa').url).toMatch(new RegExp(`/job/${newer.databaseId}$`))

    // Once MC-6 is on main, #507's own pr-hygiene run carries what the run dispatched from its branch published
    // (36095970389). Given that line on the newer of #507's two runs, it is read — not the older run's none.
    const [first, latest] = runsOf(507).filter((run) => run.name === 'pr-hygiene')
    latest.annotations.nodes.unshift({ message: 'HYGIENE: PASS reviewable=81 test=107 excluded=0 files=7 issue=#477 linked=fixes' })
    // A HYGIENE line on the ci run is not pr-hygiene's, and the runner's own notice, on every run, is never a line.
    runsOf(507).find((run) => run.name === 'ci').annotations.nodes.unshift({ message: 'HYGIENE: FAIL reviewable=999' })
    expect(first.annotations.nodes.map((node) => node.message)).toEqual([expect.stringMatching(/^"The ubuntu-latest label/)])
    const items = build({ checkRuns: ok('gh api graphql (check runs)', answer) }).checks.items.filter((item) => item.pr === 507)
    expect(items.map(({ check, line }) => [check, line?.split(' ').slice(0, 2).join(' ') ?? null])).toEqual([
      ['pr-hygiene', 'HYGIENE: PASS'], ['browser-qa', 'BROWSER-QA: skipped'], ['ci', 'LAYER-RATCHET: 71'],
    ])
    expect(items[0]).toMatchObject({
      url: expect.stringMatching(new RegExp(`/job/${latest.databaseId}$`)), verdict: 'PASS',
      fields: { reviewable: 81, test: 107, excluded: 0, files: 7, issue: '#477', linked: 'fixes' },
    })
  })

  // #507's first verdict: with a rule set to `ignore`, lint:layers exits 1 on the rule's baseline rows (#489) yet still
  // publishes `… 0 new` — this line, measured with core-through-index ignored on the tree rebased onto 77a0d74.
  it('a run that did not succeed never reads PASS: its conclusion wins over its line, whose numbers are kept, flagged', () => {
    const answer = fixture('gh-check-runs.json')
    const ci = answer.data.repository.main.target.statusCheckRollup.contexts.nodes.find((run) => run.name === 'ci')
    const line = 'LAYER-RATCHET: 28 known violations (13 production edges · 8 test-only · 7 cycle edges in 3 cycles) · ' +
      '8 engine globals suppressed · 0 new'
    Object.assign(ci, { conclusion: 'FAILURE', completedAt: '2026-09-25T05:40:00Z', annotations: { nodes: [{ message: line }] } })
    const snapshot = build({ checkRuns: ok('gh api graphql (check runs)', answer) })
    expect(snapshot.checks.items[0]).toMatchObject({
      pr: null, check: 'ci', conclusion: 'FAILURE', line, verdict: 'FAIL', fields: { known: 28, new: 0 }, disagrees: true,
    })
    expect(snapshot.freshness.checks.status).toBe('ok')
    expect(validateSnapshot(snapshot)).toEqual([])
  })

  it('a run whose annotations are null reads no line, and the rest of the section stands', () => {
    const answer = fixture('gh-check-runs.json')
    const runs = answer.data.repository.pullRequests.nodes.find((pr) => pr.number === 410).commits.nodes[0].commit.statusCheckRollup.contexts.nodes
    runs.find((run) => run.name === 'ci').annotations = null // CheckRun.annotations is nullable in GitHub's schema
    const { checks, freshness } = build({ checkRuns: ok('gh api graphql (check runs)', answer) })
    expect(freshness.checks.status).toBe('ok')
    expect(checks.items).toHaveLength(10)
    expect(checks.items.find((item) => item.pr === 410 && item.check === 'ci')).toMatchObject({ conclusion: 'SUCCESS', line: null, verdict: null })
  })

  it('a failed check-runs query keeps the last-known lines, flagged — freshness, not failure', () => {
    const good = build()
    const next = build({ checkRuns: failed('gh api graphql (check runs)', 'HTTP 502: Bad Gateway') }, { now: LATER, previous: good })
    expect(next.checks).toEqual(good.checks)
    expect(next.freshness.checks).toEqual({
      source: 'gh api graphql (check runs)', fetchedAt: NOW, status: 'error', error: 'checkRuns: HTTP 502: Bad Gateway',
    })
    expect(report(next).stdout).toBe('MISSION-CONTROL: VALID schema 1 · ok 12 · partial 0 · error 1 (checks)')
    expect(build({ checkRuns: failed('gh api graphql (check runs)', 'HTTP 502: Bad Gateway') }).checks).toEqual({ items: [] })
  })
})

// #539: the flow numbers brief-measure-flow.mjs computes by hand (docs/harness/reviews/2026-09-26/evidence/), and the
// product's own measure, now in the snapshot.
describe('metrics.flow and metrics.conformance', () => {
  /** A merged PR in flowQuery's shape: merged `hours` after it opened, touching `paths`. */
  const pr = (number, { hours = 1, mergedAt = '2026-09-24T00:00:00.000Z', paths = ['src/core/x.ts'], login = 'mezivillager', comments = [] } = {}) => ({
    number, createdAt: new Date(Date.parse(mergedAt) - hours * 36e5).toISOString(), mergedAt, author: { login },
    files: { nodes: paths.map((file) => ({ path: file })) }, comments: { nodes: comments },
  })
  const flowOf = (nodes) => build({ flowPrs: ok('gh api graphql (flow)', [{ data: { search: { pageInfo: { hasNextPage: false }, nodes } } }]) }).metrics.flow
  const verdict = (word) => comment('mezivillager', `## Verifier verdict: ${word}`)

  it('reads the PRs merged in the 14 days to now in one paged GraphQL query, every page and no more than search serves', async () => {
    expect(flowQuery('mezivillager/hacer', NOW)).toBe(fixtureText('gh-flow.graphql').trim())
    expect(flowQuery('mezivillager/hacer', NOW, 'Y3Vyc29yOjEwMA==')).toContain('type: ISSUE, first: 100, after: "Y3Vyc29yOjEwMA==") {')

    const [first, second] = fixture('gh-flow.json')
    const asked = []
    const pages = await readFlowPages(async (after) => {
      asked.push(after)
      return after ? second : first
    })
    expect(asked).toEqual([null, 'Y3Vyc29yOjEwMA=='])
    expect(pages).toEqual([first, second])
    // A page that always says there is more stops at search's own ceiling, 1,000 results.
    expect(FLOW_PAGES).toBe(10)
    expect(await readFlowPages(async () => first)).toHaveLength(FLOW_PAGES)
  })

  it('metrics.flow: open-to-merge hours, PRs blocked at least once, verdict coverage split code / docs, Dependabot, config', () => {
    // Pinned from a separate count over the same recording by brief-measure-flow.mjs's definitions (its `kind`, its
    // percentile) with the snapshot's verdict (an allowlisted author, the brief's heading): the reference script's own
    // heading reads the same 51 PRs with a verdict and the same 15 blocked in this window.
    expect(build().metrics.flow).toEqual({
      days: 14, since: '2026-09-11T00:30:00.000Z', merged: 118,
      openToMergeHours: { median: 0.3, p90: 12.1 },
      blockedOnce: { count: 15, of: 51, prs: [238, 248, 273, 294, 305, 312, 319, 320, 351, 396, 399, 432, 444, 490, 491] },
      coverage: {
        code: { merged: 56, withVerdict: 41, without: [133, 134, 135, 136, 250, 285, 287, 288, 303, 306, 307, 442, 443, 445, 449] },
        nonCode: {
          merged: 62, withVerdict: 10,
          without: [113, 115, 116, 117, 118, 131, 132, 137, 234, 237, 240, 243, 254, 272, 276, 277, 283, 286, 292, 293, 297, 298, 310,
            314, 341, 343, 346, 348, 350, 354, 358, 393, 411, 412, 413, 414, 416, 423, 425, 426, 428, 439, 440, 441, 446, 447, 463, 464,
            493, 494, 495, 497],
        },
      },
    })
  })

  it('flow definitions: the window, the nearest-rank percentiles, what counts as code, and a PR blocked once however often', () => {
    // [now − 14 days, now], to the millisecond; a PR merged after now (the recording runs to 09-27) is not in it.
    const edges = flowOf([pr(1, { mergedAt: '2026-09-11T00:30:00.000Z' }), pr(2, { mergedAt: '2026-09-11T00:29:59.999Z' }),
      pr(3, { mergedAt: '2026-09-25T00:30:00.001Z' }), pr(4, { mergedAt: NOW })])
    expect([edges.merged, edges.coverage.code.without]).toEqual([2, [1, 4]])

    // Code: anything under src/, mission-control/, scripts/ or .github/, unless Dependabot's; docs only, config,
    // .claude/ and the vendored vectors are not.
    const kinds = flowOf([pr(10, { paths: ['docs/a.md'] }), pr(11, { paths: ['package.json', '.claude/b.md'] }),
      pr(12, { paths: ['package.json'], login: 'dependabot' }), pr(13, { paths: ['.github/workflows/ci.yml'], login: 'dependabot' }),
      pr(14, { paths: ['docs/a.md', 'scripts/c.mjs'] }), pr(15, { paths: ['mission-control/src/App.tsx'] }),
      pr(16, { paths: ['src/components/d.tsx', 'docs/e.md'] }), pr(17, { paths: ['conformance/vectors/01/And.tst'] })])
    expect(kinds.coverage).toEqual({
      code: { merged: 3, withVerdict: 0, without: [14, 15, 16] }, nonCode: { merged: 5, withVerdict: 0, without: [10, 11, 12, 13, 17] },
    })

    // The value at floor(n × p) of the sorted hours, in tenths: of ten, the 6th for the median and the 10th for p90.
    const ten = flowOf([3, 1, 4, 10, 5, 9, 2, 6, 8, 7].map((hours) => pr(hours, { hours: hours + 0.04 })))
    expect(ten.openToMergeHours).toEqual({ median: 6, p90: 10 })
    expect(flowOf([]).openToMergeHours).toEqual({ median: null, p90: null }) // nothing merged: no hours, not zero

    // BLOCK then PASS, or BLOCK twice, is one PR blocked; a BLOCK off the allowlist is none; a qualified heading counts.
    const blocked = flowOf([pr(20, { comments: [verdict('BLOCK'), verdict('PASS')] }),
      pr(21, { comments: [verdict('BLOCK'), verdict('BLOCK'), verdict('PASS')] }),
      pr(22, { comments: [comment('outsider', '## Verifier verdict: BLOCK'), verdict('PASS')] }),
      pr(23, { comments: [comment('mezivillager', '## Verifier verdict (round 2, `abc1234`): BLOCK')] }), pr(24)])
    expect(blocked.blockedOnce).toEqual({ count: 3, of: 4, prs: [20, 21, 23] })
    expect(blocked.coverage.code).toEqual({ merged: 5, withVerdict: 4, without: [24] })
  })

  it('metrics.conformance: the vendored projects under conformance/vectors/ and their files by extension; no runner, so no pass count', () => {
    const listing = ['LICENSE', '01/And.hdl', '01/And.tst', '01/And.cmp', '04/Mult.asm', '04/Mult.tst', '04/Mult.cmp', '04/Fill.tst']
    expect(build({ vectors: ok('conformance/vectors', listing) }).metrics.conformance).toEqual({
      projects: [
        { project: '01', files: 3, byExtension: { hdl: 1, tst: 1, cmp: 1 } },
        { project: '04', files: 4, byExtension: { asm: 1, tst: 2, cmp: 1 } },
      ],
      files: 7, runner: null,
    })
    // Live: the tree holds the projects the sync script vendors, each with its test scripts and compare files.
    const { projects } = build().metrics.conformance
    expect(projects.map((project) => project.project)).toEqual(VENDORED_PROJECTS)
    for (const { byExtension } of projects) expect(byExtension).toMatchObject({ tst: expect.any(Number), cmp: expect.any(Number) })
  })

  it('a failed flow query or vectors listing leaves its field null — never zeros — and metrics partial; the run stays valid', () => {
    const snapshot = build({ flowPrs: failed('gh api graphql (flow)', 'HTTP 502'), vectors: failed('conformance/vectors', 'ENOENT') })
    expect([snapshot.metrics.flow, snapshot.metrics.conformance, snapshot.metrics.ratchet.count]).toEqual([null, null, 71])
    expect(snapshot.freshness.metrics).toMatchObject({ fetchedAt: NOW, status: 'partial', error: 'flowPrs: HTTP 502; vectors: ENOENT' })
    expect(validateSnapshot(snapshot)).toEqual([])
  })

  it('schema v1 declares metrics.flow and metrics.conformance, each an object or null, and #540\'s agentReady and dormant', () => {
    const snapshot = build()
    const { agentReady, ...project } = snapshot.portfolio.projects[0]
    const { dormant, ...pickRule } = snapshot.pickRule
    const { flow, conformance } = snapshot.metrics
    expect([typeof agentReady, dormant]).toEqual(['number', { dormant: false, agentPrs: [486, 461, 459] }])
    expect(validateSnapshot({
      ...snapshot, portfolio: { projects: [project] }, pickRule,
      metrics: { ...snapshot.metrics, flow: { ...flow, openToMergeHours: { median: '0.3', p90: null } }, conformance: { ...conformance, runner: 0 } },
    })).toEqual([
      'portfolio.projects[0].agentReady must be a number',
      'pickRule.dormant must be an object',
      'metrics.flow.openToMergeHours.median must be a number or null',
      'metrics.conformance.runner must be an object or null',
    ])
  })

  it('a last-known section that predates a field v1 now declares is not kept: the section is empty, and the run stays valid', () => {
    const good = build()
    const { flow, ...older } = good.metrics // metrics as written before #539
    const noBaseline = { baseline: failed('.dependency-cruiser-known-violations.json', 'ENOENT') }
    const next = build(noBaseline, { now: LATER, previous: { ...good, metrics: older } })
    expect(next.metrics).toEqual({
      ratchet: { count: 0, byRule: {}, history: [] }, releases: [], mergesPerDay: [], flow: null, conformance: null, openTasks: null,
    })
    expect(next.freshness.metrics).toMatchObject({ fetchedAt: null, status: 'error' })
    expect(validateSnapshot(next)).toEqual([])
    // One that conforms is still kept, dated when it was fetched.
    const kept = build(noBaseline, { now: LATER, previous: good })
    expect([kept.metrics, kept.freshness.metrics.fetchedAt]).toEqual([good.metrics, NOW])
  })
})

describe('metrics.openTasks, from the history archive (#478)', () => {
  const history = fixture('gh-pages-history.json')
  const AT = '2026-09-29T08:21:27.364Z' // the newest archived snapshot's own time
  const counts = (points) => points.map(({ date, at, byProject }) => [date, at, byProject.foundation.length, Object.values(byProject).flat().length])

  it('archiveDays: the last archived snapshot of each UTC day before now; a name not a snapshot\'s own is never read', () => {
    expect(archiveDays(history.names, AT)).toEqual([
      '2026-09-25T21:29:17.561Z.json', '2026-09-26T22:41:12.046Z.json', '2026-09-27T22:02:34.881Z.json',
      '2026-09-28T21:52:06.501Z.json', '2026-09-29T01:49:13.340Z.json',
    ])
    expect(archiveDays([...history.names, 'index.json', '2026-09-30.json', '../2026-09-28T23:00:00.000Z.json'], AT))
      .toEqual(archiveDays(history.names, AT))
    expect(archiveDays(history.names, '2026-09-25T07:07:45.960Z')).toEqual([]) // the archive's first run read none
  })

  it('one point per UTC day: that day\'s last archived reading of tasks.byProject, oldest first, none from after now', () => {
    const { metrics, freshness } = build({}, { now: AT })
    expect(counts(metrics.openTasks)).toEqual([
      ['2026-09-25', '2026-09-25T21:29:17.561Z', 38, 138], ['2026-09-26', '2026-09-26T22:41:12.046Z', 38, 138],
      ['2026-09-27', '2026-09-27T22:02:34.881Z', 37, 138], ['2026-09-28', '2026-09-28T21:52:06.501Z', 37, 140],
      ['2026-09-29', '2026-09-29T01:49:13.340Z', 37, 140],
    ])
    expect(metrics.openTasks[4].byProject.unfiled).toEqual(history.snapshots[4].tasks.byProject.unfiled)
    expect(freshness.metrics.status).toBe('ok')
    expect(counts(build({}, { now: '2026-09-27T00:00:00.000Z' }).metrics.openTasks).map(([date]) => date)).toEqual(['2026-09-25', '2026-09-26'])
  })

  it('a reading whose tasks section was in error is not that day\'s; a failed archive read leaves openTasks null, metrics partial', () => {
    const [first, ...rest] = history.snapshots
    const stale = { ...first, freshness: { tasks: { fetchedAt: null, status: 'error' } } }
    const skipped = build({ archive: ok('git show origin/gh-pages:control/history', [stale, ...rest]) }, { now: AT })
    expect(counts(skipped.metrics.openTasks)[0][0]).toBe('2026-09-26')

    const failedRead = build({ archive: failed('git show origin/gh-pages:control/history', 'fatal: Not a valid object name origin/gh-pages') })
    expect(failedRead.metrics.openTasks).toBeNull()
    expect(failedRead.freshness.metrics).toMatchObject({ status: 'partial', error: 'archive: fatal: Not a valid object name origin/gh-pages' })
    expect(validateSnapshot(failedRead)).toEqual([])
    expect(validateSnapshot({ ...failedRead, metrics: { ...failedRead.metrics, openTasks: [{ date: '2026-09-25', at: 'x', byProject: [] }] } }))
      .toEqual(['metrics.openTasks[0].at must be an ISO date', 'metrics.openTasks[0].byProject must be an object'])
  })
})

// #476 (MC-5), carried from the MC-1 verifier: an empty or truncated --previous file crashed the collector with an
// uncaught SyntaxError at collect.mjs:73, even though every section was otherwise ok. Missing, empty and unparseable
// text must all read as "no previous" — never a crash — so buildSnapshot's own `previous = null` default applies.
describe('parsePrevious', () => {
  it('no text at all — undefined, or the --previous flag omitted — is no previous', () => {
    expect(parsePrevious(undefined)).toBeNull()
  })

  it('an empty file is no previous, not a JSON.parse crash', () => {
    expect(parsePrevious('')).toBeNull()
  })

  it('a file of only whitespace is no previous', () => {
    expect(parsePrevious('   \n\t  ')).toBeNull()
  })

  it('a truncated file — cut off mid-write, the reported crash — is no previous, not a thrown SyntaxError', () => {
    expect(parsePrevious('{"schemaVersion": 1, "portfolio')).toBeNull()
  })

  it('text that parses but is not JSON at all (e.g. an error page) is no previous', () => {
    expect(parsePrevious('<html>404 not found</html>')).toBeNull()
  })

  it('valid JSON text parses through unchanged', () => {
    const snapshot = fixture('snapshot.json')
    expect(parsePrevious(JSON.stringify(snapshot))).toEqual(snapshot)
  })
})
