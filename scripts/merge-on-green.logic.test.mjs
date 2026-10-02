import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { decide, mergeCommits, requiredContexts, stopOnRefusal, withRerunMarker } from './merge-on-green.logic.mjs'

// Each state is a recorded GitHub reading of a real PR on this repo: check runs (filter=all) and
// workflow runs, replayed to the moment the state held. A fixture's `_recorded` names the PR, the
// moment, and the PR-level fields set by hand (GitHub reports those only live).
// rules-main.json is `gh api repos/mezivillager/hacer/rules/branches/main`; protection-404.json is
// what `gh api repos/mezivillager/hacer/branches/main/protection` prints on stdout, exit 1. Both
// were recorded on 2026-09-27. stale-green.json and fresh-green.json also carry `basePushes`, the
// pushes to main as `gh api repos/mezivillager/hacer/activity?ref=refs/heads/main` lists them.

const FIXTURES = path.join(import.meta.dirname, 'fixtures/merge-on-green')
const load = (name) => JSON.parse(readFileSync(path.join(FIXTURES, `${name}.json`), 'utf8'))
const withPr = (snapshot, fields) => ({ ...snapshot, pr: { ...snapshot.pr, ...fields } })
// For fixtures whose PR had auto-merge armed: the tool disarms that before anything else.
const unarmed = (name) => withPr(load(name), { autoMergeRequest: null })
const STATES = [
  'pending',
  'required-failure',
  'non-required-failure',
  'cancelled-run',
  'empty-cancelled-suite',
  'behind',
  'blocked-after-body-edit',
  'merged',
  'stale-green',
  'fresh-green',
  'rebase-refused',
]

describe('requiredContexts', () => {
  it('reads the contexts the active rulesets require on the base branch', () => {
    expect(requiredContexts(load('rules-main'), null)).toEqual({
      contexts: ['ci', 'pr-hygiene', 'browser-qa'],
      source: 'rulesets',
    })
  })

  it('never reads a 404 body as a context, wherever it lands (R518)', () => {
    const notFound = load('protection-404')
    expect(requiredContexts(null, notFound).contexts).toBeNull()
    expect(requiredContexts(notFound, notFound).contexts).toBeNull()
  })

  it('falls back to classic branch protection only when the rulesets require nothing', () => {
    const classic = { required_status_checks: { contexts: ['build'], checks: [{ context: 'build' }, { context: 'lint' }] } }
    const rulesWithoutChecks = load('rules-main').filter((rule) => rule.type !== 'required_status_checks')
    expect(requiredContexts(rulesWithoutChecks, classic)).toEqual({ contexts: ['build', 'lint'], source: 'branch protection' })
    expect(requiredContexts(load('rules-main'), classic).source).toBe('rulesets')
  })

  it('returns null when neither can be read, so every check counts as required', () => {
    expect(requiredContexts(null, null).contexts).toBeNull()
  })
})

describe('decide — one recorded state each', () => {
  it('pending: waits, and names what is still running', () => {
    const action = decide(unarmed('pending'))
    expect(action.kind).toBe('wait')
    expect(action.exit).toBeUndefined()
    expect(action.reason).toMatch(/still running/)
    expect(action.reason).toContain('ci')
  })

  it('a real failure in a required context: fails with exit 2 and names it', () => {
    const action = decide(load('required-failure'))
    expect(action).toMatchObject({ kind: 'fail', exit: 2 })
    expect(action.reason).toContain('ci (failure)')
  })

  it('a failure only in non-required checks does not fail the run (R517); #416 was held by an empty suite, so the body edit is next', () => {
    const action = decide(unarmed('non-required-failure'))
    expect(action.kind).toBe('edit-body')
    expect(action.reason).toMatch(/not required/)
    expect(action.reason).toContain('deploy-preview')
    expect(action.reason).toContain('Analyze (javascript-typescript)')
    expect(action.reason).toContain('97027094218')
  })

  it('a cancelled check run in the newest suite of a required context: re-runs exactly that run (#295)', () => {
    // #362: an older PR Hygiene suite holds a green pr-hygiene run with a higher id. The merge box
    // reads the newest suite, so that is the run to re-run.
    const action = decide(unarmed('cancelled-run'))
    expect(action).toMatchObject({ kind: 'rerun', runId: 35798747995 })
    expect(action.reason).toContain('pr-hygiene')
    expect(action.reason).toContain('96932343143')
  })

  it('the empty cancelled suite as the newest (#530): edits the body (R746)', () => {
    const action = decide(unarmed('empty-cancelled-suite'))
    expect(action.kind).toBe('edit-body')
    expect(action.reason).toContain('PR Hygiene')
    expect(action.reason).toContain('97776650607')
    expect(action.reason).toMatch(/edited/)
  })

  it('behind the base: updates the branch by rebase', () => {
    expect(decide(unarmed('behind'))).toMatchObject({ kind: 'update-branch', method: 'REBASE' })
  })

  it('blocked with nothing pending after the body edit: gives up with the reason, exit 4', () => {
    const action = decide(unarmed('blocked-after-body-edit'))
    expect(action).toMatchObject({ kind: 'give-up', exit: 4 })
    expect(action.reason).toMatch(/body edit/)
    expect(action.reason).toContain('97776650607')
  })

  it('merged: exits 0', () => {
    expect(decide(load('merged'))).toMatchObject({ kind: 'merged', exit: 0 })
  })

  it('a stale green (#646): ci tested a merge with a main that has moved since, so it updates the branch and says why', () => {
    const action = decide(load('stale-green'))
    expect(action).toMatchObject({ kind: 'update-branch', method: 'REBASE' })
    expect(action.reason).toBe(
      'ci ran at 2026-10-01T22:01:13Z against 0c37a1e; main moved to 59cc2f0 since — rebasing the branch on main so the checks see what would ship, and the history stays linear',
    )
  })

  it('a fresh green (#645): main has not moved since ci started, so it merges', () => {
    expect(decide(load('fresh-green')).kind).toBe('merge')
  })

  it('a fresh green on a branch carrying a merge commit (#667): GitHub reports CLEAN, so it tries the merge', () => {
    expect(decide(load('rebase-refused')).kind).toBe('merge')
  })
})

describe('decide — the rules between the states', () => {
  it('never arms auto-merge, and disarms one already armed: GitHub would merge on any green, stale or not (#407)', () => {
    expect(decide(unarmed('pending')).kind).toBe('wait')
    const action = decide(load('pending'))
    expect(action.kind).toBe('disable-auto')
    expect(action.reason).toMatch(/stale/)
  })

  it('updates the branch once per head, then waits for the new head', () => {
    const stale = load('stale-green')
    expect(decide(stale, { updates: [stale.pr.headRefOid] }).kind).toBe('wait')
  })

  it('stops after three updates when main keeps moving, exit 4, with the reason', () => {
    const action = decide(load('stale-green'), { updates: ['a'.repeat(40), 'b'.repeat(40), 'c'.repeat(40)] })
    expect(action).toMatchObject({ kind: 'give-up', exit: 4 })
    expect(action.reason).toMatch(/main moved after the checks started 3 times/)
  })

  it('judges only the checks that tested a merge commit: pr-hygiene runs main’s copy on the PR head (pull_request_target)', () => {
    const fresh = load('fresh-green')
    const earlyHygiene = {
      ...fresh,
      workflowRuns: fresh.workflowRuns.map((run) =>
        run.event === 'pull_request_target' ? { ...run, created_at: '2026-10-01T21:50:00Z' } : run,
      ),
    }
    expect(decide(earlyHygiene).kind).toBe('merge')
  })

  it('a textual conflict stays the builder’s, stale or not', () => {
    expect(decide(withPr(load('stale-green'), { mergeStateStatus: 'DIRTY' })).reason).toMatch(/conflicts with main/)
  })

  it('a failing check names the run whose log shows the failing step', () => {
    const action = decide(load('required-failure'))
    const ci = load('required-failure').workflowRuns.find((run) => run.name === 'CI')
    expect(action.runs).toEqual([ci.id])
    expect(action.reason).toContain(`run ${ci.id}`)
  })

  it('merges at once when GitHub already reports the PR mergeable', () => {
    for (const mergeStateStatus of ['CLEAN', 'HAS_HOOKS', 'UNSTABLE']) {
      expect(decide(withPr(unarmed('behind'), { mergeStateStatus })).kind).toBe('merge')
    }
  })

  it('never arms auto-merge on a failing PR, and holds the verdict while a check still runs', () => {
    const failing = load('required-failure')
    expect(decide(failing).kind).toBe('fail') // its autoMergeRequest is null
    const stillRunning = {
      ...failing,
      checkRuns: failing.checkRuns.map((run) => (run.name === 'CodeQL' ? { ...run, status: 'in_progress', conclusion: null } : run)),
    }
    expect(decide(stillRunning).kind).toBe('wait')
  })

  it('re-runs a run once; cancelled again, the body edit comes next', () => {
    expect(decide(unarmed('cancelled-run'), { reruns: [35798747995] }).kind).toBe('edit-body')
  })

  it('edits the body once per head: a marker for an older head does not count', () => {
    const snapshot = unarmed('blocked-after-body-edit')
    const olderHead = snapshot.pr.body.replace(snapshot.pr.headRefOid, 'a'.repeat(40))
    expect(decide(withPr(snapshot, { body: olderHead })).kind).toBe('edit-body')
    expect(decide(unarmed('empty-cancelled-suite'), { edits: [snapshot.pr.headRefOid] }).kind).toBe('give-up')
  })

  it('counts every check as required when the required set could not be read', () => {
    const action = decide({ ...load('non-required-failure'), requiredContexts: null })
    expect(action).toMatchObject({ kind: 'fail', exit: 2 })
    expect(action.reason).toContain('deploy-preview')
  })

  it('gives up, in GitHub’s words, when it refuses the same action three times', () => {
    const action = decide(load('pending'), { refusals: { merge: 3 }, lastError: 'the base branch policy prohibits the merge' })
    expect(action).toMatchObject({ kind: 'give-up', exit: 4 })
    expect(action.reason).toContain('the base branch policy prohibits the merge')
  })

  it('stops at the first "can’t be rebased" refusal, naming the merge commit (#667)', () => {
    const fixture = load('rebase-refused')
    const history = { refusals: { merge: 1 }, lastError: fixture.refusal, mergeCommits: mergeCommits(fixture.commits) }
    const action = decide(fixture, history)
    expect(action).toMatchObject({ kind: 'give-up', exit: 4 })
    expect(action.reason).toContain('181b3c3')
    expect(action.reason).not.toContain('76f4096')
    expect(stopOnRefusal(fixture.pr, history)).toEqual(action)
  })

  it('names no merge commit it could not read, and still stops at the first refusal', () => {
    const fixture = load('rebase-refused')
    const action = decide(fixture, { refusals: { merge: 1 }, lastError: fixture.refusal, mergeCommits: null })
    expect(action).toMatchObject({ kind: 'give-up', exit: 4 })
    expect(action.reason).toContain(fixture.refusal)
  })

  it('a REBASE update GitHub refuses (a fork, a protected head) stops at once, in GitHub’s words', () => {
    const lastError = 'GraphQL: Resource not accessible by integration (updatePullRequestBranch)'
    const action = decide(load('stale-green'), { refusals: { 'update-branch': 1 }, lastError })
    expect(action).toMatchObject({ kind: 'give-up', exit: 4 })
    expect(action.reason).toContain(lastError)
    expect(action.reason).toMatch(/REBASE/)
  })

  it('lets one refusal of anything else be retried', () => {
    const history = { refusals: { merge: 1 }, lastError: 'GraphQL: Base branch was modified (mergePullRequest)' }
    expect(stopOnRefusal(load('fresh-green').pr, history)).toBeNull()
    expect(decide(load('fresh-green'), history).kind).toBe('merge')
  })

  it.each([
    ['closed', { state: 'CLOSED' }],
    ['a draft', { isDraft: true }],
    ['in conflict with the base', { mergeStateStatus: 'DIRTY' }],
  ])('needs a person when the PR is %s', (_, fields) => {
    expect(decide(withPr(load('pending'), fields))).toMatchObject({ kind: 'give-up', exit: 4 })
  })

  it('waits one pass before acting on a BLOCKED box with no stuck suite in sight: GitHub may still be settling', () => {
    // The box clears a few seconds after the last required check (#517, #524, #362); a pass inside that
    // window must not spend the body edit, or give up. #524 at 17:52:54, every check green:
    const green = withPr(unarmed('behind'), { mergeStateStatus: 'BLOCKED' })
    const first = decide(green)
    expect(first.kind).toBe('wait')
    expect(decide(green, { settled: first.settle }).kind).toBe('edit-body')
    const edited = withPr(green, { body: withRerunMarker(green.pr.body, green.pr.headRefOid, '2026-09-26T17:53:00Z') })
    expect(decide(edited).kind).toBe('wait')
    expect(decide(edited, { settled: first.settle })).toMatchObject({ kind: 'give-up', exit: 4 })
  })

  it('never proposes a force-push or a rewrite, in any premise', () => {
    const histories = [{}, { reruns: [35798747995] }, { edits: ['ce3e920a6414164989dbdb8b9d45d8ead2ac1bbc'] }]
    for (const state of STATES) {
      for (const history of histories) {
        expect(decide(load(state), history).reason).not.toMatch(/force|amend|rebase onto|reset/i)
      }
    }
  })
})

describe('mergeCommits', () => {
  it('lists the commits with more than one parent (#667)', () => {
    expect(mergeCommits(load('rebase-refused').commits)).toEqual(['181b3c37d514456df9833ed773cc4aaced4cd2ae'])
  })

  it('reads nothing from an unreadable list', () => {
    expect(mergeCommits(null)).toEqual([])
  })
})

describe('withRerunMarker', () => {
  const sha = 'ce3e920a6414164989dbdb8b9d45d8ead2ac1bbc'

  it('appends one hidden HTML comment naming the head, and keeps the body as it was', () => {
    const body = 'Fixes #517\n\nWhat and why.'
    const edited = withRerunMarker(body, sha, '2026-09-27T08:19:30Z')
    expect(edited.startsWith(`${body}\n\n<!--`)).toBe(true)
    expect(edited.endsWith('-->')).toBe(true)
    expect(edited).toContain(sha)
  })

  it('replaces its earlier marker instead of stacking them', () => {
    const once = withRerunMarker('Body', 'a'.repeat(40), '2026-09-27T08:00:00Z')
    const twice = withRerunMarker(once, sha, '2026-09-27T09:00:00Z')
    expect(twice.match(/<!-- merge-on-green/g)).toHaveLength(1)
    expect(twice).toContain(sha)
    expect(twice.startsWith('Body\n\n<!--')).toBe(true)
  })

  it('adds no issue reference: pr-hygiene and browser-qa both read the body’s links', () => {
    expect(withRerunMarker('', sha, '2026-09-27T08:19:30Z')).not.toMatch(/#\d/)
  })

  it('is read by decide as the edit already tried for that head', () => {
    const snapshot = unarmed('empty-cancelled-suite')
    const body = withRerunMarker(snapshot.pr.body, snapshot.pr.headRefOid, '2026-09-27T08:19:30Z')
    expect(decide(withPr(snapshot, { body })).kind).toBe('give-up')
  })
})
