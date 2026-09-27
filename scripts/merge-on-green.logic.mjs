// Pure logic for merge-on-green (#536): from one reading of a PR, the next thing to do. No I/O.
// Unit tested in merge-on-green.logic.test.mjs against states recorded in fixtures/merge-on-green/;
// scripts/merge-on-green.mjs reads GitHub, does what this decides, and prints the premise.
//
// How the merge box judges a required context, as measured here: by the NEWEST check suite of the
// workflow that posts it, not by the check run of that name with the highest id.
//  - #530: a run its concurrency group dropped while pending leaves a suite `completed/cancelled`
//    with no check run. When that suite is the workflow's newest, the context is "expected" for
//    good, while every check run of that name is green (#517, #525;
//    docs/harness/reviews/2026-09-26/evidence/1-stuck-merge-box.md).
//  - #295: a cancelled check run in the newest suite blocks the merge although an older suite holds
//    a green run of the same name. #362 merged 3 s after its newest PR Hygiene suite went green, not
//    at 00:02:52, when an older suite's pr-hygiene run with a higher id did.
// A check run with no workflow run behind it (CodeQL, GitGuardian) is judged by its own newest suite.
//
// The recoveries, cheapest first: re-run one cancelled run at a time (a batch re-run cancels
// itself, #295); append an HTML comment to the PR body, whose `edited` event re-runs the workflows
// that listen for it on the same SHA, once per head (R746); then stop and say why. Never a
// force-push, and never a rebase of the branch: both replace the commits the checks and the
// verdict were given on.

const PASSING = new Set(['success', 'neutral', 'skipped'])
/** The states `gh pr merge --auto` merges at once instead of arming auto-merge (gh's own rule). */
const MERGEABLE_NOW = new Set(['CLEAN', 'HAS_HOOKS', 'UNSTABLE'])
const MAX_REFUSALS = 3
const MARKER = /\n*<!-- merge-on-green: edited to re-run the required checks on ([0-9a-f]{40}) at [^>]*-->/g

export const EXIT = Object.freeze({ merged: 0, fail: 2, timeout: 3, 'give-up': 4 })

const asArray = (value) => (Array.isArray(value) ? value : [])
const isName = (value) => typeof value === 'string' && value.trim() !== ''
const unique = (values) => [...new Set(values)]
const workflowOf = (run) => run.workflow_id ?? run.name
const giveUp = (reason) => ({ kind: 'give-up', exit: EXIT['give-up'], reason })

/**
 * The contexts the base branch requires: the `required_status_checks` rules of the active rulesets
 * that target it (`gh api repos/<o>/<r>/rules/branches/<base>`), else classic branch protection.
 * Each argument is parsed JSON, or null for a call that failed. `contexts: null` means neither
 * could be read, and then every check counts as required: refusing to merge is the safe direction.
 * An error body (`{"message":"Branch not protected",…}`, which gh prints on stdout — R518) holds no
 * list of contexts, so it yields none.
 * @returns {{contexts: string[] | null, source: 'rulesets' | 'branch protection' | 'unreadable'}}
 */
export function requiredContexts(rules, protection) {
  const fromRules = asArray(rules)
    .filter((rule) => rule?.type === 'required_status_checks')
    .flatMap((rule) => asArray(rule.parameters?.required_status_checks))
    .map((check) => check?.context)
    .filter(isName)
  if (fromRules.length > 0) return { contexts: unique(fromRules), source: 'rulesets' }
  const classic = protection?.required_status_checks
  const fromClassic = [...asArray(classic?.contexts), ...asArray(classic?.checks).map((check) => check?.context)].filter(isName)
  if (fromClassic.length > 0) return { contexts: unique(fromClassic), source: 'branch protection' }
  return { contexts: null, source: 'unreadable' }
}

/** One context's verdict on the head, read the way the merge box reads it (see the header). */
function judge(snapshot, name) {
  const runs = snapshot.checkRuns.filter((run) => run.name === name)
  if (runs.length === 0) return { name, verdict: 'missing' }
  const ownSuites = new Set(runs.map((run) => run.suite))
  const workflows = new Set(snapshot.workflowRuns.filter((w) => ownSuites.has(w.suite)).map(workflowOf))
  const suites = [...ownSuites, ...snapshot.workflowRuns.filter((w) => workflows.has(workflowOf(w))).map((w) => w.suite)]
  const suite = Math.max(...suites)
  const workflowRun = snapshot.workflowRuns.find((w) => w.suite === suite)
  const run = runs.filter((r) => r.suite === suite).sort((a, b) => b.id - a.id)[0]
  if (!run) return { name, suite, workflowRun, verdict: workflowRun.status === 'completed' ? 'expected' : 'running' }
  if (run.status !== 'completed') return { name, suite, workflowRun, run, verdict: 'running' }
  const verdict = PASSING.has(run.conclusion) ? 'pass' : run.conclusion === 'cancelled' ? 'cancelled' : 'fail'
  return { name, suite, workflowRun, run, verdict }
}

/** Why a PR with nothing running and nothing failing is still BLOCKED, in one clause. */
function blockers(states, head) {
  const found = states.flatMap((s) => {
    if (s.verdict === 'expected') {
      return [`the newest ${s.workflowRun.name} suite ${s.suite} is ${s.workflowRun.conclusion} with no ${s.name} check run (#530)`]
    }
    if (s.verdict === 'missing') return [`${s.name} never reported on ${head}`]
    if (s.verdict === 'cancelled') return [`${s.name} is still cancelled in suite ${s.suite}`]
    return []
  })
  return found.length > 0 ? found.join('; ') : `every required check is green on ${head}, so the merge box is stale (R716)`
}

/** The heads this tool already edited the body for, read from its markers in the body. */
const markedHeads = (body) => [...(body ?? '').matchAll(MARKER)].map((match) => match[1])

/**
 * The next action for one reading of a PR.
 * @param snapshot {pr, requiredContexts, checkRuns, workflowRuns}: `pr` is `gh pr view --json
 *   number,state,isDraft,mergeStateStatus,headRefOid,baseRefName,autoMergeRequest,body`;
 *   `checkRuns` are {id, name, status, conclusion, suite}; `workflowRuns` are {id, name,
 *   workflow_id, event, status, conclusion, suite, attempt}, both for the head SHA.
 * @param history what this run of the tool already did: {reruns: run ids, edits: head SHAs,
 *   refusals: {kind: count}, lastError}. A refusal is a gh command that failed.
 * @returns {{kind: 'merged'|'fail'|'give-up'|'merge'|'wait'|'rerun'|'update-branch'|'edit-body',
 *   reason: string, exit?: number, runId?: number}}
 */
export function decide(snapshot, history = {}) {
  const { pr } = snapshot
  const head = pr.headRefOid.slice(0, 7)
  if (pr.state === 'MERGED') return { kind: 'merged', exit: EXIT.merged, reason: `#${pr.number} is merged` }
  if (pr.state === 'CLOSED') return giveUp(`#${pr.number} was closed without merging`)
  if (pr.isDraft || pr.mergeStateStatus === 'DRAFT') return giveUp(`#${pr.number} is a draft; mark it ready for review first`)
  if (pr.mergeStateStatus === 'DIRTY') {
    return giveUp(`#${pr.number} conflicts with ${pr.baseRefName}; its builder resolves that on the branch`)
  }

  const names = unique(snapshot.checkRuns.map((run) => run.name))
  const required = snapshot.requiredContexts?.length ? snapshot.requiredContexts : names
  const states = required.map((name) => judge(snapshot, name))
  const notRequired = names.filter((name) => !required.includes(name) && judge(snapshot, name).verdict === 'fail')
  const note = notRequired.length > 0 ? ` (failing, not required: ${notRequired.join(', ')})` : ''
  const act = (kind, reason, extra = {}) => ({ kind, reason: `${reason}${note}`, ...extra })

  const refused = Object.entries(history.refusals ?? {}).find(([, count]) => count >= MAX_REFUSALS)
  if (refused) return giveUp(`GitHub refused ${refused[0]} ${refused[1]} times: ${history.lastError}`)

  const running = unique([...snapshot.checkRuns, ...snapshot.workflowRuns].filter((r) => r.status !== 'completed').map((r) => r.name))
  const failing = states.filter((s) => s.verdict === 'fail').map((s) => `${s.name} (${s.run.conclusion})`)
  if (failing.length > 0) {
    if (running.length > 0) {
      return act('wait', `${failing.join(', ')} failed on ${head}; the verdict waits for ${running.length} still running: ${running.join(', ')}`)
    }
    return act('fail', `required check failed on ${head}: ${failing.join(', ')}`, { exit: EXIT.fail })
  }
  if (MERGEABLE_NOW.has(pr.mergeStateStatus)) return act('merge', `GitHub reports ${pr.mergeStateStatus} on ${head}: merging now (rebase)`)
  if (!pr.autoMergeRequest) return act('merge', `arming auto-merge (rebase): GitHub merges once ${required.join(', ')} pass`)
  if (running.length > 0) return act('wait', `${running.length} still running on ${head}: ${running.join(', ')}`)
  if (pr.mergeStateStatus === 'UNKNOWN') return act('wait', 'GitHub has not computed mergeability yet (UNKNOWN)')
  if (pr.mergeStateStatus === 'BEHIND') {
    return act('update-branch', `GitHub reports BEHIND: merging ${pr.baseRefName} into the branch, which keeps every commit that was checked`)
  }
  if (pr.mergeStateStatus !== 'BLOCKED') return act('wait', `GitHub reports ${pr.mergeStateStatus}`)

  const reran = new Set(history.reruns ?? [])
  const cancelled = states.find((s) => s.verdict === 'cancelled' && s.workflowRun && !reran.has(s.workflowRun.id))
  if (cancelled) {
    const { workflowRun } = cancelled
    return act(
      'rerun',
      `the newest ${workflowRun.name} suite ${cancelled.suite} holds a cancelled ${cancelled.name} check run (#295): re-running run ${workflowRun.id}, one run at a time`,
      { runId: workflowRun.id },
    )
  }

  const why = blockers(states, head)
  const edited = (history.edits ?? []).includes(pr.headRefOid) || markedHeads(pr.body).includes(pr.headRefOid)
  if (!edited) {
    return act(
      'edit-body',
      `BLOCKED with nothing running and no required check failing: ${why}. Appending an HTML comment to the body, once for this head: the edited event re-runs the workflows that listen for it on the same SHA (R746)`,
    )
  }
  return giveUp(`BLOCKED on ${head} with nothing running and no required check failing, after the body edit: ${why}. It needs a person; read the base branch's rules${note}`)
}

/**
 * The body with this tool's hidden marker for `sha` at the end, replacing an earlier marker so
 * edits do not pile up. It carries no `#` reference: pr-hygiene and browser-qa read the body's links.
 */
export function withRerunMarker(body, sha, at) {
  const kept = (body ?? '').replace(MARKER, '').trimEnd()
  const marker = `<!-- merge-on-green: edited to re-run the required checks on ${sha} at ${at} -->`
  return kept ? `${kept}\n\n${marker}` : marker
}
