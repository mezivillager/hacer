#!/usr/bin/env node
// The proposal inboxes (fidelity, harness, product) from the shell, and the queue of inbox-panel reviews (#778).
//
//   node scripts/inbox.mjs list [--status <s>] [--json]   every entry: id, status, file:line, title
//   node scripts/inbox.mjs status <id> [--not <s>]        the entry's status; with --not, exit 1 while it is still <s>
//   node scripts/inbox.mjs set <id> <status>              rewrite that entry's Status line, within its file's grammar
//   node scripts/inbox.mjs queue [--dry-run]              file one review issue per proposed entry that has none yet
//
// A review's method: docs/harness/inbox-panel-brief.md. A flag the command does not take is a usage error: exit 2.

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import * as inbox from './inbox.logic.mjs'

const REPO = 'mezivillager/hacer'
const ROOT = path.join(import.meta.dirname, '..')

const COMMANDS = {
  list: { options: { status: { type: 'string' }, json: { type: 'boolean' } }, operands: 0 },
  status: { options: { not: { type: 'string' } }, operands: 1 },
  set: { options: {}, operands: 2 },
  queue: { options: { 'dry-run': { type: 'boolean' } }, operands: 0 },
}
const USAGE = `usage: node scripts/inbox.mjs list [--status <s>] [--json]
       node scripts/inbox.mjs status <id> [--not <s>]
       node scripts/inbox.mjs set <id> <status>
       node scripts/inbox.mjs queue [--dry-run]`

class UsageError extends Error {}

function parseCommandLine([name, ...args]) {
  const command = Object.hasOwn(COMMANDS, name ?? '') ? COMMANDS[name] : null
  if (!command) throw new UsageError(name ? `unknown command '${name}'` : 'no command')
  let parsed
  try {
    parsed = parseArgs({ args, options: command.options, allowPositionals: true })
  } catch (error) {
    throw new UsageError(error.message)
  }
  if (parsed.positionals.length !== command.operands) {
    throw new UsageError(`${name} takes ${command.operands || 'no'} operand${command.operands === 1 ? '' : 's'}`)
  }
  return { name, operands: parsed.positionals, flags: parsed.values }
}

/** `gh` from PATH, else the release binary in ~/.local/bin; throws gh's message. */
function gh(...args) {
  for (const bin of ['gh', path.join(homedir(), '.local', 'bin', 'gh')]) {
    try {
      return execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error(String(error.stderr ?? '').trim() || error.message)
    }
  }
  throw new Error('gh CLI not found on PATH or in ~/.local/bin')
}

const readInbox = (box) => readFileSync(path.join(ROOT, box.file), 'utf8')
const readInboxes = () => inbox.INBOXES.map((box) => inbox.parseInbox(readInbox(box), box))

const run = {
  list([], flags) {
    const entries = inbox.listEntries(readInboxes(), { status: flags.status })
    const out = flags.json ? JSON.stringify(entries.map(({ id, title, status, file, line }) => ({ id, title, status, file, line })), null, 2)
      : inbox.formatEntries(entries)
    if (out) console.log(out)
  },
  status([id], flags) {
    const { exitCode, stdout } = inbox.entryStatus(readInboxes(), id, { not: flags.not })
    console.log(stdout)
    process.exitCode = exitCode
  },
  set([id, value]) {
    const box = inbox.INBOXES.find((candidate) => id.startsWith(`${candidate.prefix}-`))
    if (!box) throw new inbox.InboxError(`no inbox has an entry ${id}`)
    const before = readInbox(box)
    const after = inbox.setStatus(before, box, id, value)
    writeFileSync(path.join(ROOT, box.file), after)
    console.log(`${id}: ${inbox.entryStatus([inbox.parseInbox(before, box)], id).stdout} → ${value} (${box.file})`)
  },
  queue([], flags) {
    const lines = inbox.queueReviews(readInboxes(), {
      dryRun: flags['dry-run'],
      listReviewIssues: () => JSON.parse(gh('issue', 'list', '-R', REPO, '--label', 'inbox-review', '--state', 'all',
        '--limit', String(inbox.REVIEW_LIST_LIMIT), '--json', 'number,title,state,body')),
      fileIssue: (draft) => gh('issue', 'create', '-R', REPO, '--title', draft.title, '--body', draft.body,
        ...draft.labels.flatMap((label) => ['--label', label])).trim(),
    })
    for (const line of lines) console.log(line)
    console.error(`inbox: ${lines.length} review issue${lines.length === 1 ? '' : 's'} ${flags['dry-run'] ? 'to file (dry run)' : 'filed'}`)
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
