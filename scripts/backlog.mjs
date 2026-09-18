#!/usr/bin/env node
// The backlog over GitHub Issues — answers "what can you pick up?" from the shell.
//
//   node scripts/backlog.mjs ready    [--json]   pickable tasks in pick order, then the rest with a reason
//   node scripts/backlog.mjs projects [--json]   one line per docs/portfolio.md row: counts + next pick
//
// One `gh issue list` call is the only I/O; the pick rule (docs/portfolio.md) lives in backlog.logic.mjs.
// BACKLOG_ALLOWLIST=login,login overrides the author allowlist. `tasks`, `next`, `claim` follow (#149).

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import * as backlog from './backlog.logic.mjs'

const REPO = 'mezivillager/hacer'
const ISSUE_FIELDS = 'number,title,labels,author,blockedBy,blocking,parent'
const PORTFOLIO_PATH = path.join(import.meta.dirname, '..', 'docs', 'portfolio.md')

const COMMANDS = new Map([
  ['ready', { plan: backlog.planReady, format: backlog.formatReady }],
  ['projects', { plan: backlog.summarizeProjects, format: backlog.formatProjects }],
])

/** `gh` from PATH, else the release binary in ~/.local/bin (where brew's gh is too old to bottle). */
function fetchOpenIssues() {
  const args = ['issue', 'list', '-R', REPO, '--state', 'open', '--limit', '500', '--json', ISSUE_FIELDS]
  for (const gh of ['gh', path.join(homedir(), '.local', 'bin', 'gh')]) {
    try {
      return JSON.parse(execFileSync(gh, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }))
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  throw new Error('gh CLI not found on PATH or in ~/.local/bin')
}

function allowlistFromEnv() {
  const logins = (process.env.BACKLOG_ALLOWLIST ?? '').split(',').map((login) => login.trim()).filter(Boolean)
  return logins.length > 0 ? logins : backlog.DEFAULT_ALLOWLIST
}

const [commandName, ...flags] = process.argv.slice(2)
const command = COMMANDS.get(commandName)
if (!command) {
  console.error(`usage: node scripts/backlog.mjs <${[...COMMANDS.keys()].join('|')}> [--json]`)
  process.exit(2)
}

const portfolioRows = backlog.parsePortfolio(readFileSync(PORTFOLIO_PATH, 'utf8'))
const result = command.plan(fetchOpenIssues(), portfolioRows, allowlistFromEnv())
console.log(flags.includes('--json') ? JSON.stringify(result, null, 2) : command.format(result))
