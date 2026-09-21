#!/usr/bin/env node
// Thin CLI for scripts/wt-new (bash) — the decidable steps around the real work the shell script
// does (fetch, `git worktree add`, `pnpm install --frozen-lockfile`, running the caller's verify
// command). Rules live in wt-new.logic.mjs, unit-tested in wt-new.logic.test.mjs.
//
//   node scripts/wt-new.mjs parse <type>/<topic>               prints "<branch> <dirName>"; exit 1 on a bad spec
//   node scripts/wt-new.mjs judge <worktree-path> <verify-exit> prints the verdict; exit 1 unless everything passed
//   node scripts/wt-new.mjs fetch-verdict <exit-code>           prints nothing on 0; the accurate reason otherwise
//   node scripts/wt-new.mjs freshness <behind> <ahead>          prints the --refresh report line

import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { formatFreshness, hasBabelHelperSymlinks, isTreeClean, judge, judgeFetch, parseSpec } from './wt-new.logic.mjs'

const [command, ...args] = process.argv.slice(2)

if (command === 'parse' && args.length === 1) {
  const result = parseSpec(args[0])
  if (!result.ok) {
    console.error(`wt-new: ${result.error}`)
    process.exit(1)
  }
  console.log(`${result.branch} ${result.dirName}`)
  process.exit(0)
}

if (command === 'fetch-verdict' && args.length === 1) {
  const verdict = judgeFetch(Number(args[0]))
  if (!verdict.ok) console.error(`wt-new: ${verdict.reason}`)
  process.exit(verdict.ok ? 0 : 1)
}

if (command === 'freshness' && args.length === 2) {
  console.log(formatFreshness(Number(args[0]), Number(args[1])))
  process.exit(0)
}

/** The install dir pnpm names for @babel/helper-compilation-targets, with its resolved version. */
function babelHelperEntries(pnpmDir) {
  const dirName = readdirSync(pnpmDir).find((name) => name.startsWith('@babel+helper-compilation-targets@'))
  return dirName ? readdirSync(path.join(pnpmDir, dirName, 'node_modules')) : []
}

if (command === 'judge' && args.length === 2) {
  const [worktreePath, verifyExitArg] = args
  let babelHelpersOk = false
  try {
    babelHelpersOk = hasBabelHelperSymlinks(babelHelperEntries(path.join(worktreePath, 'node_modules', '.pnpm')))
  } catch {
    babelHelpersOk = false // node_modules/.pnpm missing entirely — install did not finish
  }
  const statusOutput = execFileSync('git', ['-C', worktreePath, 'status', '--porcelain'], { encoding: 'utf8' })
  const verdict = judge({ babelHelpersOk, verifyExitCode: Number(verifyExitArg), treeClean: isTreeClean(statusOutput) })
  console.log(verdict.ok ? 'WT-NEW: ready' : `WT-NEW: not ready — ${verdict.reason}`)
  process.exit(verdict.ok ? 0 : 1)
}

console.error(
  'usage: node scripts/wt-new.mjs parse <type>/<topic> | judge <worktree-path> <verify-exit-code> ' +
  '| fetch-verdict <exit-code> | freshness <behind> <ahead>',
)
process.exit(2)
