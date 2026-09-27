import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { decide, requiredContexts, withRerunMarker } from './merge-on-green.logic.mjs'

// Each state is a recorded GitHub reading of a real PR on this repo: check runs (filter=all) and
// workflow runs, replayed to the moment the state held. A fixture's `_recorded` names the PR, the
// moment, and the PR-level fields set by hand (GitHub reports those only live).
// rules-main.json is `gh api repos/mezivillager/hacer/rules/branches/main`; protection-404.json is
// what `gh api repos/mezivillager/hacer/branches/main/protection` prints on stdout, exit 1. Both
// were recorded on 2026-09-27.

const FIXTURES = path.join(import.meta.dirname, 'fixtures/merge-on-green')
const load = (name) => JSON.parse(readFileSync(path.join(FIXTURES, `${name}.json`), 'utf8'))
const withPr = (snapshot, fields) => ({ ...snapshot, pr: { ...snapshot.pr, ...fields } })
const STATES = [
  'pending',
  'required-failure',
  'non-required-failure',
  'cancelled-run',
  'empty-cancelled-suite',
  'behind',
  'blocked-after-body-edit',
  'merged',
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
    const action = decide(load('pending'))
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
    const action = decide(load('non-required-failure'))
    expect(action.kind).toBe('edit-body')
    expect(action.reason).toMatch(/not required/)
    expect(action.reason).toContain('deploy-preview')
    expect(action.reason).toContain('Analyze (javascript-typescript)')
    expect(action.reason).toContain('97027094218')
  })

  it('a cancelled check run in the newest suite of a required context: re-runs exactly that run (#295)', () => {
    // #362: an older PR Hygiene suite holds a green pr-hygiene run with a higher id. The merge box
    // reads the newest suite, so that is the run to re-run.
    const action = decide(load('cancelled-run'))
    expect(action).toMatchObject({ kind: 'rerun', runId: 35798747995 })
    expect(action.reason).toContain('pr-hygiene')
    expect(action.reason).toContain('96932343143')
  })

  it('the empty cancelled suite as the newest (#530): edits the body (R746)', () => {
    const action = decide(load('empty-cancelled-suite'))
    expect(action.kind).toBe('edit-body')
    expect(action.reason).toContain('PR Hygiene')
    expect(action.reason).toContain('97776650607')
    expect(action.reason).toMatch(/edited/)
  })

  it('behind the base: updates the branch', () => {
    expect(decide(load('behind')).kind).toBe('update-branch')
  })

  it('blocked with nothing pending after the body edit: gives up with the reason, exit 4', () => {
    const action = decide(load('blocked-after-body-edit'))
    expect(action).toMatchObject({ kind: 'give-up', exit: 4 })
    expect(action.reason).toMatch(/body edit/)
    expect(action.reason).toContain('97776650607')
  })

  it('merged: exits 0', () => {
    expect(decide(load('merged'))).toMatchObject({ kind: 'merged', exit: 0 })
  })
})

describe('decide — the rules between the states', () => {
  it('arms auto-merge before it waits', () => {
    expect(decide(withPr(load('pending'), { autoMergeRequest: null })).kind).toBe('merge')
  })

  it('merges at once when GitHub already reports the PR mergeable', () => {
    for (const mergeStateStatus of ['CLEAN', 'HAS_HOOKS', 'UNSTABLE']) {
      expect(decide(withPr(load('behind'), { mergeStateStatus })).kind).toBe('merge')
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
    expect(decide(load('cancelled-run'), { reruns: [35798747995] }).kind).toBe('edit-body')
  })

  it('edits the body once per head: a marker for an older head does not count', () => {
    const snapshot = load('blocked-after-body-edit')
    const olderHead = snapshot.pr.body.replace(snapshot.pr.headRefOid, 'a'.repeat(40))
    expect(decide(withPr(snapshot, { body: olderHead })).kind).toBe('edit-body')
    expect(decide(load('empty-cancelled-suite'), { edits: [snapshot.pr.headRefOid] }).kind).toBe('give-up')
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

  it.each([
    ['closed', { state: 'CLOSED' }],
    ['a draft', { isDraft: true }],
    ['in conflict with the base', { mergeStateStatus: 'DIRTY' }],
  ])('needs a person when the PR is %s', (_, fields) => {
    expect(decide(withPr(load('pending'), fields))).toMatchObject({ kind: 'give-up', exit: 4 })
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
    const snapshot = load('empty-cancelled-suite')
    const body = withRerunMarker(snapshot.pr.body, snapshot.pr.headRefOid, '2026-09-27T08:19:30Z')
    expect(decide(withPr(snapshot, { body })).kind).toBe('give-up')
  })
})
