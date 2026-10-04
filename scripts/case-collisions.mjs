#!/usr/bin/env node
// Fail when two tracked paths are one path on a case-insensitive filesystem (#516). Part of `pnpm run lint`.
//   node scripts/case-collisions.mjs [--root <repo>]   exit 0 clean, 1 a collision, 2 the tree could not be listed

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { findCaseCollisions, formatReport, parseArgs } from './case-collisions.logic.mjs'

const parsed = parseArgs(process.argv.slice(2), { root: path.resolve(import.meta.dirname, '..') })
if (!parsed.ok) {
  console.error(parsed.error)
  process.exit(2)
}
const listed = spawnSync('git', ['-C', parsed.root, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
if (listed.status !== 0) {
  console.error(`case-collisions: git ls-files failed: ${listed.stderr || listed.error?.message}`)
  process.exit(2)
}
const result = findCaseCollisions(listed.stdout.split('\0').filter(Boolean))
process.stdout.write(formatReport(result))
process.exit(result.ok ? 0 : 1)
