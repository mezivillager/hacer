import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { AUX_ROTATION, PICK_ROTATION, parsePortfolio, planReady, summarizeProjects } from '../backlog.logic.mjs'
import { SCHEMA_VERSION, buildSnapshot, claimsQuery, report, validateSnapshot } from './collect.logic.mjs'

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
//                      site renders in mission-control/src/*.test.tsx (#473); the last test keeps it valid v1
// The process records (ledger, sessions, ADRs, roadmap, cloud inbox) are read live, as
// backlog.logic.test.mjs reads docs/portfolio.md: a format change there fails here, not silently in the site.

const ROOT = path.join(import.meta.dirname, '..', '..')
const FIXTURES = path.join(ROOT, 'scripts', 'fixtures', 'mission-control')
const fixtureText = (file) => readFileSync(path.join(FIXTURES, file), 'utf8')
const fixture = (file) => JSON.parse(fixtureText(file))
const repoText = (file) => readFileSync(path.join(ROOT, file), 'utf8')
const repoDir = (dir) => readdirSync(path.join(ROOT, dir)).filter((file) => file.endsWith('.md'))
  .map((file) => ({ file: `${dir}/${file}`, text: repoText(`${dir}/${file}`) }))

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
    releases: ok('gh release list', fixture('gh-releases.json')),
    ratchetLog: ok('git log -- .dependency-cruiser-known-violations.json', ratchet),
    baseline: ok('.dependency-cruiser-known-violations.json', ratchet.rows['d9ce783867491b811fceaf225e3dad54479483da']),
    portfolio: ok('docs/portfolio.md', fixtureText('portfolio.md')),
    ledger: ok('docs/harness/ledger.md', repoText('docs/harness/ledger.md')),
    inbox: ok('docs/harness/sessions/cloud-queue-inbox.md', repoText('docs/harness/sessions/cloud-queue-inbox.md')),
    roadmap: ok('docs/roadmap/README.md', repoText('docs/roadmap/README.md')),
    sessions: ok('docs/harness/sessions', repoDir('docs/harness/sessions')),
    adrs: ok('docs/decisions', repoDir('docs/decisions')),
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
    const plan = planReady(issues, rows)
    const snapshot = build()

    const summaries = snapshot.portfolio.projects.map(({ slug, epicNumber, open, ready, inProgress, needsHuman, next }) =>
      ({ slug, epicNumber, open, ready, inProgress, needsHuman, next }))
    expect(summaries).toEqual(summarizeProjects(issues, rows))
    expect(snapshot.portfolio.projects.map(({ rank, lane }) => ({ rank, lane }))).toEqual(rows.map(({ rank, lane }) => ({ rank, lane })))
    expect(snapshot.tasks.items).toEqual(plan)
    expect(snapshot.pickRule).toEqual({
      rotation: PICK_ROTATION,
      auxRotation: AUX_ROTATION,
      next: plan.filter((task) => task.reason === null).map(({ number, title, project }) => ({ number, title, project })),
    })
    expect(snapshot.pickRule.next.length).toBeGreaterThan(5) // the fixture exercises the rotation, not an empty plan

    // The row's epic brings its title and its sub-issue counts; a row whose epic is not in the recording has none.
    expect(snapshot.portfolio.projects.find((project) => project.slug === 'harness')).toMatchObject({
      title: 'Epic: harness — autonomous-run improvements & agent-readiness',
      subIssues: { completed: 19, percentCompleted: 42, total: 45 },
    })
    expect(snapshot.portfolio.projects.find((project) => project.slug === 'spine')).toMatchObject({ title: null, subIssues: null })
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
    expect(good.freshness.checks).toEqual({ source: 'none', fetchedAt: NOW, status: 'ok' })
    expect(good.checks).toEqual({ until: 'MC-6', items: [] })
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
      source: 'docs/portfolio.md · gh issue list --state open', fetchedAt: NOW, status: 'error',
      error: 'issues: HTTP 403: API rate limit exceeded',
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
    expect(Object.keys(ledger.items[0])).toEqual(['date', 'whatWentWrong', 'shouldHaveBeenCaughtBy', 'mechanised'])
    expect(ledger.items[0].date).toBe('2026-09-18')
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
    expect(report(drifted)).toEqual({
      exitCode: 0, stderr: '', stdout: 'MISSION-CONTROL: VALID schema 1 · ok 12 · partial 0 · error 1 (prs)',
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
    expect(validateSnapshot(fixture('snapshot.json'))).toEqual([])
  })
})
