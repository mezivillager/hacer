#!/usr/bin/env node
// browser-qa: browser QA in the cloud for critical changes (ADR-0016, #220).
//
//   node scripts/browser-qa.mjs decide <files.txt> <pull.json> <decision.json>
//   node scripts/browser-qa.mjs report <playwright-results.json> <decision.json>
//
// `decide` reads the PR's file names, one per line, and the PR itself (GET …/pulls/{n}: labels
// and body) — the workflow fetches both with `gh api`. It resolves the issues the body links
// (`Fixes|Closes|Resolves|Part of #n`, pr-hygiene's findLinkedIssues) and reads their labels
// with `gh api` (GITHUB_TOKEN; locally, gh's own login). It prints one greppable
// `BROWSER-QA: skipped (no critical paths)` or `BROWSER-QA: critical suites=… — …` line, writes
// the decision to <decision.json> and `critical=` / `suites=` / `grep=` to $GITHUB_OUTPUT when
// set, and exits 0 — or fails, closed, when a linked issue cannot be read.
//
// `report` reads the Playwright JSON report (`--reporter=json`), prints one
// `BROWSER-QA: PASS|FAIL suites=… passed=… failed=…` line, appends a job summary to
// $GITHUB_STEP_SUMMARY when set, and exits 1 on FAIL — including when the report is missing
// or no test ran. Rules live in browser-qa.logic.mjs.

import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { decide, formatDecision, formatSummary, formatVerdict, grepFor, summarizeResults, verdict } from './browser-qa.logic.mjs'
import { findLinkedIssues } from './pr-hygiene.logic.mjs'

const REPO = process.env.GITHUB_REPOSITORY ?? 'mezivillager/hacer'
const [command, ...args] = process.argv.slice(2)

const lines = (file) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null)

const summarize = (markdown) => {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown)
}

/** Labels of issue #n. Throws — failing the step — when it cannot be read. */
const issueLabels = (number) =>
  execFileSync('gh', ['api', `repos/${REPO}/issues/${number}`, '--jq', '.labels[].name'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)

if (command === 'decide' && args.length === 3) {
  const [filesPath, pullPath, decisionPath] = args
  const pull = JSON.parse(readFileSync(pullPath, 'utf8'))
  const linkedIssues = findLinkedIssues(pull.body).map((number) => ({ number, labels: issueLabels(number) }))
  const decision = decide(lines(filesPath), pull.labels.map((label) => label.name), linkedIssues)
  writeFileSync(decisionPath, JSON.stringify(decision, null, 2) + '\n')
  console.log(formatDecision(decision))
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `critical=${decision.critical}\nsuites=${decision.suites.join(',')}\ngrep=${grepFor(decision.suites)}\n`,
    )
  }
  summarize(formatSummary(decision))
  process.exit(0)
}

if (command === 'report' && args.length === 2) {
  const [resultsPath, decisionPath] = args
  const decision = readJson(decisionPath) ?? { critical: true, reasons: [], suites: [] }
  const summary = summarizeResults(readJson(resultsPath))
  console.log(formatVerdict(decision.suites, summary))
  summarize(formatSummary(decision, summary))
  process.exit(verdict(summary).verdict === 'FAIL' ? 1 : 0)
}

console.error(
  'usage: node scripts/browser-qa.mjs decide <files.txt> <pull.json> <decision.json> | report <results.json> <decision.json>',
)
process.exit(2)
