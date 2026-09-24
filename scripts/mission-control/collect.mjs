#!/usr/bin/env node
// Mission Control's collector (#472): GitHub, git and the repo's own files → one snapshot, schema v1. This file only
// reads; every transform is in collect.logic.mjs. Flags, auth, calls and exit code: docs/harness/mission-control.md.
//   node scripts/mission-control/collect.mjs --json [--previous <snapshot.json>]

import { execFile } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { parseArgs, promisify } from 'node:util'
import { KNOWN_VIOLATIONS_FILE as BASELINE } from '../layer-ratchet.logic.mjs'
import { buildSnapshot, claimsQuery, report } from './collect.logic.mjs'

const REPO = process.env.GITHUB_REPOSITORY ?? 'mezivillager/hacer'
const ROOT = path.join(import.meta.dirname, '..', '..')
const ISSUE_FIELDS = 'number,title,labels,author,blockedBy,blocking,parent,subIssuesSummary,url'
const PR_FIELDS = 'number,title,url,author,labels,headRefName,createdAt,mergedAt,isDraft,closingIssuesReferences,comments'
const exec = promisify(execFile)
const OPTIONS = { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 }
const { values: flags } = parseArgs({ options: { json: { type: 'boolean' }, previous: { type: 'string' } } })

/** `gh … --json` from PATH, else the release binary in ~/.local/bin (as backlog.mjs); an error carries gh's message. */
async function gh(...args) {
  for (const bin of ['gh', path.join(homedir(), '.local', 'bin', 'gh')]) {
    try {
      return JSON.parse((await exec(bin, args, OPTIONS)).stdout)
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error(error.stderr?.trim().replace(/\s*\n\s*/g, ' ') || error.message)
    }
  }
  throw new Error('gh CLI not found on PATH or in ~/.local/bin')
}
const git = async (...args) => (await exec('git', args, OPTIONS)).stdout
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8')
const readDir = (dir) => readdirSync(path.join(ROOT, dir)).filter((file) => file.endsWith('.md')).sort()
  .map((file) => ({ file: `${dir}/${file}`, text: read(`${dir}/${file}`) }))

async function ratchetHistory() {
  if ((await git('rev-parse', '--is-shallow-repository')).trim() === 'true') throw new Error('shallow clone: needs fetch-depth 0')
  const log = await git('log', '--format=%H%x09%cI%x09%s', '--', BASELINE)
  const shas = log.split('\n').filter(Boolean).map((line) => line.slice(0, 40))
  const rows = await Promise.all(shas.map(async (sha) => [sha, JSON.parse(await git('show', `${sha}:${BASELINE}`))]))
  return { log, rows: Object.fromEntries(rows) }
}

const list = (kind, ...args) => gh(kind, 'list', '-R', REPO, ...args)
const file = (name) => [name, () => read(name)]
const SOURCES = {
  issues: ['gh issue list --state open', () => list('issue', '--state', 'open', '--limit', '500', '--json', ISSUE_FIELDS)],
  prsOpen: ['gh pr list --state open', () => list('pr', '--state', 'open', '--limit', '100', '--json', PR_FIELDS)],
  prsMerged: ['gh pr list --state merged --limit 60', () => list('pr', '--state', 'merged', '--limit', '60', '--json', PR_FIELDS)],
  releases: ['gh release list', () => list('release', '--limit', '1000', '--json', 'tagName,publishedAt,isLatest')],
  claimRefs: ['git ls-remote origin refs/heads/claim/*', () => git('ls-remote', 'origin', 'refs/heads/claim/*')],
  ratchetLog: [`git log -- ${BASELINE}`, ratchetHistory],
  baseline: [BASELINE, () => JSON.parse(read(BASELINE))],
  portfolio: file('docs/portfolio.md'),
  ledger: file('docs/harness/ledger.md'),
  inbox: file('docs/harness/sessions/cloud-queue-inbox.md'),
  roadmap: file('docs/roadmap/README.md'),
  sessions: ['docs/harness/sessions', () => readDir('docs/harness/sessions')],
  adrs: ['docs/decisions', () => readDir('docs/decisions')],
}

/** Every source settles to {source, value} or {source, error}, all at once: one failure stops nothing else. */
const settle = (source, load) => Promise.resolve().then(load)
  .then((value) => ({ source, value }), (error) => ({ source, error: error.message }))
const settled = await Promise.all(Object.entries(SOURCES).map(async ([id, [source, load]]) => [id, await settle(source, load)]))
const inputs = Object.fromEntries(settled)
const query = claimsQuery(REPO, inputs.claimRefs.value ?? '')
inputs.claimIssues = await settle('gh api graphql', () => (query ? gh('api', 'graphql', '-f', `query=${query}`) : null))

const [sha, date, subject] = (await git('log', '-1', '--format=%H%x09%cI%x09%s')).trim().split('\t')
const previous = flags.previous && existsSync(flags.previous) ? JSON.parse(readFileSync(flags.previous, 'utf8')) : null
const logins = (process.env.BACKLOG_ALLOWLIST ?? '').split(',').map((login) => login.trim()).filter(Boolean)
const snapshot = buildSnapshot(inputs, {
  now: new Date().toISOString(), head: { sha, date, subject }, previous, allowlist: logins.length > 0 ? logins : undefined,
})
const { exitCode, stdout, stderr } = report(snapshot, { json: flags.json })
if (stderr) console.error(stderr)
if (stdout) console.log(stdout)
process.exitCode = exitCode
