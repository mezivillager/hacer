#!/usr/bin/env node
// Merge a PR once its required checks are green, and recover the stuck merge box on the way (#536):
// the coordinator's ~/.local/bin/gh-merge-on-green, moved into the repo so any session can finish a
// PR. Every pass reads the PR and its head's runs, asks merge-on-green.logic.mjs for the next action
// (the decisions and why live there), prints the premise, and does it. It never pushes to the branch.
//
//   node scripts/merge-on-green.mjs <pr> [owner/repo] [max-minutes]     (defaults: this repo, 30)
//
// Exit: 0 merged · 2 a required check failed · 3 timed out · 4 needs a person (reason printed) ·
// 1 usage. GH_BIN picks the gh binary (default: gh on PATH).

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { EXIT, decide, requiredContexts, withRerunMarker } from './merge-on-green.logic.mjs'

const [pr, repo = 'mezivillager/hacer', minutesArg = '30'] = process.argv.slice(2)
const minutes = Number(minutesArg)
if (!/^\d+$/.test(pr ?? '') || !Number.isFinite(minutes) || minutes < 0) {
  console.error('usage: node scripts/merge-on-green.mjs <pr> [owner/repo] [max-minutes]')
  process.exit(1)
}
const GH = process.env.GH_BIN || 'gh'
const POLL_MS = 20_000
const PR_FIELDS = 'number,state,isDraft,mergeStateStatus,headRefOid,baseRefName,autoMergeRequest,body'

const say = (line) => console.log(`[${new Date().toISOString().slice(11, 19)}Z] ${line}`)
const gh = (args) =>
  execFileSync(GH, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
/** gh's own words for a failure: the first line of its stderr. */
const failure = (error) => String(error.stderr || error.message).trim().split('\n')[0]

/** Parsed JSON, or null when gh fails. A failed call's stdout is an API error body (R518), never data. */
function ghJson(args) {
  try {
    return JSON.parse(gh(args))
  } catch {
    return null
  }
}

/** Every page of a list endpoint. The jq filter prints one JSON array per page. */
const ghPages = (endpoint, jq) =>
  gh(['api', endpoint, '--paginate', '--jq', jq])
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => JSON.parse(line))

/** Read once per run. Classic protection is asked only when the rulesets yield nothing (R518). */
function readRequired(base) {
  const fromRules = requiredContexts(ghJson(['api', `repos/${repo}/rules/branches/${base}`]), null)
  const found = fromRules.contexts
    ? fromRules
    : requiredContexts(null, ghJson(['api', `repos/${repo}/branches/${base}/protection`]))
  say(
    found.contexts
      ? `required on ${base} (${found.source}): ${found.contexts.join(', ')}`
      : `could not read the required contexts for ${base}: every check counts as required`,
  )
  return found.contexts
}

let required
function readSnapshot() {
  const snapshotPr = JSON.parse(gh(['pr', 'view', pr, '-R', repo, '--json', PR_FIELDS]))
  const sha = snapshotPr.headRefOid
  if (required === undefined) required = readRequired(snapshotPr.baseRefName)
  return {
    pr: snapshotPr,
    requiredContexts: required,
    checkRuns: ghPages(
      `repos/${repo}/commits/${sha}/check-runs?per_page=100`,
      '[.check_runs[] | {id, name, status, conclusion, suite: .check_suite.id}]',
    ),
    workflowRuns: ghPages(
      `repos/${repo}/actions/runs?head_sha=${sha}&per_page=100`,
      '[.workflow_runs[] | {id, name, workflow_id, event, status, conclusion, suite: .check_suite_id, attempt: .run_attempt}]',
    ),
  }
}

const history = { reruns: [], edits: [], refusals: {}, lastError: '', settled: null }

/** Runs one gh command for an action; a failure is counted, so the logic can stop repeating it. */
function attempt(kind, args) {
  try {
    gh(args)
    history.refusals[kind] = 0
  } catch (error) {
    history.refusals[kind] = (history.refusals[kind] ?? 0) + 1
    history.lastError = failure(error)
    say(`${kind} refused: ${history.lastError}`)
  }
}

function act(action, snapshot) {
  if (action.kind === 'merge') attempt('merge', ['pr', 'merge', pr, '-R', repo, '--rebase', '--auto'])
  if (action.kind === 'update-branch') attempt('update-branch', ['pr', 'update-branch', pr, '-R', repo])
  if (action.kind === 'rerun') {
    history.reruns.push(action.runId)
    attempt('rerun', ['run', 'rerun', String(action.runId), '-R', repo])
  }
  if (action.kind === 'edit-body') {
    const { body, headRefOid } = snapshot.pr
    history.edits.push(headRefOid)
    const dir = mkdtempSync(path.join(tmpdir(), 'merge-on-green-'))
    try {
      const file = path.join(dir, 'body.md')
      writeFileSync(file, withRerunMarker(body, headRefOid, new Date().toISOString()))
      attempt('edit-body', ['pr', 'edit', pr, '-R', repo, '--body-file', file])
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  }
}

// Exits by setting process.exitCode and leaving the loop, so the last premise is never cut off.
const deadline = Date.now() + minutes * 60_000
let last = ''
for (let pass = 1; ; pass += 1) {
  let snapshot = null
  try {
    snapshot = readSnapshot()
  } catch (error) {
    if (pass === 1) {
      say(`give-up: cannot read #${pr} in ${repo}: ${failure(error)}`)
      process.exitCode = EXIT['give-up']
      break
    }
    say(`wait: could not read #${pr} this pass: ${failure(error)}`)
  }
  if (snapshot) {
    const action = decide(snapshot, history)
    history.settled = action.settle ?? null
    const line = `${action.kind}: ${action.reason}`
    if (line !== last) say(line)
    last = line
    if (action.exit !== undefined) {
      process.exitCode = action.exit
      break
    }
    act(action, snapshot)
  }
  if (Date.now() >= deadline) {
    say(`timeout: #${pr} is not merged after ${minutes} min; last premise: ${last}`)
    process.exitCode = EXIT.timeout
    break
  }
  await sleep(POLL_MS)
}
