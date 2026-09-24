#!/usr/bin/env node
// pr-preview sweep (#484): removes pr-preview/pr-N folders on gh-pages that have positive
// evidence of closure — the safety net for what the closed-event cleanup in pr-preview.yml
// misses (its job missing, failing, or — for a Dependabot PR, whose pull_request token is
// read-only — unable to push to gh-pages at close time).
//
//   node scripts/pr-preview-sweep.mjs [--dir <gh-pages checkout>] [--dry-run] [--max-removals N]
//
// --dir (default: gh-pages) must be a real checkout of the gh-pages branch — the sweep job's
// second actions/checkout, path: gh-pages. --dry-run prints what would be removed and makes no
// change. --max-removals caps a single run (default 40; see safetyCheck). Needs GITHUB_TOKEN (or
// GH_TOKEN); GITHUB_REPOSITORY defaults to mezivillager/hacer.
//
// Round 2 (#484): a verifier reproduced real data loss where `gh pr list` exiting 0 with an
// empty/short body made every folder look closed. Removal now requires PER-FOLDER positive
// evidence: `gh pr list --state open` is only a pre-filter to skip lookups for folders it proves
// open; every other folder gets its own `gh pr view --json state`, and only CLOSED/MERGED
// removes it. A failed or empty pre-filter list falls back to looking up every folder — never to
// removing everything; see pr-preview-sweep.logic.mjs for the decision itself.

import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_MAX_REMOVALS,
  foldersNeedingLookup,
  parsePrNumber,
  planRemovals,
  safetyCheck,
} from './pr-preview-sweep.logic.mjs'

const REPO = process.env.GITHUB_REPOSITORY ?? 'mezivillager/hacer'
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const dirFlagIndex = args.indexOf('--dir')
const ghPagesDir = dirFlagIndex === -1 ? 'gh-pages' : args[dirFlagIndex + 1]
const previewDir = path.join(ghPagesDir, 'pr-preview')
const maxRemovalsFlagIndex = args.indexOf('--max-removals')
const maxRemovals = maxRemovalsFlagIndex === -1 ? DEFAULT_MAX_REMOVALS : Number(args[maxRemovalsFlagIndex + 1])

/** Directory names under pr-preview/ — [] when the folder does not exist yet (a fresh gh-pages). */
function folderNames() {
  try {
    return readdirSync(previewDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }
}

/** A cheap pre-filter only — [] on any failure, which just means every folder gets looked up. */
function openPrNumbers() {
  try {
    const out = execFileSync(
      'gh',
      ['pr', 'list', '-R', REPO, '--state', 'open', '--limit', '500', '--json', 'number'],
      { encoding: 'utf8' },
    )
    return JSON.parse(out).map((pr) => pr.number)
  } catch (error) {
    console.error(`SWEEP: gh pr list failed, falling back to per-folder lookups for everything: ${error.message}`)
    return []
  }
}

/** Positive evidence only: the PR's state, or null when the lookup failed or didn't parse. */
function prState(number) {
  try {
    const out = execFileSync('gh', ['pr', 'view', String(number), '-R', REPO, '--json', 'state'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const { state } = JSON.parse(out)
    return state === 'OPEN' || state === 'CLOSED' || state === 'MERGED' ? state : null
  } catch {
    return null
  }
}

const folders = folderNames()
const openNumbers = openPrNumbers()
if (openNumbers.length === 0) {
  console.error('SWEEP: open-PR pre-filter is empty — looking up every folder individually')
}

const needsLookup = new Set(foldersNeedingLookup(folders, openNumbers))
const folderStates = new Map()
for (const name of folders) {
  const prNumber = parsePrNumber(name)
  if (prNumber === null) continue
  folderStates.set(name, needsLookup.has(name) ? prState(prNumber) : 'OPEN')
}

const { toRemove, kept } = planRemovals(folders, folderStates)
for (const folder of kept) {
  if (folder.reason) console.log(`SWEEP: keeping ${folder.name} — ${folder.reason}`)
}

const safety = safetyCheck(folders, toRemove, maxRemovals)
if (!safety.allowed) {
  console.log(`SWEEP: refusing to run — ${safety.reason}`)
  process.exit(0)
}

if (toRemove.length === 0) {
  console.log('SWEEP: nothing to remove')
  process.exit(0)
}

if (dryRun) {
  console.log(`SWEEP (dry run): would remove ${toRemove.length} folder(s): ${toRemove.join(', ')}`)
  process.exit(0)
}

const git = (gitArgs) => execFileSync('git', gitArgs, { cwd: ghPagesDir, stdio: 'inherit' })
for (const folder of toRemove) git(['rm', '-rf', path.join('pr-preview', folder)])
git(['config', 'user.name', 'github-actions[bot]'])
git(['config', 'user.email', 'github-actions[bot]@users.noreply.github.com'])
git(['commit', '-m', `chore: sweep ${toRemove.length} stale PR deploy preview(s): ${toRemove.join(', ')}`])
git(['push'])

console.log(`SWEEP: removed ${toRemove.length} folder(s): ${toRemove.join(', ')}`)
