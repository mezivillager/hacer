#!/usr/bin/env node
// Claude Code Stop hook: reminds (and by default blocks once per session) to run docs-sync
// when code changed but no docs were touched. Pure logic lives in ./docsSyncStop.logic.mjs.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { evaluateStopHook } from './docsSyncStop.logic.mjs'

function readStdin() {
  try {
    return JSON.parse(readFileSync(0, 'utf-8') || '{}')
  } catch {
    return {}
  }
}

function gitChangedPaths(cwd) {
  try {
    const out = execFileSync('git', ['-C', cwd, 'status', '--porcelain'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return out
      .split('\n')
      .filter(Boolean)
      .map((line) => line.slice(3)) // strip the 2 status chars + space
      .map((p) => (p.includes(' -> ') ? p.split(' -> ')[1] : p)) // rename: take new path
      .map((p) => p.replace(/^"|"$/g, '').trim())
      .filter(Boolean)
  } catch {
    return [] // not a git repo (e.g. workspace root) or git unavailable → no nudge
  }
}

function markerFile(sessionId) {
  return join(tmpdir(), 'hacer-docs-sync', `${sessionId || 'unknown'}.reminded`)
}

const input = readStdin()
const sessionId = input.session_id ?? 'unknown'
const cwd = input.cwd ?? process.cwd()
const stopHookActive = Boolean(input.stop_hook_active)
const enforce = process.env.HACER_DOCS_SYNC_ENFORCE !== '0'

const marker = markerFile(sessionId)
const alreadyReminded = existsSync(marker)
const changedPaths = gitChangedPaths(cwd)

const { remind, block, reason } = evaluateStopHook({
  stopHookActive,
  alreadyReminded,
  changedPaths,
  enforce,
})

if (remind) {
  try {
    mkdirSync(join(tmpdir(), 'hacer-docs-sync'), { recursive: true })
    writeFileSync(marker, new Date().toISOString())
  } catch {
    // best-effort marker; never fail the hook on fs errors
  }
}

if (block) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }))
} else if (remind) {
  process.stdout.write(JSON.stringify({ systemMessage: reason }))
}
process.exit(0)
