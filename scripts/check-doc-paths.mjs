#!/usr/bin/env node
// Guard: no machine-specific absolute paths in documentation.
//
//   node scripts/check-doc-paths.mjs --staged   # pre-commit: only staged docs
//   node scripts/check-doc-paths.mjs            # CI: every tracked doc
//
// Exits 1 and prints file:line:col for each violation. Detection logic (and its
// tests) live in scripts/hooks/docPaths.logic.mjs.

import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import {
  OPT_OUT_MARKER,
  findAbsolutePaths,
  formatViolations,
  isScannedFile,
} from './hooks/docPaths.logic.mjs'

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

let failures = 0
const report = []

for (const file of files) {
  if (!existsSync(file)) continue // staged deletion racing the hook
  const violations = findAbsolutePaths(readFileSync(file, 'utf8'))
  if (violations.length > 0) {
    failures += violations.length
    report.push(formatViolations(file, violations))
  }
}

if (failures === 0) {
  process.exit(0)
}

console.error('')
console.error(`❌ ${failures} machine-specific absolute path(s) found in documentation:`)
console.error('')
console.error(report.join('\n'))
console.error('')
console.error('   Docs must use repo-relative paths — an absolute path is true on one')
console.error('   machine only, and rots as soon as a directory is renamed.')
console.error('')
console.error('     cd /Users/you/code/ha/hacer   ->   from the repo root')
console.error('     ~/code/ha/web-ide/src/x.ts    ->   ../web-ide/src/x.ts')
console.error('')
console.error(`   If a doc genuinely must quote a real path, mark that line:  <!-- ${OPT_OUT_MARKER} -->`)
console.error('')
process.exit(1)
