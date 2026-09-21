#!/usr/bin/env node
// lane-budget: what the Cursor lane has spent today, and whether one more run fits (#302).
//
//   node scripts/lane-budget.mjs        [HACER_LANE_DAY_TOKENS=<tokens> overrides the day's ration]
//
// Reads the rows second-opinion.mjs appends to <git-common-dir>/hacer-lane-runs/second-opinion.jsonl
// and the last Cursor dashboard reading in docs/harness/cursor-usage.json — taken by hand or with a
// browser, because no supported API exposes those numbers. Prints one greppable `LANE-BUDGET:` line
// plus the detail, and exits 7 (EXIT.rationSpent) when one more run does not fit — a skip, not a
// failure: the coordinator proceeds without the lane. Policy: docs/harness/usage-rationing.md.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { formatReport, laneStatus, OBSERVATION_FILE } from './lane-budget.logic.mjs'
import { AUDIT_FILE, EXIT } from './second-opinion.logic.mjs'

const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : null)

// Worktrees share the common dir, so every worktree's runs count against the same day.
let commonDir = null
try {
  commonDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim()
} catch (error) {
  console.error(`lane-budget: not a git repository — ${error?.message ?? error}`)
  process.exit(EXIT.usage)
}

const status = laneStatus({
  audit: read(path.join(commonDir, AUDIT_FILE)),
  observation: read(path.join(import.meta.dirname, '..', OBSERVATION_FILE)),
  dayBudget: process.env.HACER_LANE_DAY_TOKENS,
})

console.log(formatReport(status))
process.exit(status.allowed ? EXIT.ok : EXIT.rationSpent)
