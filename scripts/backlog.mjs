#!/usr/bin/env node
// The backlog over GitHub Issues — answers "what can you pick up?" from the shell, and holds the claims (#531).
//
//   node scripts/backlog.mjs ready    [--json]   pickable tasks in pick order, then the rest with a reason, each with the
//                                               merged PRs that cite it as `possibly-delivered`; to stderr, the
//                                               dormant banner at 5 open agent PRs (#540), the slot the cycle resumes
//                                               at, after the latest claim (#535), what the claim history leaves a guess,
//                                               and `retro due: …` or `retro: …`, from origin/main's Runs row and
//                                               session records and the merged PRs it already reads; then
//                                               `main: <workflow> failing`, `<n> in a row since <time> (run <id>)`,
//                                               for each active workflow whose newest completed run on main failed,
//                                               each read on its own, or `main: workflows green`
//   node scripts/backlog.mjs next     [--json]   the head of ready's pick order, with ready's stderr; exit 3 when
//                                               nothing is pickable
//   node scripts/backlog.mjs projects [--json]   one line per docs/portfolio.md row: counts + next pick, `over cap` past 12
//   node scripts/backlog.mjs tasks <slug> [--json]  the row's epic tree, each task with its pick or reason, then the
//                                               tasks a `project:` label files under the row from outside it
//   node scripts/backlog.mjs claim <n> --by <id> [--session <id>] [--branch <b>] [--intent <i>] [--handoff <h>]
//   node scripts/backlog.mjs release <n> --by <id> [--force-stale --reason <why>]
//   node scripts/backlog.mjs tier <pr>           `VERIFIER-TIER: <opus|sonnet> pr=<n> because=<path|risk:2|none>`, from
//                                               every page of the PR's REST files list (a rename by both names) and
//                                               its labels: the model to dispatch its verifier on (#884)
//
// `claim` creates refs/heads/claim/<n> with GitHub's create-ref API, which refuses a ref that exists, then posts the
// claim comment and labels the issue `in-progress`; `release` is the holder's, or anyone's with --force-stale once the
// claim is stale. `claim` then prints `claim-drift:`, the commits on origin/main under the issue's "Files likely touched"
// since it was written (#703). A flag the command does not take is a usage error: exit 2. Only `gh` and `git` do I/O;
// every rule lives in backlog.logic.mjs. BACKLOG_ALLOWLIST=login,login overrides the author allowlist.

import { execFile, execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { parseArgs, promisify } from 'node:util'
import * as backlog from './backlog.logic.mjs'

const REPO = 'mezivillager/hacer'
const ISSUE_FIELDS = 'number,title,labels,author,blockedBy,blocking,parent,subIssuesSummary'
const ROOT = path.join(import.meta.dirname, '..')
const PORTFOLIO_PATH = path.join(ROOT, 'docs', 'portfolio.md')
const INBOX_PATH = 'docs/harness/harness-inbox.md'
const SESSIONS_PATH = 'docs/harness/sessions/'

const JSON_FLAG = { json: { type: 'boolean' } }
const text = (...names) => Object.fromEntries(names.map((name) => [name, { type: 'string' }]))
/** Each command's flags, and the one operand it takes, if any. */
const COMMANDS = {
  ready: { options: JSON_FLAG }, next: { options: JSON_FLAG }, projects: { options: JSON_FLAG },
  tasks: { options: JSON_FLAG, operand: 'slug' },
  claim: { options: text('by', 'session', 'branch', 'intent', 'handoff'), operand: 'issue' },
  release: { options: { ...text('by', 'reason'), 'force-stale': { type: 'boolean' } }, operand: 'issue' },
  tier: { options: {}, operand: 'pr' },
}
const USAGE = `usage: node scripts/backlog.mjs <ready|projects|next> [--json]
       node scripts/backlog.mjs tasks <slug> [--json]
       node scripts/backlog.mjs claim <n> --by <id> [--session <id>] [--branch <b>] [--intent <i>] [--handoff <h>]
       node scripts/backlog.mjs release <n> --by <id> [--force-stale --reason <why>]
       node scripts/backlog.mjs tier <pr>`

class UsageError extends Error {}

/** The command, its operand and its flags; anything the command does not take throws a UsageError. */
function parseCommandLine([name, ...args]) {
  const command = Object.hasOwn(COMMANDS, name ?? '') ? COMMANDS[name] : null
  if (!command) throw new UsageError(name ? `unknown command '${name}'` : 'no command')
  let parsed
  try {
    parsed = parseArgs({ args, options: command.options, allowPositionals: true })
  } catch (error) {
    throw new UsageError(error.message)
  }
  const { values: flags, positionals } = parsed
  const [operand] = positionals
  if (positionals.length !== (command.operand ? 1 : 0)) {
    throw new UsageError(`${name} takes ${command.operand ? `one <${command.operand}>` : 'no operand'}`)
  }
  if (command.operand === 'issue') {
    if (!/^[1-9]\d*$/.test(operand)) throw new UsageError(`'${operand}' is not an issue number`)
    if (!flags.by) throw new UsageError(`${name} needs --by <id>`)
  }
  if (command.operand === 'pr' && !/^[1-9]\d*$/.test(operand)) throw new UsageError(`'${operand}' is not a PR number`)
  return { name, operand, flags }
}

const GH_BINS = ['gh', path.join(homedir(), '.local', 'bin', 'gh')]
const GH_OPTIONS = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
const GH_NOT_FOUND = 'gh CLI not found on PATH or in ~/.local/bin'
const ghError = (error) => Object.assign(new Error(String(error.stderr).trim() || error.message), { stdout: error.stdout })

/** `gh` from PATH, else the release binary in ~/.local/bin (where brew's gh is too old to bottle); throws gh's message. */
function gh(...args) {
  for (const bin of GH_BINS) {
    try {
      return execFileSync(bin, args, { ...GH_OPTIONS, stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (error) {
      if (error.code !== 'ENOENT') throw ghError(error)
    }
  }
  throw new Error(GH_NOT_FOUND)
}
const ghJson = (...args) => JSON.parse(gh(...args))

/** ghJson without blocking, so that several reads run side by side. */
async function ghJsonAsync(...args) {
  for (const bin of GH_BINS) {
    let stdout
    try {
      ({ stdout } = await promisify(execFile)(bin, args, GH_OPTIONS))
    } catch (error) {
      if (error.code === 'ENOENT') continue
      throw ghError(error)
    }
    return JSON.parse(stdout)
  }
  throw new Error(GH_NOT_FOUND)
}

function git(...args) {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  } catch (error) {
    throw new Error(String(error.stderr ?? '').trim() || error.message)
  }
}

/** The commits on origin/main under the issue's seed files since it was written; never throws. */
function claimDriftOf(issue) {
  const readSeeds = async () => (await import('./blast-radius.logic.mjs')).parseFilesLikelyTouched(issue.body)
  return backlog.readClaimDrift(issue.createdAt, readSeeds, (seeds) => {
    git('fetch', '--quiet', 'origin', 'main')
    return git('log', `--since=${issue.createdAt}`, '--oneline', 'origin/main', '--', ...seeds)
  })
}

/** `fetch`'s value, or the error it threw, from its first call on: two readers, one call. */
function once(fetch) {
  let result
  return () => {
    if (!result) {
      try {
        result = { value: fetch() }
      } catch (error) {
        result = { error }
      }
    }
    if ('error' in result) throw result.error
    return result.value
  }
}

/** What retroLine reads: the Runs row and the session records added, both from origin/main, and the merges' times. */
const retroInputs = (fetchMergedPrs) => ({
  row: backlog.lastRunsRow(git('show', `origin/main:${INBOX_PATH}`)),
  records: backlog.addedFiles(git('log', 'origin/main', '--diff-filter=A', '--format=%x00%cI', '--name-only', '--', SESSIONS_PATH)),
  mainSha: git('rev-parse', 'origin/main').trim(),
  mergedAts: fetchMergedPrs().map((pr) => pr.mergedAt),
  now: Date.now(),
})

const mainRuns = (...args) => ghJsonAsync('run', 'list', '-R', REPO, '--branch', 'main',
  '--json', 'databaseId,workflowName,status,conclusion,createdAt', ...args)

/** What mainLines reads: each active workflow with a run failed on main, read on its own, and main's newest run. */
async function mainInputs() {
  const [workflows, latest, ...failed] = await Promise.all([
    ghJsonAsync('workflow', 'list', '-R', REPO, '--limit', '100', '--json', 'id,name'),
    mainRuns('--limit', '1'),
    ...backlog.FAILED_CONCLUSIONS.map((status) => mainRuns('--status', status, '--limit', '100')),
  ])
  const own = await Promise.all(backlog.workflowsToRead(workflows, failed.flat())
    .map((id) => mainRuns('--workflow', String(id), '--limit', String(backlog.WORKFLOW_RUNS))))
  return { runs: own.flat(), latest }
}

/** A `claim/<n>` whose n is no issue makes GraphQL answer `data` beside `errors`, and gh exit 1: keep the data. */
function graphql(query) {
  try {
    return ghJson('api', 'graphql', '-f', `query=${query}`)
  } catch (error) {
    if (!String(error.stdout).startsWith('{"data"')) throw error
    return JSON.parse(error.stdout)
  }
}

/** Every claim ref as readClaims joins them; `answer` also carries each claimed issue's labels; `openPrs` set dormant mode. */
function fetchClaims(allowlist) {
  const refs = ghJson('api', `repos/${REPO}/git/matching-refs/heads/claim/`)
  const lsRemote = refs.map((ref) => `${ref.object.sha}\t${ref.ref}`).join('\n') // as `git ls-remote` prints them
  const query = backlog.claimsQuery(REPO, lsRemote)
  const answer = query ? graphql(query) : null
  const openPrs = ghJson('pr', 'list', '-R', REPO, '--state', 'open', '--limit', '100', '--json', 'number,author,headRefName,closingIssuesReferences')
  return { answer, openPrs, claims: backlog.readClaims({ lsRemote, answer, openPrs, allowlist, now: Date.now() }) }
}

async function claim(number, flags, allowlist) {
  const body = backlog.claimComment(flags)
  const issue = ghJson('api', `repos/${REPO}/issues/${number}`, '--jq',
    '{state: (if .pull_request then "a pull request" else .state end), createdAt: .created_at, body: (.body // "")}')
  if (issue.state !== 'open') throw new Error(`#${number} is ${issue.state}: only an open issue is claimed`)
  const sha = gh('api', `repos/${REPO}/git/ref/heads/main`, '--jq', '.object.sha').trim()
  try {
    gh('api', `repos/${REPO}/git/refs`, '-f', `ref=refs/heads/claim/${number}`, '-f', `sha=${sha}`)
  } catch (error) {
    if (!/Reference already exists/.test(error.message)) throw error
    const held = fetchClaims(allowlist).claims.find((claim) => claim.number === number)
    throw new Error(backlog.claimTaken(held ?? { number, claimedBy: null, at: null, openPr: null, stale: false }))
  }
  try {
    gh('issue', 'comment', String(number), '-R', REPO, '--body', body)
    gh('issue', 'edit', String(number), '-R', REPO, '--add-label', 'in-progress')
  } catch (error) {
    throw new Error(`claim/${number} is yours, but the claim comment or the label did not land (${error.message}); add them by hand`)
  }
  const { drift, warning } = await claimDriftOf(issue)
  if (warning) console.error(warning)
  return [`claimed #${number} for ${flags.by}: refs/heads/claim/${number} at ${sha.slice(0, 7)}, labelled in-progress`, drift]
    .filter(Boolean).join('\n')
}

function release(number, flags, allowlist) {
  const { answer, claims } = fetchClaims(allowlist)
  const held = claims.find((claim) => claim.number === number)
  if (!held) throw new Error(`#${number} has no claim/${number} to release`)
  const refusal = backlog.releaseRefusal(held, { by: flags.by, forceStale: flags['force-stale'] })
  if (refusal) throw new Error(refusal)
  gh('api', '-X', 'DELETE', `repos/${REPO}/git/refs/heads/claim/${number}`)
  const labels = answer?.data?.repository?.[`i${number}`]?.labels.nodes.map((label) => label.name) ?? []
  if (labels.includes('in-progress')) gh('issue', 'edit', String(number), '-R', REPO, '--remove-label', 'in-progress')
  const note = backlog.releaseComment(held, { by: flags.by, reason: flags.reason })
  if (note) gh('issue', 'comment', String(number), '-R', REPO, '--body', note)
  return `released claim/${number}${note ? `, ${held.claimedBy ?? 'nobody named'}'s stale claim` : ''}`
}

function allowlistFromEnv() {
  const logins = (process.env.BACKLOG_ALLOWLIST ?? '').split(',').map((login) => login.trim()).filter(Boolean)
  return logins.length > 0 ? logins : backlog.DEFAULT_ALLOWLIST
}

/** `gh pr view --json files` stops at 100 files and has no previous name for a rename, so the REST list is read, every page. */
function tier(number) {
  const labels = ghJson('api', `repos/${REPO}/pulls/${number}`, '--jq', '[.labels[].name]')
  const pages = ghJson('api', '--paginate', '--slurp', `repos/${REPO}/pulls/${number}/files?per_page=100`)
  return backlog.formatVerifierTier(number, backlog.verifierTier(backlog.filePagesPaths(pages), labels))
}

const ACTIONS = { claim, release, tier }

/** The views that plan from the open issues, the claims and the claim history: ready, next, projects and tasks. */
async function view(name, slug, flags) {
  const [allowlist, portfolioRows] = [allowlistFromEnv(), backlog.requirePortfolioRows(readFileSync(PORTFOLIO_PATH, 'utf8'))]
  if (name === 'tasks') backlog.portfolioRow(portfolioRows, slug) // an unknown slug fails before any gh call
  const issues = ghJson('issue', 'list', '-R', REPO, '--state', 'open', '--limit', '500', '--json', ISSUE_FIELDS)
  const { claims, openPrs } = fetchClaims(allowlist)
  const fetchPage = (after) => graphql(backlog.claimHistoryQuery(REPO, after))
  const pages = await backlog.readClaimHistory(fetchPage, issues, portfolioRows, allowlist) // the cycle resumes from them
  const history = backlog.claimHistory(pages, allowlist)
  const inputs = [issues, portfolioRows, allowlist, claims, history]
  const fetchMergedPrs = once(() => ghJson('pr', 'list', '-R', REPO,
    '--state', 'merged', '--limit', String(backlog.MERGED_PR_WINDOW), '--json', 'number,title,body,mergedAt'))
  const readyPlan = () => {
    const { plan, warning } = backlog.readPossiblyDelivered(backlog.planReady(...inputs), fetchMergedPrs)
    if (warning) console.error(warning)
    return plan
  }
  if (name === 'ready' || name === 'next') {
    const gap = backlog.historyGap(pages, issues, portfolioRows, allowlist)
    const main = await backlog.readMainLines(mainInputs)
    for (const line of [backlog.formatDormant(backlog.dormantMode(openPrs, allowlist)),
      backlog.formatResume(backlog.resumePoint(issues, portfolioRows, history, allowlist)),
      gap && `cycle: claim history exhausted — ${gap}; the place above is a guess`,
      backlog.readRetroLine(() => retroInputs(fetchMergedPrs)), ...main]) if (line) console.error(line)
  }
  if (name === 'next') {
    const { exitCode, stdout, stderr } = backlog.reportNext(readyPlan(), flags)
    if (stdout) console.log(stdout)
    if (stderr) console.error(`backlog: ${stderr}`)
    process.exitCode = exitCode
    return
  }
  const [result, format] = {
    ready: () => [readyPlan(), backlog.formatReady],
    projects: () => [backlog.summarizeProjects(...inputs), backlog.formatProjects],
    tasks: () => [backlog.epicTree(slug, ...inputs), backlog.formatTasks],
  }[name]()
  console.log(flags.json ? JSON.stringify(result, null, 2) : format(result))
}

try {
  const { name, operand, flags } = parseCommandLine(process.argv.slice(2))
  if (Object.hasOwn(ACTIONS, name)) console.log(await ACTIONS[name](Number(operand), flags, allowlistFromEnv()))
  else await view(name, operand, flags)
} catch (error) {
  console.error(`backlog: ${error.message}`)
  if (error instanceof UsageError) console.error(USAGE)
  process.exitCode = error instanceof UsageError ? 2 : 1
}
