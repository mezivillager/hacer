#!/usr/bin/env node
// Guard: documentation paths are portable and real.
//
//   node scripts/check-doc-paths.mjs --staged   # pre-commit: only staged docs
//   node scripts/check-doc-paths.mjs            # CI: every tracked doc
//
// Three checks, each a pure function with its own unit tests under scripts/hooks/:
//   1. no machine-specific absolute paths, in every doc we author (docPaths.logic.mjs)
//   2. every cited repo-relative path is in git's file list, in PATH_EXISTENCE_PATTERNS less dated
//      history; a doc in docPathExists.baseline.json keeps exactly its count (docPathExists.logic.mjs)
//   3. a hard line-count ceiling for the docs listed in LINE_BUDGETS (docLineBudget.logic.mjs)
// Exits 1 and prints one line per violation. Suspect code fences, in every doc, are a warning:
// printed, exit code unchanged.

import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  OPT_OUT_MARKER,
  findAbsolutePaths,
  formatViolations,
  isScannedFile,
} from './hooks/docPaths.logic.mjs'
import {
  MISSING_PATH_MARKER,
  PATH_EXISTENCE_PATTERNS,
  deadPathVerdict,
  findDeadPaths,
  findFenceWarnings,
  formatDeadPaths,
  formatFenceWarnings,
  isPathExistenceFile,
  trackedPathExists,
} from './hooks/docPathExists.logic.mjs'
import { findLineBudgetViolations, formatLineBudgetViolations } from './hooks/docLineBudget.logic.mjs'

const staged = process.argv.includes('--staged')
const BASELINE_FILE = 'scripts/hooks/docPathExists.baseline.json'

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

// Citations resolve against git's list, never the disk, where ignored dist/ appears after a build: the
// index under --staged, as that is the commit; plus --others in the sweep, so a new doc fails before CI.
const listed = git(['ls-files', '--cached', ...(staged ? [] : ['--others', '--exclude-standard'])])
const exists = trackedPathExists(listed)
const files = (staged ? git(['diff', '--cached', '--name-only', '--diff-filter=ACM']) : listed).filter(isScannedFile)

let absoluteFailures = 0
let deadFailures = 0
const absoluteReport = []
const deadReport = []
const fenceReport = []
const staleGrandfathered = []
const grownGrandfathered = []
const budgetCandidates = []

for (const file of files) {
  if (!existsSync(file)) continue // staged deletion racing the hook
  const text = readFileSync(file, 'utf8')

  const violations = findAbsolutePaths(text)
  if (violations.length > 0) {
    absoluteFailures += violations.length
    absoluteReport.push(formatViolations(file, violations))
  }

  const fenceWarnings = findFenceWarnings(text)
  if (fenceWarnings.length > 0) fenceReport.push(formatFenceWarnings(file, fenceWarnings))

  const docDir = dirname(file) === '.' ? '' : dirname(file)
  if (isPathExistenceFile(file)) {
    const dead = findDeadPaths(text, exists, { docDir })
    const { status, allowed } = deadPathVerdict(file, dead.length)
    if (status === 'shrank') {
      staleGrandfathered.push(`STALE GRANDFATHER ${file} ${allowed} → ${dead.length}`)
    } else if (status === 'grew' && allowed > 0) {
      grownGrandfathered.push(`GRANDFATHER GREW ${file} ${allowed} → ${dead.length}\n${formatDeadPaths(file, dead)}`)
    } else if (status === 'grew') {
      deadFailures += dead.length
      deadReport.push(formatDeadPaths(file, dead))
    }
  }

  budgetCandidates.push({ path: file, text })
}

const budgetViolations = findLineBudgetViolations(budgetCandidates)

if (fenceReport.length > 0) {
  console.error('')
  console.error('⚠️  code fences that look broken (warning only):')
  console.error('')
  console.error(fenceReport.join('\n'))
  console.error('')
  console.error('   A fence left open, or a stray one, turns the prose after it into code: it renders')
  console.error('   wrong and hides its path citations from this check. Nest a fence inside a longer one.')
  console.error('')
}

if (
  absoluteFailures === 0 &&
  deadFailures === 0 &&
  grownGrandfathered.length === 0 &&
  staleGrandfathered.length === 0 &&
  budgetViolations.length === 0
) {
  process.exit(0)
}

if (absoluteFailures > 0) {
  console.error('')
  console.error(`❌ ${absoluteFailures} machine-specific absolute path(s) found in documentation:`)
  console.error('')
  console.error(absoluteReport.join('\n'))
  console.error('')
  console.error('   Docs must use repo-relative paths — an absolute path is true on one')
  console.error('   machine only, and rots as soon as a directory is renamed.')
  console.error('')
  console.error('     cd /Users/you/code/ha/hacer   ->   from the repo root')
  console.error('     ~/code/ha/web-ide/src/x.ts    ->   ../web-ide/src/x.ts')
  console.error('')
  console.error(`   If a doc genuinely must quote a real path, mark that line:  <!-- ${OPT_OUT_MARKER} -->`)
  console.error('')
}

if (deadFailures > 0) {
  console.error('')
  console.error(`❌ ${deadFailures} cited path(s) do not exist (${PATH_EXISTENCE_PATTERNS.join(', ')}):`)
  console.error('')
  console.error(deadReport.join('\n'))
  console.error('')
  console.error('   These docs are what agents read first; a path that is not there sends')
  console.error('   them nowhere. Correct the citation, or remove the line if the file is')
  console.error('   only planned — do not invent files.')
  console.error('')
  console.error(`   To cite a path deliberately ahead of its file, mark that line:  <!-- ${MISSING_PATH_MARKER} -->`)
  console.error('')
}

if (grownGrandfathered.length > 0) {
  console.error('')
  console.error(`❌ ${grownGrandfathered.length} grandfathered doc(s) gained a dead citation (baseline → now):`)
  console.error('')
  console.error(grownGrandfathered.join('\n'))
  console.error('')
  console.error('   A grandfathered doc keeps the dead citations it had and gains none. Every dead')
  console.error('   citation in it is listed: correct the one this change added. Raising its count')
  console.error(`   in ${BASELINE_FILE} fails pr-hygiene.`)
  console.error('')
}

if (staleGrandfathered.length > 0) {
  console.error('')
  console.error(`❌ ${staleGrandfathered.length} grandfathered doc(s) lost a dead citation (baseline → now):`)
  console.error('')
  console.error(staleGrandfathered.join('\n'))
  console.error('')
  console.error(`   Lower each count in ${BASELINE_FILE} to the new one, or remove the`)
  console.error('   entry at 0, so the check holds the doc there. The baseline only shrinks.')
  console.error('')
}

if (budgetViolations.length > 0) {
  console.error('')
  console.error(`❌ ${budgetViolations.length} doc(s) over their line-count budget:`)
  console.error('')
  console.error(formatLineBudgetViolations(budgetViolations))
  console.error('')
  console.error('   These are meant to stay a table of contents — point to the file that owns')
  console.error('   the full detail instead of restating it here.')
  console.error('')
}

process.exit(1)
