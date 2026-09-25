#!/usr/bin/env node
// Decision Lineage (epic #457): every decision in the repo — ADRs, rulings, premises — and the
// typed relations between them, read from the field lines docs/decisions/README.md "Lineage" defines.
//
//   node scripts/lineage.mjs parse --json [--root <dir>]   the graph as JSON: nodes, edges, artefacts, errors
//   node scripts/lineage.mjs next-id [--root <dir>]        the id a new ruling takes
//   node scripts/lineage.mjs trace <id> | radius <id>      what <id> rests on | what rests on it, as a tree
//   node scripts/lineage.mjs check [--fix] [--summary]     is the graph sound? --fix writes the missing reverse links
//   node scripts/lineage.mjs graph [<id>] --mermaid|--json draw all of it, or one decision's lineage
//   node scripts/lineage.mjs correct <id> [--file --retract|--amend]  its correction plan — a dry run unless --file
//
// Reads docs/decisions/** and docs/harness/ledger.md; all parsing is in lineage.logic.mjs. `parse`
// exits 1 when the graph has errors, listing each on stderr; `check` (src/ too) exits 0 — warn mode
// until #471. --github also reads every PR and issue body through `gh`, for Decisions: / Introduced by:; so does
// `correct --file`, which files its issues through `gh` and appends the root's status ruling to the newest rulings file.

import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import * as lineage from './lineage.logic.mjs'

const [command, ...flags] = process.argv.slice(2)
const rootFlag = flags.indexOf('--root')
const root = rootFlag >= 0 ? path.resolve(flags[rootFlag + 1] ?? '.') : path.join(import.meta.dirname, '..')
const has = (flag) => flags.includes(flag)
const id = flags.find((flag, k) => !flag.startsWith('--') && flags[k - 1] !== '--root')
const filing = command === 'correct' && has('--file') && !has('--dry-run')
const status = has('--retract') === has('--amend') ? null : has('--retract') ? 'retracted' : 'amended'
if (filing && !status) {
  console.error('correct --file needs one of --retract or --amend: the status the root ruling records')
  process.exit(2)
}

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

/** Every PR and issue with its body. A failing `gh` throws and stops the command, never reads as "no links". */
function readGithub() {
  const list = (kind) => JSON.parse(execFileSync('gh', [kind, 'list', '--state', 'all', '--limit', '10000', '--json', 'number,title,body,url'],
    { cwd: root, encoding: 'utf8', maxBuffer: 1 << 30 }))
  return [...list('pr'), ...list('issue')]
}

const github = has('--github') || filing ? readGithub() : []
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
} else if (command === 'graph' && (has('--json') || has('--mermaid'))) {
  const drawn = lineage.subgraph(graph, id)
  console.log(has('--json') ? JSON.stringify(drawn, null, 2) : lineage.toMermaid(drawn))
} else if (command === 'correct' && id) {
  const plan = lineage.correctionPlan(graph, id)
  const dir = path.join(root, 'docs', 'decisions', 'rulings')
  const newest = (existsSync(dir) ? readdirSync(dir) : []).filter((name) => /^\d{4}-\d{2}-\d{2}-.+\.md$/.test(name)).sort().at(-1)
  const rulings = newest ? `docs/decisions/rulings/${newest}` : null
  if (!filing && plan.drafts.length) console.log(lineage.formatPlan(plan, rulings))
  if (filing && plan.drafts.length) {
    const refused = plan.planned ? `${id} already has a correction plan, ${plan.planned}` : !rulings && 'no rulings file to record its status in'
    if (refused) {
      console.error(`correct: ${refused} — nothing filed`)
      process.exit(1)
    }
    const gh = (...args) => execFileSync('gh', args, { cwd: root, encoding: 'utf8' })
    const epic = lineage.rootEpic(plan.root.artefacts, (number) => JSON.parse(gh('issue', 'view', String(number), '--json', 'labels,parent')))
    const parent = epic ? ['--parent', String(epic)] : []
    const file = ({ title, body }, ...more) => {
      const url = gh('issue', 'create', '--title', title, '--body', body, '--label', 'lineage:correction', ...parent, ...more).trim()
      console.log(`filed ${url}: ${title}`)
      return Number(/(\d+)$/.exec(url)[1])
    }
    const first = file(plan.root)
    const ruling = lineage.statusRuling(plan.root, status, [first, ...plan.drafts.map((draft) => file(draft, '--blocked-by', String(first)))])
    appendFileSync(path.join(root, rulings), `\n\n${ruling}\n`)
    console.log(`wrote ${rulings}: ${ruling.split('\n')[0].slice(3)}`)
  }
} else {
  console.error('usage: node scripts/lineage.mjs <parse --json | next-id | trace <id> | radius <id> | check [--fix] [--summary]' +
    ' | graph [<id>] --mermaid|--json | correct <id> [--file --retract|--amend]> [--root <dir>] [--github]')
  process.exit(2)
}
