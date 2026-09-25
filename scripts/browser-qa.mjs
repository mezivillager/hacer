#!/usr/bin/env node
// browser-qa: browser QA in the cloud for critical changes (ADR-0016, #220).
//
//   node scripts/browser-qa.mjs decide <files.txt> <pull.json> <decision.json>
//   node scripts/browser-qa.mjs report <playwright-results.json> <decision.json>
//
// `decide` reads the PR's file names (one per line) and the PR (GET …/pulls/{n}), reads the labels
// of the issues its body links (pr-hygiene's findLinkedIssues) with `gh api`, prints one greppable
// `BROWSER-QA: skipped (no critical paths)` or `BROWSER-QA: critical …` line, writes <decision.json>
// and $GITHUB_OUTPUT (critical/suites/grep), and exits 0 — or 1, failing closed, on an unreadable issue.
//
// `report` reads the Playwright JSON report, prints one `BROWSER-QA: PASS|FAIL suites=… passed=…
// failed=…` line and a $GITHUB_STEP_SUMMARY, and exits 1 on FAIL — a missing report or a run in
// which no test ran included. Rules live in browser-qa.logic.mjs.
//
// The check's last line — a skip, or the verdict — is also published where Mission Control reads it: a
// notice on this check run and the job summary (#477, check-lines.logic.mjs).

import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { decide, formatDecision, formatSummary, formatVerdict, grepFor, summarizeResults, verdict } from './browser-qa.logic.mjs'
import { publishLine } from './check-lines.logic.mjs'
import { findLinkedIssues } from './pr-hygiene.logic.mjs'

const REPO = process.env.GITHUB_REPOSITORY ?? 'mezivillager/hacer'
const [command, ...args] = process.argv.slice(2)

const lines = (text) => text.split('\n').map((s) => s.trim()).filter(Boolean)

const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null)

const summarize = (markdown) => {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown)
}
const publish = (line) => publishLine(line, { env: process.env, log: console.log, append: appendFileSync })

/** Labels of issue #n. Throws — failing the step — when it cannot be read. */
const issueLabels = (number) =>
  lines(execFileSync('gh', ['api', `repos/${REPO}/issues/${number}`, '--jq', '.labels[].name'], { encoding: 'utf8' }))

if (command === 'decide' && args.length === 3) {
  const [filesPath, pullPath, decisionPath] = args
  const pull = JSON.parse(readFileSync(pullPath, 'utf8'))
  const linkedIssues = findLinkedIssues(pull.body).map((number) => ({ number, labels: issueLabels(number) }))
  const decision = decide(lines(readFileSync(filesPath, 'utf8')), pull.labels.map((label) => label.name), linkedIssues)
  writeFileSync(decisionPath, JSON.stringify(decision, null, 2) + '\n')
  console.log(formatDecision(decision))
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `critical=${decision.critical}\nsuites=${decision.suites.join(',')}\ngrep=${grepFor(decision.suites)}\n`,
    )
  }
  summarize(formatSummary(decision))
  if (!decision.critical) publish(formatDecision(decision)) // a critical PR's last line is report's verdict
  process.exit(0)
}

if (command === 'report' && args.length === 2) {
  const [resultsPath, decisionPath] = args
  const decision = readJson(decisionPath) ?? { critical: true, reasons: [], suites: [] }
  const summary = summarizeResults(readJson(resultsPath))
  const line = formatVerdict(decision.suites, summary)
  console.log(line)
  summarize(formatSummary(decision, summary))
  publish(line)
  process.exit(verdict(summary).verdict === 'FAIL' ? 1 : 0)
}

console.error(
  'usage: node scripts/browser-qa.mjs decide <files.txt> <pull.json> <decision.json> | report <results.json> <decision.json>',
)
process.exit(2)
