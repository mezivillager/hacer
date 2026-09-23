// Pure logic for the required-check concurrency guard (#295). No I/O — unit tested in
// required-checks.logic.test.mjs, which also runs the guard over the repo's real workflows.
//
// Why it exists. GitHub sends one webhook action per label applied, so `gh pr edit --add-label
// a,b` on a fresh PR delivers `opened`, `labeled`, `labeled` within a second or two. Every
// workflow that lists `labeled` in its `types:` starts a run per action; with
// `cancel-in-progress: true` and a concurrency group that does not tell the actions apart, the
// newest run cancels the one already running. A run cancelled while *in progress* still posts a
// check run — `completed/cancelled`, under the job's name — and GitHub judges a required context
// by the newest check run carrying that name. So one cancellation leaves the PR at
// `mergeStateStatus: BLOCKED` while `gh pr checks` reports everything green. Measured on
// #287, #314, #343, #351, #360 and #362; the ledger's sixth occurrence.
//
// A run cancelled while still *pending* (queued behind the group) creates no jobs and therefore no
// check run — verified on runs 35613803628 and 35613803591, both `completed/cancelled` with
// `jobs: 0` and no entry in the commit's check-runs list. That is why `cancel-in-progress: false`
// is a complete fix and not merely a mitigation: GitHub still collapses the queue to one pending
// run per group, it just does it before any check run exists.

/** The contexts the `main-rules` ruleset requires on `main`
 *  (`gh api repos/:owner/:repo/rulesets/13907542` → `required_status_checks`). Keep in step with
 *  the ruleset: a context listed there and missing here is a check this guard would not protect. */
export const REQUIRED_CONTEXTS = Object.freeze(['ci', 'pr-hygiene', 'browser-qa'])

const stripQuotes = (value) => value.replace(/^(['"])(.*)\1$/, '$2')

/**
 * The check-run names a workflow source can post: one per job, its `name:` when it declares one,
 * otherwise the job id. A deliberately narrow scanner rather than a YAML parser — the repo has no
 * YAML dependency, and these are small hand-written files in one house style.
 */
export function jobContexts(source) {
  const lines = source.split('\n')
  const start = lines.findIndex((line) => /^jobs:[ \t]*(#.*)?$/.test(line))
  if (start === -1) return []

  const contexts = []
  let jobIndent = null
  for (const line of lines.slice(start + 1)) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    if (/^\S/.test(line)) break // back to column 0: the jobs block is over

    const entry = line.match(/^([ \t]+)([A-Za-z0-9_.-]+):[ \t]*(#.*)?$/)
    if (entry && (jobIndent === null || entry[1].length === jobIndent)) {
      jobIndent ??= entry[1].length
      contexts.push(entry[2])
      continue
    }
    const named = line.match(/^([ \t]+)name:[ \t]+(.+?)[ \t]*$/)
    if (named && jobIndent !== null && named[1].length === jobIndent + 2 && contexts.length > 0) {
      contexts[contexts.length - 1] = stripQuotes(named[2])
    }
  }
  return contexts
}

/** Every `cancel-in-progress:` value in a workflow source, in file order — workflow level and job
 *  level alike, since either can cancel a running job. */
export function cancelInProgressSettings(source) {
  return [...source.matchAll(/^[ \t]*cancel-in-progress:[ \t]*([^\s#]+)/gm)].map((match) => match[1])
}

/**
 * Findings for one workflow file. Empty means it cannot strand a required check: either it posts
 * none of them, or it never cancels a run that has already started.
 */
export function checkWorkflow(file, source, required = REQUIRED_CONTEXTS) {
  const contexts = jobContexts(source).filter((context) => required.includes(context))
  if (contexts.length === 0) return []
  return cancelInProgressSettings(source)
    .filter((value) => value === 'true')
    .map(() => ({
      file,
      contexts,
      rule: 'cancel-in-progress',
      message:
        `${file} posts the required ${contexts.length === 1 ? 'context' : 'contexts'} ` +
        `${contexts.join(', ')} and sets cancel-in-progress: true — a cancelled run of a required ` +
        `context blocks the merge even when a later run succeeds (#295). Set it to false.`,
    }))
}

/** One line per finding, or the sentence the guard expects when there is nothing to report. */
export function formatFindings(findings) {
  if (findings.length === 0) return 'REQUIRED-CHECKS: ok — no required workflow cancels an in-progress run'
  return findings.map((finding) => `REQUIRED-CHECKS: ${finding.message}`).join('\n')
}
