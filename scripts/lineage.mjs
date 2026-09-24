#!/usr/bin/env node
// Decision Lineage (epic #457): every decision in the repo — ADRs, rulings, premises — and the
// typed relations between them, read from the field lines docs/decisions/README.md "Lineage" defines.
//
//   node scripts/lineage.mjs parse --json [--root <dir>]   the graph as JSON: nodes, edges, artefacts, errors
//   node scripts/lineage.mjs next-id [--root <dir>]        the id a new ruling takes
//
// Reads docs/decisions/** and docs/harness/ledger.md; all parsing is in lineage.logic.mjs. `parse`
// exits 1 when the graph has errors, listing each on stderr. trace/radius/check/graph are #467.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import * as lineage from './lineage.logic.mjs'

const [command, ...flags] = process.argv.slice(2)
const rootFlag = flags.indexOf('--root')
const root = rootFlag >= 0 ? path.resolve(flags[rootFlag + 1] ?? '.') : path.join(import.meta.dirname, '..')

/** Every file a parser reads, repo-relative and sorted, with its text. */
function readSources() {
  const decisions = path.join(root, 'docs', 'decisions')
  const listed = existsSync(decisions) ? readdirSync(decisions, { recursive: true, encoding: 'utf8' }) : []
  return [...listed.map((entry) => `docs/decisions/${entry.split(path.sep).join('/')}`), 'docs/harness/ledger.md']
    .filter((file) => lineage.sourceKind(file) && existsSync(path.join(root, file)))
    .sort()
    .map((file) => ({ path: file, text: readFileSync(path.join(root, file), 'utf8') }))
}

const graph = lineage.parseLineage(readSources())
if (command === 'parse') {
  console.log(JSON.stringify(graph, null, 2))
  for (const error of graph.errors) console.error(`${error.kind} ${error.where.join(', ')}: ${error.message}`)
  process.exit(graph.errors.length > 0 ? 1 : 0)
} else if (command === 'next-id') {
  // Until #466 imports them, the highest ruling ids live in the coordinator's run directories.
  if (!graph.nodes.some((node) => node.kind === 'ruling')) {
    console.error('next-id: docs/decisions/rulings/ holds no ruling yet (#466 imports them) — R1 would collide')
    process.exit(1)
  }
  console.log(lineage.nextRulingId(graph.nodes))
} else {
  console.error('usage: node scripts/lineage.mjs <parse --json | next-id> [--root <dir>]')
  process.exit(2)
}
