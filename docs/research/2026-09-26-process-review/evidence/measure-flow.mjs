#!/usr/bin/env node
// The flow numbers BRIEF.md §4 cites, re-measurable by the reviewer rather than taken on trust.
// Usage: node measure-flow.mjs [--from 2026-09-18] [--to 2026-09-25] [--repo mezivillager/hacer]
// Needs an authenticated `gh`. Read-only. Every number comes from GitHub at run time; "open now"
// counts move, the dated ranges do not.
import { execFileSync } from 'node:child_process'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}
const repo = arg('repo', 'mezivillager/hacer')
const from = arg('from', '2026-09-18')
const to = arg('to', '2026-09-25')
const range = `${from}..${to}`
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 256 << 20 })
const json = (...args) => JSON.parse(gh(...args))

const count = (items, key) => {
  const m = new Map()
  for (const it of items) {
    const k = key(it)
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}
const show = (pairs) => pairs.map(([k, v]) => `${k} ${v}`).join(' · ')
const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(s.length * p))]
}

// ---------------------------------------------------------------- merged PRs
const merged = json('pr', 'list', '-R', repo, '--state', 'merged', '--search', `merged:${range}`,
  '--limit', '1000', '--json', 'number,title,author,labels,additions,deletions,createdAt,mergedAt,files')
const isBot = (p) => /dependabot/.test(p.author.login)
const agents = merged.filter((p) => !isBot(p))

const kind = (paths) => {
  if (paths.some((x) => /^src\/(core|simulation)\//.test(x))) return 'engine (src/core, src/simulation)'
  if (paths.some((x) => x.startsWith('src/'))) return 'other src/'
  if (paths.some((x) => x.startsWith('mission-control/'))) return 'mission-control app'
  if (paths.some((x) => /^(scripts|\.github)\//.test(x))) return 'process tooling (scripts/, .github/)'
  if (paths.every((x) => x.startsWith('docs/'))) return 'docs only'
  return 'other non-src (config, .claude/, root docs)'
}
const conv = (title) => /^(\w+)(?:\(([^)]+)\))?!?:/.exec(title)
const hours = merged.map((p) => (Date.parse(p.mergedAt) - Date.parse(p.createdAt)) / 36e5)
const sizes = agents.map((p) => p.additions + p.deletions)

console.log(`MERGED ${range}: ${merged.length} PRs (${agents.length} non-Dependabot, ${merged.length - agents.length} Dependabot)`)
console.log(`  by day: ${count(merged, (p) => p.mergedAt.slice(0, 10)).sort().map(([d, n]) => `${d.slice(5)} ${n}`).join(' · ')}`)
console.log(`  by files touched (non-Dependabot): ${show(count(agents, (p) => kind(p.files.map((f) => f.path))))}`)
console.log(`  by project label (non-Dependabot): ${show(count(agents.flatMap((p) => p.labels.filter((l) => l.name.startsWith('project:'))), (l) => l.name))}`)
console.log(`  by title type: ${show(count(merged, (p) => conv(p.title)?.[1] ?? 'none'))}`)
console.log(`  top title scopes: ${show(count(merged, (p) => conv(p.title)?.[2] ?? '-').slice(0, 8))}`)
console.log(`  open -> merge hours: median ${pct(hours, 0.5).toFixed(1)} · p90 ${pct(hours, 0.9).toFixed(1)}`)
console.log(`  changed lines (adds+dels, non-Dependabot): median ${pct(sizes, 0.5)} · p90 ${pct(sizes, 0.9)}`)

// ---------------------------------------------------------------- verdicts
const query = `query($q:String!,$c:String){search(query:$q,type:ISSUE,first:100,after:$c){
  pageInfo{hasNextPage endCursor}
  nodes{... on PullRequest{number title comments(first:100){nodes{body}}}}}}`
const prs = []
for (let cursor = null; ;) {
  const args = ['api', 'graphql', '-f', `query=${query}`, '-f', `q=repo:${repo} is:pr merged:${range}`]
  if (cursor) args.push('-f', `c=${cursor}`)
  const page = json(...args).data.search
  prs.push(...page.nodes)
  if (!page.pageInfo.hasNextPage) break
  cursor = page.pageInfo.endCursor
}
const VERDICT = /^#+\s*Verifier verdict:\s*\**\s*(PASS|BLOCK)/i
const verdicts = prs.map((p) => ({
  number: p.number,
  title: p.title,
  v: p.comments.nodes.map((c) => VERDICT.exec(c.body.trimStart())?.[1]?.toUpperCase()).filter(Boolean),
}))
const all = verdicts.flatMap((p) => p.v)
const blocked = verdicts.filter((p) => p.v.includes('BLOCK'))
console.log(`VERDICTS (comments headed "## Verifier verdict:", the #492 contract; older formats are missed)`)
console.log(`  PRs with a verdict ${verdicts.filter((p) => p.v.length).length} · without ${verdicts.filter((p) => !p.v.length).length}`)
console.log(`  PASS ${all.filter((v) => v === 'PASS').length} · BLOCK ${all.filter((v) => v === 'BLOCK').length} · PRs blocked at least once ${blocked.length}`)
console.log(`  blocked: ${blocked.map((p) => `#${p.number}`).join(' ')}`)

// ---------------------------------------------------------------- issues
const opened = json('issue', 'list', '-R', repo, '--state', 'all', '--search', `created:${range}`, '--limit', '2000', '--json', 'number')
const closed = json('issue', 'list', '-R', repo, '--state', 'closed', '--search', `closed:${range}`, '--limit', '2000', '--json', 'number')
const open = json('issue', 'list', '-R', repo, '--state', 'open', '--limit', '2000', '--json', 'number,labels')
const has = (i, name) => i.labels.some((l) => l.name === name)
console.log(`ISSUES ${range}: opened ${opened.length} · closed ${closed.length}`)
console.log(`  open now: ${open.length} · agent-ready ${open.filter((i) => has(i, 'agent-ready')).length} · needs-human ${open.filter((i) => has(i, 'needs-human')).length} · idea ${open.filter((i) => has(i, 'idea')).length} · in-progress ${open.filter((i) => has(i, 'in-progress')).length}`)
