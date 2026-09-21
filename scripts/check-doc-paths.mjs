#!/usr/bin/env node
// Guard: documentation paths are portable and real.
//
//   node scripts/check-doc-paths.mjs --staged   # pre-commit: only staged docs
//   node scripts/check-doc-paths.mjs            # CI: every tracked doc
//
// Two checks, each a pure function with its own unit tests under scripts/hooks/:
//   1. no machine-specific absolute paths, in every doc we author (docPaths.logic.mjs)
//   2. every cited repo-relative path exists, in PATH_EXISTENCE_FILES (docPathExists.logic.mjs)
// Exits 1 and prints one line per violation.

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
  findDeadPaths,
  formatDeadPaths,
  isPathExistenceFile,
} from './hooks/docPathExists.logic.mjs'

const staged = process.argv.includes('--staged')

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

const files = (
  staged
    ? git(['diff', '--cached', '--name-only', '--diff-filter=ACM'])
    : // --others picks up new, not-yet-committed docs; without it a fresh file
      // would slip past the sweep and only fail CI after it was committed.
      git(['ls-files', '--cached', '--others', '--exclude-standard'])
).filter(isScannedFile)

let absoluteFailures = 0
let deadFailures = 0
const absoluteReport = []
const deadReport = []

for (const file of files) {
  if (!existsSync(file)) continue // staged deletion racing the hook
  const text = readFileSync(file, 'utf8')

  const violations = findAbsolutePaths(text)
  if (violations.length > 0) {
    absoluteFailures += violations.length
    absoluteReport.push(formatViolations(file, violations))
  }

  if (isPathExistenceFile(file)) {
    const docDir = dirname(file) === '.' ? '' : dirname(file)
    const dead = findDeadPaths(text, existsSync, { docDir })
    if (dead.length > 0) {
      deadFailures += dead.length
      deadReport.push(formatDeadPaths(file, dead))
    }
  }
}

if (absoluteFailures === 0 && deadFailures === 0) {
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

process.exit(1)
