#!/usr/bin/env node
// The proposal inboxes from the shell, and the queue of inbox-panel reviews: docs/harness/inbox-panel-brief.md.
// Rules live in inbox.logic.mjs. A flag the command does not take is a usage error: exit 2.

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import * as inbox from './inbox.logic.mjs'

const REPO = 'mezivillager/hacer'
const ROOT = path.join(import.meta.dirname, '..')
const USAGE = `usage: node scripts/inbox.mjs list [--status <s>] [--json]   every entry: id, status, file:line, title
       node scripts/inbox.mjs status <id> [--not <s>]        exit 1 while the entry's status is still <s>
       node scripts/inbox.mjs set <id> <status>              rewrite the entry's Status line, within its file's grammar
       node scripts/inbox.mjs queue [--dry-run]              a review issue per proposed entry that has none yet`
const COMMANDS = {
  list: [{ status: { type: 'string' }, json: { type: 'boolean' } }, 0],
  status: [{ not: { type: 'string' } }, 1],
  set: [{}, 2],
  queue: [{ 'dry-run': { type: 'boolean' } }, 0],
}

class UsageError extends Error {}

function parseCommandLine([name, ...args]) {
  if (!Object.hasOwn(COMMANDS, name ?? '')) throw new UsageError(name ? `unknown command '${name}'` : 'no command')
  const [options, operands] = COMMANDS[name]
  try {
    const { values, positionals } = parseArgs({ args, options, allowPositionals: true })
    if (positionals.length === operands) return { name, operands: positionals, flags: values }
  } catch (error) {
    throw new UsageError(error.message)
  }
  throw new UsageError(`${name} takes ${operands || 'no'} operand${operands === 1 ? '' : 's'}`)
}

function gh(...args) {
  try {
    return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
  } catch (error) {
    throw new Error(String(error.stderr ?? '').trim() || error.message)
  }
}

const readInbox = (box) => readFileSync(path.join(ROOT, box.file), 'utf8')
const readInboxes = () => inbox.INBOXES.map((box) => inbox.parseInbox(readInbox(box), box))

const run = {
  list([], flags) {
    const entries = inbox.listEntries(readInboxes(), { status: flags.status })
    const rows = entries.map(({ id, title, status, file, line }) => ({ id, title, status, file, line }))
    if (entries.length > 0 || flags.json) console.log(flags.json ? JSON.stringify(rows, null, 2) : inbox.formatEntries(entries))
  },
  status([id], flags) {
    const { exitCode, stdout } = inbox.entryStatus(readInboxes(), id, { not: flags.not })
    console.log(stdout)
    process.exitCode = exitCode
  },
  set([id, value]) {
    const box = inbox.INBOXES.find((candidate) => id.startsWith(`${candidate.prefix}-`))
    if (!box) throw new inbox.InboxError(`no inbox has an entry ${id}`)
    writeFileSync(path.join(ROOT, box.file), inbox.setStatus(readInbox(box), box, id, value))
    console.log(`${id}: ${value} (${box.file})`)
  },
  queue([], flags) {
    const lines = inbox.queueReviews(readInboxes(), {
      dryRun: flags['dry-run'],
      listReviewIssues: () => JSON.parse(gh('issue', 'list', '-R', REPO, '--label', 'inbox-review', '--state', 'all',
        '--limit', String(inbox.REVIEW_LIST_LIMIT), '--json', 'number,title,state,body')),
      fileIssue: ({ title, body, labels }) =>
        gh('issue', 'create', '-R', REPO, '--title', title, '--body', body, ...labels.flatMap((label) => ['--label', label])).trim(),
    })
    for (const line of lines) console.log(line)
    console.error(`inbox: ${lines.length} review issue(s) ${flags['dry-run'] ? 'to file (dry run)' : 'filed'}`)
  },
}

try {
  const { name, operands, flags } = parseCommandLine(process.argv.slice(2))
  run[name](operands, flags)
} catch (error) {
  console.error(`inbox: ${error.message}`)
  if (error instanceof UsageError) console.error(USAGE)
  process.exitCode = error instanceof UsageError ? 2 : 1
}
