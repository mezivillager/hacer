#!/usr/bin/env node
// second-opinion: an advisory, strictly read-only cursor-agent review of one PR (#296).
//
//   node scripts/second-opinion.mjs <pr-number> [--model composer-2.5]
//
// Read-only never comes from leaving `--force` off: the owner's own ~/.cursor/cli-config.json sets
// approvalMode "unrestricted", so a plain `-p` run writes files (docs/harness/cursor-lane.md §1.2,
// trial runs 3 and 4). It comes from two deny layers, both verified: CURSOR_CONFIG_DIR pointed at a
// temp dir holding reviewerConfig(), and the throwaway checkout's own .cursor/cli.json — written
// after .cursor/ is deleted, so the PR cannot ship hooks, rules, MCP servers or permissions of its
// own. Nothing here reads or writes ~/.cursor/. The rubric is read from origin/main, never from the
// PR; the diff goes in fenced as untrusted data.
//
// Advisory: a BLOCK still exits 0 — only the Claude verifier can turn one into a blocker
// (docs/harness/verifier-brief.md). Non-zero means the *run* is not trustworthy: EXIT.timeout, .dirty
// (the run changed the worktree) and .unverified (could not look) each get their own code.
// Every run appends one JSON line to <git-common-dir>/hacer-lane-runs/second-opinion.jsonl.

import { execFileSync, spawn } from 'node:child_process'
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { findLinkedIssues } from './pr-hygiene.logic.mjs'
import {
  AUDIT_FILE,
  DEFAULT_MODEL,
  EXIT,
  KILL_GRACE_MS,
  TIMEOUT_MS,
  assessDelivery,
  auditLine,
  buildPrompt,
  costOf,
  cursorArgs,
  extractRubric,
  formatSummaryLine,
  parseReview,
  ratesForRun,
  readStream,
  refusedFlags,
  reviewerConfig,
  totalTokens,
} from './second-opinion.logic.mjs'

const die = (code, message) => {
  console.error(`second-opinion: ${message}`)
  process.exit(code)
}

const argv = process.argv.slice(2)
const refused = refusedFlags(argv)
if (refused.length > 0) die(EXIT.refusedFlag, `refusing ${refused.join(' ')} — this reviewer is read-only (cursor-lane.md §1.2)`)

const pr = Number(argv[0])
const modelAt = argv.indexOf('--model')
const model = modelAt === -1 ? DEFAULT_MODEL : argv[modelAt + 1]
if (!Number.isInteger(pr) || pr <= 0 || !model) die(EXIT.usage, 'usage: node scripts/second-opinion.mjs <pr-number> [--model composer-2.5]')

const BIG = { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
const git = (args, cwd) => execFileSync('git', args, { ...BIG, cwd })
const gh = (args) => execFileSync(process.env.GH_BIN ?? 'gh', args, BIG)

/**
 * The CLI has no timeout flag, and `timeout 900` would kill only the wrapper: the 2026-09-19 trial
 * leaked one MCP child per run. Spawning detached puts the CLI and its children in one process
 * group, so the whole group can be signalled.
 */
function runReviewer({ checkout, configDir, prompt }) {
  return new Promise((resolve) => {
    const child = spawn(process.env.CURSOR_AGENT_BIN ?? 'cursor-agent', cursorArgs({ model, prompt }), {
      cwd: checkout,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, CURSOR_CONFIG_DIR: configDir },
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const killGroup = (signal) => {
      try {
        process.kill(-child.pid, signal)
      } catch {
        /* the group is already gone */
      }
    }
    const timer = setTimeout(() => {
      timedOut = true
      killGroup('SIGTERM')
      setTimeout(() => killGroup('SIGKILL'), KILL_GRACE_MS).unref()
    }, TIMEOUT_MS)
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))
    const finish = (code, error) => {
      clearTimeout(timer)
      resolve({ stdout, stderr: error ? `${stderr}${error}` : stderr, code, timedOut })
    }
    child.on('close', (code) => finish(code))
    child.on('error', (error) => finish(null, error))
  })
}

// ---------------------------------------------------------------- set up the throwaway checkout

const started = Date.now()
const tmpRoot = mkdtempSync(path.join(tmpdir(), `hacer-second-opinion-${pr}-`))
const checkout = path.join(tmpRoot, 'checkout')
const configDir = path.join(tmpRoot, 'cursor-config')
let exitCode = EXIT.ok

try {
  const head = gh(['pr', 'view', String(pr), '--json', 'headRefOid', '--jq', '.headRefOid']).trim()
  git(['fetch', 'origin', 'main', `pull/${pr}/head`])
  git(['worktree', 'add', '--detach', checkout, head])
  rmSync(path.join(checkout, '.cursor'), { recursive: true, force: true })
  mkdirSync(path.join(checkout, '.cursor'), { recursive: true })
  writeFileSync(path.join(checkout, '.cursor', 'cli.json'), JSON.stringify(reviewerConfig(), null, 2))
  mkdirSync(configDir, { recursive: true })
  writeFileSync(path.join(configDir, 'cli-config.json'), JSON.stringify(reviewerConfig(), null, 2))

  const rubric = extractRubric(git(['show', 'origin/main:docs/harness/cursor-lane.md']))
  if (!rubric) throw new Error('no §1.5 rubric block in docs/harness/cursor-lane.md on origin/main')
  const criteria = findLinkedIssues(gh(['pr', 'view', String(pr), '--json', 'body', '--jq', '.body']))
    .map((issue) => gh(['issue', 'view', String(issue), '--json', 'body', '--jq', '.body']))
    .join('\n\n')
  const prompt = buildPrompt({ rubric, criteria, diff: gh(['pr', 'diff', String(pr)]) })

  // ---------------------------------------------------------------- run, then prove it only read
  const before = git(['status', '--porcelain'], checkout)
  const { stdout, stderr, code, timedOut } = await runReviewer({ checkout, configDir, prompt })
  let after = null
  let error = null
  try {
    after = git(['status', '--porcelain'], checkout)
  } catch (statusError) {
    error = statusError
  }

  const { text, usage, model: resolved } = readStream(stdout)
  const { verdict } = parseReview(text)
  const delivery = assessDelivery({ before, after, error })
  exitCode = timedOut
    ? EXIT.timeout
    : delivery.state === 'unknown'
      ? EXIT.unverified
      : delivery.state === 'dirty'
        ? EXIT.dirty
        : code === 0
          ? EXIT.ok
          : EXIT.failed

  if (text.trim()) console.log(text.trim())
  if (timedOut) console.error(`second-opinion: no answer within ${TIMEOUT_MS / 1000}s — killed the process group`)
  if (delivery.state === 'dirty') console.error(`second-opinion: the run left files behind: ${delivery.changed.join(', ')}`)
  if (delivery.state === 'unknown') console.error(`second-opinion: could not check the worktree — ${delivery.reason}`)
  if (exitCode !== EXIT.ok && stderr.trim()) console.error(stderr.trim().split('\n').slice(-5).join('\n'))

  const wallMs = Date.now() - started
  const cost = costOf(usage, ratesForRun(resolved, model))
  const summary = { pr, model: resolved ?? model, verdict, wallMs, tokens: totalTokens(usage), cost }
  console.log(formatSummaryLine(summary))

  const auditPath = path.join(git(['rev-parse', '--path-format=absolute', '--git-common-dir']).trim(), AUDIT_FILE)
  mkdirSync(path.dirname(auditPath), { recursive: true })
  appendFileSync(auditPath, auditLine({ pr, requestedModel: model, resolvedModel: resolved, usage, wallMs, exitCode, verdict }))
} catch (error) {
  console.error(`second-opinion: ${error?.message ?? error}`)
  if (exitCode === EXIT.ok) exitCode = EXIT.failed
} finally {
  try {
    git(['worktree', 'remove', '--force', checkout])
  } catch {
    /* it was never created */
  }
  rmSync(tmpRoot, { recursive: true, force: true })
}

process.exit(exitCode)
