#!/usr/bin/env node
// Blast radius of seed files (#333).
//
//   node scripts/blast-radius.mjs [--json] <file…>
//   node scripts/blast-radius.mjs [--json] --issue <n>
//
// Prints the production files that import the seeds directly, and the reverse transitive
// closure, with counts. *.test.* is excluded from the production count and reported as tests.
// --issue reads the seeds from that issue's "Files likely touched" section.
// Exit 0 means the report printed. overThreshold=true means the seeds are not agent-ready
// as written — that is a triage decision, not a failing command (docs/harness/README.md).
// The scan is `git ls-files`, so an untracked path shows up under Unmatched seeds.
// Rules: blast-radius.logic.mjs.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { blastRadius, formatJson, formatReport, parseArgs, parseFilesLikelyTouched } from './blast-radius.logic.mjs'

const SOURCE = /\.(?:[cm]?[jt]sx?|d\.ts)$/

const parsed = parseArgs(process.argv.slice(2))
if (!parsed.ok) {
  console.error(parsed.error)
  process.exit(2)
}

const seeds = [...parsed.files]
if (parsed.issue !== null) {
  let body = ''
  try {
    body = execFileSync('gh', ['issue', 'view', String(parsed.issue), '--json', 'body', '--jq', '.body'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`blast-radius: could not read issue #${parsed.issue} — ${message}`)
    process.exit(1)
  }
  const fromIssue = parseFilesLikelyTouched(body)
  if (fromIssue.length === 0) {
    console.error(`blast-radius: issue #${parsed.issue} has no paths under "Files likely touched"`)
    process.exit(1)
  }
  seeds.push(...fromIssue)
}

const root = path.resolve(import.meta.dirname, '..')
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean)
const files = {}
for (const rel of tracked) {
  const posix = rel.split(path.sep).join('/')
  if (!SOURCE.test(posix)) {
    files[posix] = ''
    continue
  }
  try {
    files[posix] = readFileSync(path.join(root, rel), 'utf8')
  } catch {
    files[posix] = ''
  }
}

const report = blastRadius({ files, seeds })
process.stdout.write(parsed.json ? formatJson(report) : formatReport(report))
