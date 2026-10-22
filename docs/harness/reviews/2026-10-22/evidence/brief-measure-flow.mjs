#!/usr/bin/env node
// The GitHub numbers BRIEF.md cites, re-measurable by the reviewer rather than taken on trust.
// Usage: node brief-measure-flow.mjs [--from 2026-09-26T00:00:00Z] [--to 2026-10-22T08:35:00Z] [--repo mezivillager/hacer]
// Needs an authenticated `gh`. Read-only. "Open now" counts move; the dated windows do not.
import { execFileSync } from 'node:child_process'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}
const repo = arg('repo', 'mezivillager/hacer')
const from = arg('from', '2026-09-26T00:00:00Z')
const to = arg('to', '2026-10-22T08:35:00Z')
// Each run's window, from its session record's `run-prs` line; a `--to` past the close is cut to the close.
const RUNS = [
  ['09-27 review follow-through', '2026-09-27T08:00:00Z', '2026-09-28T06:00:00Z'],
  ['09-29 loop-60', '2026-09-29T09:00:00Z', '2026-09-29T23:59:00Z'],
  ['10-02 loop-92', '2026-10-01T21:20:00Z', '2026-10-02T03:00:00Z'],
  ['10-04 loop-20', '2026-10-04T16:50:00Z', '2026-10-04T23:59:00Z'],
  ['10-14 loop-50', '2026-10-14T22:00:00Z', '2026-10-15T12:00:00Z'],
  ['10-15 loop-reset', '2026-10-15T22:00:00Z', '2026-10-16T03:00:00Z'],
  ['10-17 loop-to-20', '2026-10-17T17:00:00Z', '2026-10-17T20:35:00Z'],
  ['10-21 loop-to-70', '2026-10-21T14:30:00Z', '2026-10-22T06:58:00Z'],
]
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 256 << 20 })
const json = (...args) => JSON.parse(gh(...args))
const count = (items, key) => {
  const m = new Map()
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + 1)
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}
const show = (pairs) => pairs.map(([k, v]) => `${k} ${v}`).join(' · ')
const pct = (xs, p) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))]
const runOf = (p) => RUNS.find(([, f, t]) => p.mergedAt >= f && p.mergedAt <= t)?.[0] ?? 'outside the runs'

// ---------------------------------------------------------------- merged PRs, with files and comments
const query = `query($q:String!,$c:String){search(query:$q,type:ISSUE,first:50,after:$c){
  pageInfo{hasNextPage endCursor}
  nodes{... on PullRequest{number title createdAt mergedAt author{login} labels(first:30){nodes{name}}
    files(first:100){nodes{path}} comments(first:100){nodes{body}}}}}}`
const merged = []
for (let cursor = null; ;) {
  const args = ['api', 'graphql', '-f', `query=${query}`, '-f', `q=repo:${repo} is:pr is:merged merged:${from}..${to}`]
  if (cursor) args.push('-f', `c=${cursor}`)
  const page = json(...args).data.search
  merged.push(...page.nodes)
  if (!page.pageInfo.hasNextPage) break
  cursor = page.pageInfo.endCursor
}
const labels = (p) => p.labels.nodes.map((l) => l.name)
const paths = (p) => p.files.nodes.map((f) => f.path)
const isBot = (p) => /dependabot/.test(p.author?.login ?? '')
const agents = merged.filter((p) => !isBot(p))
const kind = (xs) => {
  if (xs.some((x) => /^src\/(core|simulation)\//.test(x))) return 'engine (src/core, src/simulation)'
  if (xs.some((x) => x.startsWith('src/'))) return 'other src/'
  if (xs.some((x) => x.startsWith('mission-control/'))) return 'mission-control app'
  if (xs.some((x) => /^(scripts|\.github|conformance)\//.test(x))) return 'tooling (scripts/, .github/, conformance/)'
  if (xs.every((x) => x.startsWith('docs/'))) return 'docs only'
  return 'other non-src'
}
const hours = merged.map((p) => (Date.parse(p.mergedAt) - Date.parse(p.createdAt)) / 36e5)
console.log(`MERGED ${from}..${to}: ${merged.length} PRs (${agents.length} non-Dependabot, ${merged.length - agents.length} Dependabot)`)
console.log(`  by run: ${RUNS.map(([n]) => `${n} ${merged.filter((p) => runOf(p) === n).length}`).join(' · ')} · outside the runs ${merged.filter((p) => runOf(p) === 'outside the runs').length}`)
console.log(`  by project label (non-Dependabot): ${show(count(agents.flatMap((p) => labels(p).filter((l) => l.startsWith('project:'))), (l) => l))}`)
console.log(`  by files touched (non-Dependabot): ${show(count(agents, (p) => kind(paths(p))))}`)
console.log(`  project:spine: ${agents.filter((p) => labels(p).includes('project:spine')).map((p) => `#${p.number} (${p.mergedAt.slice(5, 10)})`).join(' ')}`)
console.log(`  open -> merge hours: median ${pct(hours, 0.5).toFixed(1)} · p90 ${pct(hours, 0.9).toFixed(1)}`)

// ---------------------------------------------------------------- verdicts
const heads = (p, re) => p.comments.nodes.map((c) => re.exec(c.body.trimStart())?.[1]?.toUpperCase()).filter(Boolean)
const VERIFIER = /^#+\s*Verifier verdict:\s*\**\s*(PASS|BLOCK)/i
const BARE = /^#+\s*Verdict:\s*\**\s*(PASS|BLOCK)/i
const v = agents.map((p) => ({ p, ver: heads(p, VERIFIER), bare: heads(p, BARE) }))
const blocked = v.filter((x) => x.ver.includes('BLOCK'))
console.log('VERDICTS (non-Dependabot; "## Verifier verdict:" is the #492 contract, "## Verdict:" is counted apart)')
console.log(`  contract heading ${v.filter((x) => x.ver.length).length} · only "## Verdict:" ${v.filter((x) => !x.ver.length && x.bare.length).length} (${v.filter((x) => !x.ver.length && x.bare.length).map((x) => `#${x.p.number}`).join(' ')}) · neither ${v.filter((x) => !x.ver.length && !x.bare.length).map((x) => `#${x.p.number}`).join(' ')}`)
console.log(`  PASS ${v.flatMap((x) => x.ver).filter((s) => s === 'PASS').length} · BLOCK ${v.flatMap((x) => x.ver).filter((s) => s === 'BLOCK').length} · PRs blocked at least once ${blocked.length}: ${blocked.map((x) => `#${x.p.number}`).join(' ')}`)

// ---------------------------------------------------------------- fidelity (ADR-0018 §2: a PR that changes semantics under src/core or src/simulation)
const semantic = agents.filter((p) => paths(p).some((x) => /^src\/(core|simulation)\//.test(x) && !/\.(test|spec)\.[^/]+$/.test(x)))
const FIDELITY = /^#+\s*Fidelity verdict:/i
const reviewed = (p) => p.comments.nodes.some((c) => FIDELITY.test(c.body.trimStart()))
console.log('FIDELITY (non-test files under src/core or src/simulation; reviewed = a "## Fidelity verdict:" comment on the PR)')
console.log(`  by run, reviewed/total: ${[...RUNS.map(([n]) => n), 'outside the runs'].map((n) => [n, semantic.filter((p) => runOf(p) === n)]).filter(([, xs]) => xs.length).map(([n, xs]) => `${n} ${xs.filter(reviewed).length}/${xs.length}`).join(' · ')}`)
console.log(`  without one: ${semantic.filter((p) => !reviewed(p)).map((p) => `#${p.number}`).join(' ')}`)

// ---------------------------------------------------------------- issues
const day = (s) => s.slice(0, 10)
const opened = json('issue', 'list', '-R', repo, '--state', 'all', '--search', `created:${day(from)}..${day(to)}`, '--limit', '2000', '--json', 'number')
const closed = json('issue', 'list', '-R', repo, '--state', 'closed', '--search', `closed:${day(from)}..${day(to)}`, '--limit', '2000', '--json', 'number')
const open = json('issue', 'list', '-R', repo, '--state', 'open', '--limit', '2000', '--json', 'number,labels')
const has = (i, name) => i.labels.some((l) => l.name === name)
console.log(`ISSUES ${day(from)}..${day(to)}: opened ${opened.length} · closed ${closed.length}`)
console.log(`  open now: ${open.length} · ${['agent-ready', 'needs-human', 'idea', 'in-progress', 'bot-filed', 'sev:critical'].map((l) => `${l} ${open.filter((i) => has(i, l)).length}`).join(' · ')}`)
