#!/usr/bin/env node
// Decision Lineage (epic #457): every decision in the repo — ADRs, rulings, premises — and the
// typed relations between them, read from the field lines docs/decisions/README.md "Lineage" defines.
//
//   node scripts/lineage.mjs parse --json [--root <dir>]   the graph as JSON: nodes, edges, artefacts, errors
//   node scripts/lineage.mjs next-id [--root <dir>]        the id a new ruling takes
//   node scripts/lineage.mjs trace <id> | radius <id>      what <id> rests on | what rests on it, as a tree
//   node scripts/lineage.mjs check [--fix] [--summary]     is the graph sound? --fix writes the missing reverse links
//   node scripts/lineage.mjs graph [<id>] --mermaid|--json draw all of it, or one decision's lineage
//   node scripts/lineage.mjs verify [--strict] [--for #<issue>] [--file]   do the premises still hold?
//
// Reads docs/decisions/** and docs/harness/ledger.md; all parsing is in lineage.logic.mjs. `parse`
// exits 1 when the graph has errors, listing each on stderr; `check` (src/ too) exits 0 — warn mode
// until #471. --github also reads every PR and issue body through `gh`, for Decisions: / Introduced by:.

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import * as lineage from './lineage.logic.mjs'

const [command, ...flags] = process.argv.slice(2)
const rootFlag = flags.indexOf('--root')
const root = rootFlag >= 0 ? path.resolve(flags[rootFlag + 1] ?? '.') : path.join(import.meta.dirname, '..')
const has = (flag) => flags.includes(flag)
const id = flags.find((flag, k) => !flag.startsWith('--') && flags[k - 1] !== '--root' && flags[k - 1] !== '--for')

/** Every file a parser reads, repo-relative and sorted, with its text. */
function readSources() {
  const decisions = path.join(root, 'docs', 'decisions')
  const listed = existsSync(decisions) ? readdirSync(decisions, { recursive: true, encoding: 'utf8' }) : []
  return [...listed.map((entry) => `docs/decisions/${entry.split(path.sep).join('/')}`), 'docs/harness/ledger.md']
    .filter((file) => lineage.sourceKind(file) && existsSync(path.join(root, file)))
    .sort()
    .map((file) => ({ path: file, text: readFileSync(path.join(root, file), 'utf8') }))
}

/** Every file under src/, for the check that no code cites a superseded ADR. */
function readCode() {
  const src = path.join(root, 'src')
  return (existsSync(src) ? readdirSync(src, { recursive: true, withFileTypes: true }) : []).filter((entry) => entry.isFile())
    .map((entry) => path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .map((file) => ({ path: file, text: readFileSync(path.join(root, file), 'utf8') }))
}

/** Run one premise command. A timeout or a spawn error is unverifiable, never a match against Expect. */
function runShell(command, cwd) {
  const result = spawnSync('bash', ['-c', command], { cwd, encoding: 'utf8', timeout: 180_000, maxBuffer: 1 << 24 })
  const timedOut = result.error?.code === 'ETIMEDOUT'
  return {
    stdout: result.stdout ?? '', stderr: result.stderr ?? '', code: result.status ?? (timedOut ? null : 1), timedOut,
    error: result.error && !timedOut ? result.error.message : null,
  }
}

/** A token in the environment, or `gh`'s own stored credential. The token itself is never printed. */
function tokenAvailable() {
  if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) return true
  const probe = spawnSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return probe.status === 0 && (probe.stdout ?? '').trim().length > 0
}

/** Open or update one issue per expired premise. The title is the key, so a second run edits. */
function fileExpiries(rows) {
  const issues = rows.filter((row) => row.status === 'expired').map((row) => lineage.expiryIssue(row, row.downstream ?? []))
  if (issues.length === 0) return
  const existing = JSON.parse(execFileSync('gh', ['issue', 'list', '--state', 'open', '--limit', '1000', '--json', 'number,title'],
    { cwd: root, encoding: 'utf8' })).map((issue) => ({ ...issue, state: 'open' }))
  for (const plan of lineage.planExpiryUpserts(existing, issues)) {
    const args = plan.action === 'create'
      ? ['issue', 'create', '--title', plan.title, '--body', plan.body, '--label', 'project:lineage']
      : ['issue', 'edit', String(plan.number), '--body', plan.body, '--add-label', 'project:lineage']
    execFileSync('gh', args, { cwd: root, stdio: 'inherit' })
  }
}

/** Every PR and issue with its body. A failing `gh` throws and stops the command, never reads as "no links". */
function readGithub() {
  const list = (kind) => JSON.parse(execFileSync('gh', [kind, 'list', '--state', 'all', '--limit', '10000', '--json', 'number,title,body,url'],
    { cwd: root, encoding: 'utf8', maxBuffer: 1 << 30 }))
  return [...list('pr'), ...list('issue')]
}

const github = has('--github') ? readGithub() : []
const graph = lineage.parseLineage(readSources(), github)
if (id !== undefined && !graph.nodes.some((node) => node.id === id)) {
  console.error(`${command}: no decision has the id ${id}`)
  process.exit(2)
}
if (command === 'parse') {
  console.log(JSON.stringify(graph, null, 2))
  for (const error of graph.errors) console.error(`${error.kind} ${error.where.join(', ')}: ${error.message}`)
  // Not process.exit(): on a pipe stdout flushes asynchronously and exit() truncates at ~64 KiB —
  // measured on #490 (165 KB graph, 65,406 chars captured). exitCode lets the write finish.
  process.exitCode = graph.errors.length > 0 ? 1 : 0
} else if (command === 'next-id') {
  // Until #466 imports them, the highest ruling ids live in the coordinator's run directories.
  if (!graph.nodes.some((node) => node.kind === 'ruling')) {
    console.error('next-id: docs/decisions/rulings/ holds no ruling yet (#466 imports them) — R1 would collide')
    process.exit(1)
  }
  console.log(lineage.nextRulingId(graph.nodes))
} else if ((command === 'trace' || command === 'radius') && id) {
  console.log(lineage.formatTree(lineage[command](graph, id)))
} else if (command === 'check') {
  const readme = path.join(root, 'docs', 'decisions', 'README.md')
  const options = { code: readCode(), cutOver: lineage.cutOverDate(existsSync(readme) ? readFileSync(readme, 'utf8') : '') }
  let report = lineage.check(graph, options)
  if (has('--fix')) {
    for (const file of lineage.applyFixes(readSources(), report.findings)) writeFileSync(path.join(root, file.path), file.text)
    for (const { fix } of report.findings.filter((finding) => finding.fix)) {
      console.log(`wrote ${fix.file}: ${fix.status ? `Status: Superseded by [${fix.status}](${fix.link})` : `${fix.field}: ${fix.id}`}`)
    }
    report = lineage.check(lineage.parseLineage(readSources(), github), options)
  }
  console.log(has('--summary') ? lineage.formatSummary(report.summary) : lineage.formatCheck(report))
} else if (command === 'verify') {
  let parsed = graph
  // Pull numbers label a citation `PR#n`. A fixture `--root` stays offline; a failed `gh` does not hide expiry.
  if (rootFlag < 0) {
    try {
      const numbers = JSON.parse(execFileSync('gh', ['pr', 'list', '--state', 'all', '--limit', '10000', '--json', 'number'],
        { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 }))
      parsed = lineage.markPulls(parsed, numbers.map((item) => `#${item.number}`))
    } catch (error) {
      console.error(`verify: pull numbers unavailable (${error.message}) — citations stay #n`)
    }
  }
  const forFlag = flags.indexOf('--for')
  const wanted = forFlag >= 0 ? new Set(lineage.premisesFor(parsed, flags[forFlag + 1] ?? '')) : null
  const premises = parsed.nodes.filter((node) => node.kind === 'premise' && (!wanted || wanted.has(node.id)))
  const token = tokenAvailable()
  const rows = premises.map((premise) => {
    const disposition = lineage.commandDisposition(premise.verify, { token })
    if (disposition === 'manual') return lineage.classifyPremise(premise, {})
    if (disposition === 'skipped') return lineage.classifyPremise(premise, { skipped: true, reason: 'no token' })
    const row = lineage.classifyPremise(premise, runShell(premise.verify, root))
    if (row.status === 'expired') row.downstream = lineage.downstream(parsed, premise.id)
    return row
  })
  process.stdout.write(lineage.formatVerify(rows))
  if (has('--file')) fileExpiries(rows)
  process.exitCode = lineage.verifyExitCode(rows, has('--strict'))
} else if (command === 'graph' && (has('--json') || has('--mermaid'))) {
  const drawn = lineage.subgraph(graph, id)
  console.log(has('--json') ? JSON.stringify(drawn, null, 2) : lineage.toMermaid(drawn))
} else {
  console.error('usage: node scripts/lineage.mjs <parse --json | next-id | trace <id> | radius <id> | check [--fix] [--summary]' +
    ' | graph [<id>] --mermaid|--json | verify [--strict] [--for #<issue>] [--file]> [--root <dir>] [--github]')
  process.exit(2)
}
