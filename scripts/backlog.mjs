#!/usr/bin/env node
// The backlog over GitHub Issues — answers "what can you pick up?" from the shell, and holds the claims (#531).
//
//   node scripts/backlog.mjs ready    [--json]   pickable tasks in pick order, then the rest with a reason
//   node scripts/backlog.mjs projects [--json]   one line per docs/portfolio.md row: counts + next pick
//   node scripts/backlog.mjs claim <n> --by <id> [--session <id>] [--branch <b>] [--intent <i>] [--handoff <h>]
//   node scripts/backlog.mjs release <n> --by <id> [--force-stale --reason <why>]
//
// `claim` creates refs/heads/claim/<n> with GitHub's create-ref API, which refuses a ref that exists, then posts the
// claim comment and labels the issue `in-progress`; `release` is the holder's, or anyone's with --force-stale once the
// claim is stale. Only `gh` does I/O; every rule lives in backlog.logic.mjs. BACKLOG_ALLOWLIST=login,login overrides
// the author allowlist. `tasks` and `next` follow (#149).

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import * as backlog from './backlog.logic.mjs'

const REPO = 'mezivillager/hacer'
const ISSUE_FIELDS = 'number,title,labels,author,blockedBy,blocking,parent'
const PORTFOLIO_PATH = path.join(import.meta.dirname, '..', 'docs', 'portfolio.md')

const COMMANDS = new Map([
  ['ready', { plan: backlog.planReady, format: backlog.formatReady }],
  ['projects', { plan: backlog.summarizeProjects, format: backlog.formatProjects }],
])

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

/** Every claim ref as readClaims joins them; `answer` also carries each claimed issue's labels. */
function fetchClaims(allowlist) {
  const refs = ghJson('api', `repos/${REPO}/git/matching-refs/heads/claim/`)
  const lsRemote = refs.map((ref) => `${ref.object.sha}\t${ref.ref}`).join('\n') // as `git ls-remote` prints them
  const query = backlog.claimsQuery(REPO, lsRemote)
  const answer = query ? graphql(query) : null
  const openPrs = ghJson('pr', 'list', '-R', REPO, '--state', 'open', '--limit', '100', '--json', 'number,headRefName,closingIssuesReferences')
  return { answer, claims: backlog.readClaims({ lsRemote, answer, openPrs, allowlist, now: Date.now() }) }
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

const ACTIONS = new Map([['claim', claim], ['release', release]])
const OPTIONS = { json: { type: 'boolean' }, 'force-stale': { type: 'boolean' },
  ...Object.fromEntries(['by', 'session', 'branch', 'intent', 'handoff', 'reason'].map((name) => [name, { type: 'string' }])) }

try {
  const { values: flags, positionals: [commandName, issue] } = parseArgs({ allowPositionals: true, options: OPTIONS })
  const [command, action, number] = [COMMANDS.get(commandName), ACTIONS.get(commandName), Number(issue)]
  if (command) {
    const [allowlist, portfolioRows] = [allowlistFromEnv(), backlog.parsePortfolio(readFileSync(PORTFOLIO_PATH, 'utf8'))]
    const issues = ghJson('issue', 'list', '-R', REPO, '--state', 'open', '--limit', '500', '--json', ISSUE_FIELDS)
    const result = command.plan(issues, portfolioRows, allowlist, fetchClaims(allowlist).claims)
    console.log(flags.json ? JSON.stringify(result, null, 2) : command.format(result))
  } else if (action && Number.isInteger(number) && number > 0 && flags.by) {
    console.log(action(number, flags, allowlistFromEnv()))
  } else {
    console.error(`usage: node scripts/backlog.mjs <${[...COMMANDS.keys()].join('|')}> [--json] | <claim|release> <n> --by <id> [flags]`)
    process.exitCode = 2
  }
} catch (error) {
  console.error(`backlog: ${error.message}`)
  process.exitCode = 1
}
