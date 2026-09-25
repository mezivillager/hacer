#!/usr/bin/env node
// Mission Control's archive prune (#476, MC-5): keeps the last KEEP_DAYS days of control/history/ snapshots on
// gh-pages. Pure decision in prune.logic.mjs (never removes the newest file, never touches a name that is not
// exactly one snapshot's own); this file only lists the directory and removes what the decision names.
//
//   node scripts/mission-control/prune.mjs [--dir <gh-pages checkout>] [--dry-run]
//
// --dir (default: gh-pages) is a checkout of the gh-pages branch; history/ is <dir>/control/history. --dry-run
// prints what would be removed and changes nothing. No GitHub calls, no network: this only reads and writes the
// local checkout the workflow already has.

import { readdirSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { planPrune } from './prune.logic.mjs'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const dirFlagIndex = args.indexOf('--dir')
const ghPagesDir = dirFlagIndex === -1 ? 'gh-pages' : args[dirFlagIndex + 1]
const historyDir = path.join(ghPagesDir, 'control', 'history')

/** File names directly under history/ — [] when the folder does not exist yet (the archive's first run). */
function fileNames() {
  try {
    return readdirSync(historyDir, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name)
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

const { toRemove, kept } = planPrune(fileNames())
for (const name of toRemove) {
  console.log(`PRUNE: ${dryRun ? 'would remove' : 'removing'} ${name}`)
  if (!dryRun) unlinkSync(path.join(historyDir, name))
}
console.log(`PRUNE: removed ${toRemove.length} · kept ${kept.length}`)
