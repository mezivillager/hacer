// Pure logic for the required-check concurrency guard (#295, #530). No I/O — unit tested in
// required-checks.logic.test.mjs, which also runs the guard over the repo's real workflows.
//
// Why it exists. GitHub sends one webhook action per label applied, so `gh pr edit --add-label
// a,b` on a fresh PR delivers `opened`, `labeled`, `labeled` within a second or two, and every
// workflow that lists `labeled` in its `types:` starts a run per action. A concurrency group those
// runs share cancels some of them, and a cancelled run can leave the PR at
// `mergeStateStatus: BLOCKED` while `gh pr checks` reports everything green, in two ways:
//
// - In progress (#295). With `cancel-in-progress: true` the newest run cancels the one running,
//   which still posts a check run — `completed/cancelled`, under the job's name — and GitHub judges
//   a required context by the newest check run carrying that name. Measured on #287, #314, #343,
//   #351, #360 and #362.
// - Pending (#530). With `cancel-in-progress: false` GitHub keeps one pending run per group and
//   drops the rest. A dropped run creates no job and no check run (runs 35613803628 and
//   35613803591: `jobs: 0`, absent from the commit's check runs), but it does leave a check suite,
//   `completed/cancelled` with no check run in it, and the merge box judges a workflow by its
//   newest suite: when that is the dropped run's, the required context reads "Expected — Waiting
//   for status to be reported" although every check run of that name is green. Which run is
//   dropped is a race. #517's cancelled PR Hygiene suite (97776650607) is newer than its successful
//   one (97776650604) and holds no check run; #524's dropped runs were not the newest, and it
//   merged clean. Evidence: docs/harness/reviews/2026-09-26/evidence/1-stuck-merge-box.md (the
//   newest-suite rule is read off the merge box on #517 and #525; GitHub does not document it).
//
// So `cancel-in-progress: false` was not the complete fix #295 took it for: it moved the stuck
// merge box from a cancelled check run to an empty cancelled suite. The invariant pinned here
// removes both: a workflow that posts a required context declares no concurrency group its runs
// share — none at all, or one unique per run, which no other run can join. `cancel-in-progress`
// is no longer read: a group unique per run holds nothing to cancel, and a shared group is refused
// whatever it says.

/** The contexts the `main-rules` ruleset requires on `main`
 *  (`gh api repos/:owner/:repo/rulesets/13907542` → `required_status_checks`). Keep in step with
 *  the ruleset: a context listed there and missing here is a check this guard would not protect. */
export const REQUIRED_CONTEXTS = Object.freeze(['ci', 'pr-hygiene', 'browser-qa'])

const stripQuotes = (value) => value.replace(/^(['"])(.*)\1$/, '$2')
/** A YAML value without its trailing comment (` # …`), trimmed. */
const stripComment = (value) => value.replace(/(^|[ \t])#.*$/, '').trim()

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

/**
 * The group of every `concurrency:` key in a workflow source, in file order — workflow level and
 * job level alike, since either holds runs back and drops them. Reads the one-line form, whose
 * value is the group, and the block form's `group:`; anything else (a flow mapping, a block with no
 * `group:`) reads as `null`, which the guard refuses. The key is matched at any depth on purpose: a
 * false find fails the suite, where a missed group would strand PRs again.
 */
export function concurrencyGroups(source) {
  const lines = source.split('\n')
  return lines.flatMap((line, index) => {
    const key = line.match(/^([ \t]*)concurrency:(.*)$/)
    if (!key) return []
    const value = stripComment(key[2])
    if (value === '') return [blockGroup(lines.slice(index + 1), key[1].length)]
    return [value.startsWith('{') ? null : stripQuotes(value)]
  })
}

/** The `group:` of a block mapping whose key is indented `depth`, or `null` when it has none. */
function blockGroup(following, depth) {
  for (const line of following) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue
    if (line.length - line.trimStart().length <= depth) return null // the mapping is over
    const group = line.match(/^[ \t]+group:(.*)$/)
    if (group) return stripQuotes(stripComment(group[1])) || null
  }
  return null
}

/**
 * Whether a concurrency group names a single run: it interpolates `${{ github.run_id }}` on its
 * own. The run id as a fallback (`${{ github.event.pull_request.number || github.run_id }}`) does
 * not count — a pull request event always has the number, so its runs still share the group.
 */
export function isUniquePerRun(group) {
  return group !== null && /\$\{\{\s*github\.run_id\s*\}\}/.test(group)
}

/**
 * Findings for one workflow file. Empty means it cannot strand a required check: it posts none of
 * them, or no two of its runs can meet in a concurrency group.
 */
export function checkWorkflow(file, source, required = REQUIRED_CONTEXTS) {
  const contexts = jobContexts(source).filter((context) => required.includes(context))
  if (contexts.length === 0) return []
  const noun = contexts.length === 1 ? 'context' : 'contexts'
  const posts = `${file} posts the required ${noun} ${contexts.join(', ')}`
  return concurrencyGroups(source)
    .filter((group) => !isUniquePerRun(group))
    .map((group) => ({
      file,
      contexts,
      group,
      rule: 'concurrency',
      message:
        (group === null
          ? `${posts} and declares a concurrency group this guard cannot read`
          : `${posts} and declares the concurrency group \`${group}\`, which its runs share`) +
        ' — a run the group cancels, in progress (#295) or still pending (#530), can strand a PR ' +
        'with every check green. Remove the block, or key the group on ${{ github.run_id }}.',
    }))
}

/** One line per finding, or the sentence the guard expects when there is nothing to report. */
export function formatFindings(findings) {
  if (findings.length === 0) {
    return 'REQUIRED-CHECKS: ok — no required workflow shares a concurrency group between runs'
  }
  return findings.map((finding) => `REQUIRED-CHECKS: ${finding.message}`).join('\n')
}

export function workflowEvents() {
  throw new Error('not implemented')
}
