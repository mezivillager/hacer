#!/usr/bin/env node
// run-prs: the PRs merged in a time window, so a session record's merge count is derived, not
// hand-counted (#538 — the first process-review brief gave the 2026-09-23 run 13 merges; GitHub
// shows 17).
//
//   node scripts/run-prs.mjs --from <iso> --to <iso> [--json]
//
// `gh pr list --search "merged:<from-day>..<to-day>"` is day granularity (GitHub's own limit, so a
// window inside one day still pulls every PR merged that day); this filters precisely on
// `mergedAt` in run-prs.logic.mjs. Only `gh` does I/O.

import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { formatConsole, mergedInWindow, searchDateRange } from './run-prs.logic.mjs'

const REPO = process.env.GITHUB_REPOSITORY ?? 'mezivillager/hacer'

/** `gh` from PATH, else the release binary in ~/.local/bin (where brew's gh is too old to bottle); throws gh's message. */
function gh(...args) {
  for (const bin of ['gh', path.join(homedir(), '.local', 'bin', 'gh')]) {
    try {
      return execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw Object.assign(new Error(String(error.stderr).trim() || error.message), { stdout: error.stdout })
      }
    }
  }
  throw new Error('gh CLI not found on PATH or in ~/.local/bin')
}

const { values } = parseArgs({
  options: {
    from: { type: 'string' },
    to: { type: 'string' },
    json: { type: 'boolean', default: false },
  },
})

if (!values.from || !values.to || Number.isNaN(Date.parse(values.from)) || Number.isNaN(Date.parse(values.to))) {
  console.error('usage: node scripts/run-prs.mjs --from <iso> --to <iso> [--json]')
  process.exit(2)
}

const candidates = JSON.parse(
  gh(
    'pr',
    'list',
    '-R',
    REPO,
    '--state',
    'merged',
    '--search',
    `merged:${searchDateRange(values.from, values.to)}`,
    '--json',
    'number,title,mergedAt,labels',
    '--limit',
    '200',
  ),
)

const prs = mergedInWindow(candidates, values.from, values.to)
console.log(values.json ? JSON.stringify(prs, null, 2) : formatConsole(prs))
