#!/usr/bin/env node
// The backlog over GitHub Issues — answers "what can you pick up?" from the shell, and holds the claims (#531).
//
//   node scripts/backlog.mjs ready    [--json]   pickable tasks in pick order, then the rest with a reason; to stderr, the
//                                               dormant banner at 5 open agent PRs (#540), the slot the cycle resumes
//                                               at, after the latest claim (#535), and what the claim history leaves a guess
//   node scripts/backlog.mjs next     [--json]   the head of ready's pick order, with ready's stderr; exit 3 when
//                                               nothing is pickable
//   node scripts/backlog.mjs projects [--json]   one line per docs/portfolio.md row: counts + next pick, `over cap` past 12
//   node scripts/backlog.mjs tasks <slug> [--json]  the row's epic tree, each task with its pick or reason, then the
//                                               tasks a `project:` label files under the row from outside it
//   node scripts/backlog.mjs claim <n> --by <id> [--session <id>] [--branch <b>] [--intent <i>] [--handoff <h>]
//   node scripts/backlog.mjs release <n> --by <id> [--force-stale --reason <why>]
//
// `claim` creates refs/heads/claim/<n> with GitHub's create-ref API, which refuses a ref that exists, then posts the
// claim comment and labels the issue `in-progress`; `release` is the holder's, or anyone's with --force-stale once the
// claim is stale. A flag the command does not take is a usage error: exit 2. Only `gh` does I/O; every rule lives in
// backlog.logic.mjs. BACKLOG_ALLOWLIST=login,login overrides the author allowlist.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import * as backlog from './backlog.logic.mjs'

const REPO = 'mezivillager/hacer'
const ISSUE_FIELDS = 'number,title,labels,author,blockedBy,blocking,parent,subIssuesSummary'
const PORTFOLIO_PATH = path.join(import.meta.dirname, '..', 'docs', 'portfolio.md')

const JSON_FLAG = { json: { type: 'boolean' } }
const text = (...names) => Object.fromEntries(names.map((name) => [name, { type: 'string' }]))
/** Each command's flags, and the one operand it takes, if any. */
const COMMANDS = {
  ready: { options: JSON_FLAG }, next: { options: JSON_FLAG }, projects: { options: JSON_FLAG },
  tasks: { options: JSON_FLAG, operand: 'slug' },
  claim: { options: text('by', 'session', 'branch', 'intent', 'handoff'), operand: 'issue' },
  release: { options: { ...text('by', 'reason'), 'force-stale': { type: 'boolean' } }, operand: 'issue' },
}
const USAGE = `usage: node scripts/backlog.mjs <ready|projects|next> [--json]
       node scripts/backlog.mjs tasks <slug> [--json]
       node scripts/backlog.mjs claim <n> --by <id> [--session <id>] [--branch <b>] [--intent <i>] [--handoff <h>]
       node scripts/backlog.mjs release <n> --by <id> [--force-stale --reason <why>]`

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
  return { name, operand, flags }
}

/** `gh` from PATH, else the release binary in ~/.local/bin (where brew's gh is too old to bottle); throws gh's message. */
function gh(...args) {
  for (const bin of ['gh', path.join(homedir(), '.local', 'bin', 'gh')]) {
    try {
      return execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (error) {
      if (error.code !== 'ENOENT') throw Object.assign(new Error(String(error.stderr).trim() || error.message), { stdout: error.stdout })
    }
  }
  throw new Error('gh CLI not found on PATH or in ~/.local/bin')
}
const ghJson = (...args) => JSON.parse(gh(...args))

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

function claim(number, flags, allowlist) {
  const body = backlog.claimComment(flags)
  const state = gh('api', `repos/${REPO}/issues/${number}`, '--jq', 'if .pull_request then "a pull request" else .state end').trim()
  if (state !== 'open') throw new Error(`#${number} is ${state}: only an open issue is claimed`)
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
  return `claimed #${number} for ${flags.by}: refs/heads/claim/${number} at ${sha.slice(0, 7)}, labelled in-progress`
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

const ACTIONS = { claim, release }

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
  if (name === 'ready' || name === 'next') {
    const gap = backlog.historyGap(pages, issues, portfolioRows, allowlist)
    for (const line of [backlog.formatDormant(backlog.dormantMode(openPrs, allowlist)),
      backlog.formatResume(backlog.resumePoint(issues, portfolioRows, history, allowlist)),
      gap && `cycle: claim history exhausted — ${gap}; the place above is a guess`]) if (line) console.error(line)
  }
  if (name === 'next') {
    const { exitCode, stdout, stderr } = backlog.reportNext(backlog.planReady(...inputs), flags)
    if (stdout) console.log(stdout)
    if (stderr) console.error(`backlog: ${stderr}`)
    process.exitCode = exitCode
    return
  }
  const [result, format] = {
    ready: () => [backlog.planReady(...inputs), backlog.formatReady],
    projects: () => [backlog.summarizeProjects(...inputs), backlog.formatProjects],
    tasks: () => [backlog.epicTree(slug, ...inputs), backlog.formatTasks],
  }[name]()
  console.log(flags.json ? JSON.stringify(result, null, 2) : format(result))
}

try {
  const { name, operand, flags } = parseCommandLine(process.argv.slice(2))
  if (Object.hasOwn(ACTIONS, name)) console.log(ACTIONS[name](Number(operand), flags, allowlistFromEnv()))
  else await view(name, operand, flags)
} catch (error) {
  console.error(`backlog: ${error.message}`)
  if (error instanceof UsageError) console.error(USAGE)
  process.exitCode = error instanceof UsageError ? 2 : 1
}
