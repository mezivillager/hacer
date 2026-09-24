#!/usr/bin/env node
// pr-preview sweep (#484): removes pr-preview/pr-N folders on gh-pages whose PR is no longer
// open — the safety net for what the closed-event cleanup in pr-preview.yml misses (its job
// missing, failing, or — for a Dependabot PR, whose pull_request token is read-only — unable to
// push to gh-pages at close time).
//
//   node scripts/pr-preview-sweep.mjs [--dir <gh-pages checkout>] [--dry-run]
//
// --dir (default: gh-pages) must be a real checkout of the gh-pages branch — the sweep job's
// second actions/checkout, path: gh-pages. --dry-run prints what would be removed and makes no
// change. Needs GITHUB_TOKEN (or GH_TOKEN) for the one `gh pr list` call; GITHUB_REPOSITORY
// defaults to mezivillager/hacer. The removal decision lives in pr-preview-sweep.logic.mjs.

import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { foldersToRemove } from './pr-preview-sweep.logic.mjs'

const REPO = process.env.GITHUB_REPOSITORY ?? 'mezivillager/hacer'
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const dirFlagIndex = args.indexOf('--dir')
const ghPagesDir = dirFlagIndex === -1 ? 'gh-pages' : args[dirFlagIndex + 1]
const previewDir = path.join(ghPagesDir, 'pr-preview')

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

/** Every open PR's number — one API call, generous limit so a busy repo can't under-fetch it. */
function openPrNumbers() {
  const out = execFileSync(
    'gh',
    ['pr', 'list', '-R', REPO, '--state', 'open', '--limit', '500', '--json', 'number'],
    { encoding: 'utf8' },
  )
  return JSON.parse(out).map((pr) => pr.number)
}

const toRemove = foldersToRemove(folderNames(), openPrNumbers())

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
git(['commit', '-m', `chore: sweep ${toRemove.length} stale PR deploy preview(s)`])
git(['push'])

console.log(`SWEEP: removed ${toRemove.length} folder(s): ${toRemove.join(', ')}`)
