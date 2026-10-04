#!/usr/bin/env node
// Does an issue or a brief name a package or a path this repo does not have? (#394)
//   node scripts/issue-facts.mjs <n> | --file <path>
// Exit 1 on a package finding, 2 on a usage or read error; a dead path alone exits 0, since an
// issue names the files it will create.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { checkIssueFacts, formatIssueFacts, parseManifest, pathIndex } from './issue-facts.logic.mjs'

const root = path.join(import.meta.dirname, '..')
const args = process.argv.slice(2)
const fileFlag = args.indexOf('--file')
const issue = /^#?(\d+)$/.exec(args[0] ?? '')

let label
let text
try {
  if (fileFlag >= 0 && args[fileFlag + 1]) {
    label = args[fileFlag + 1]
    text = readFileSync(label, 'utf8')
  } else if (issue) {
    label = `#${issue[1]}`
    text = execFileSync('gh', ['issue', 'view', issue[1], '--json', 'body', '--jq', '.body'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } else {
    console.error('usage: node scripts/issue-facts.mjs <issue> | --file <path>')
    process.exit(2)
  }
} catch (error) {
  console.error(`issue-facts: could not read ${label} — ${error instanceof Error ? error.message : String(error)}`)
  process.exit(2)
}

const manifest = parseManifest(
  readFileSync(path.join(root, 'package.json'), 'utf8'),
  readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8'),
)
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
const facts = checkIssueFacts(text, { manifest, exists: pathIndex(tracked.split('\n').filter(Boolean)) })

console.log(formatIssueFacts(label, facts))
process.exitCode = facts.packages.length > 0 ? 1 : 0
