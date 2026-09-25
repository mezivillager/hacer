// Decision Lineage (epic #457): the pure logic of scripts/lineage.mjs — no I/O, unit-tested in
// lineage.logic.test.mjs over the fixture repos in scripts/fixtures/lineage/. The model is
// docs/research/2026-09-24-decision-lineage/REPORT.md §6; the schema a writer follows is the
// "Lineage" section of docs/decisions/README.md.
//
// Each parser turns one file into a partial graph { nodes, edges, artefacts, errors }; parseLineage
// merges them and adds the two checks only the whole set can make: duplicate ids and dangling ids.

/** A decision id as a relation writes it, optionally followed by a section: `ADR-0020 §1.5`. */
const REF = /^(ADR-\d{4}|R\d+|P-\d+)(?:\s+(§\S+))?$/
/** An issue or PR number — not a cross-repo `owner/repo#n`, not an HTML entity. */
const GITHUB_REF = /(?<![\w&/])#(\d+)\b/g
/** The template's Status value for a replaced ADR: the one relation a Status still carries. */
const SUPERSEDED_BY = /\bSuperseded by \[?(?:ADR-)?(\d{4})\b/gi
/** An ADR header bullet: `- **Builds on:** …`. */
const ADR_FIELD = /^- \*\*([^*:]+):\*\*\s*(.*)$/
/** A ruling's field line; a bold name is the same field. */
const RULING_FIELD = /^(?:\*\*)?(Builds on|Amends|Assumes|Cost if wrong):(?:\*\*)?\s*(.*)$/i
/** Each relation field: its name, the node key its value is kept under, the edge it writes. */
const RELATIONS = [['Builds on', 'buildsOn', 'builds-on'], ['Amends', 'amends', 'amends'], ['Assumes', 'assumes', 'assumes']]
/** What a ledger row's `Decision` cell holds when no decision is known (#466). */
const NO_DECISION = ['', '—', '-']

const emptyGraph = () => ({ nodes: [], edges: [], artefacts: [], errors: [] })
const at = (file, line) => `${file}:${line}`
const malformed = (id, file, line, message) => ({ kind: 'malformed', id, where: [at(file, line)], message })

/** Which parser reads a repo-relative path, or null. The ADR template (0000) is not a decision. */
export function sourceKind(file) {
  if (/^docs\/decisions\/rulings\/.+\.md$/.test(file)) return 'rulings'
  if (file === 'docs/decisions/premises.md') return 'premises'
  if (file === 'docs/harness/ledger.md') return 'ledger'
  return /^docs\/decisions\/(?!0000-)\d{4}-[^/]+\.md$/.test(file) ? 'adr' : null
}

/** The lines with fenced code blanked: an example is never read as a decision, and line numbers hold. */
function proseLines(text) {
  let fence = null
  return text.split(/\r?\n/).map((line) => {
    const mark = /^\s*(`{3,}|~{3,})/.exec(line)?.[1]
    if (fence === null && !mark) return line
    if (fence === null) fence = mark
    else if (mark?.[0] === fence[0] && mark.length >= fence.length) fence = null
    return ''
  })
}

/** The field lines in lines[from, to) — `pattern` captures name and value — each joined with the indented lines continuing it. */
function readFields(lines, from, to, pattern) {
  const fields = []
  let open = null
  for (let i = from; i < to; i++) {
    const match = pattern.exec(lines[i])
    if (match) fields.push((open = { name: match[1].toLowerCase(), value: match[2].trim(), line: i + 1 }))
    else if (open && /^\s+\S/.test(lines[i])) open.value = `${open.value} ${lines[i].trim()}`.trim()
    else open = null
  }
  return fields
}

/** A relation's value: `none`, `unknown`, or its refs as written. */
const refList = (value) => (/^(none|unknown)$/i.test(value) ? value.toLowerCase() : value.split(',').map((ref) => ref.trim()))

/** The edges a relation's refs write; a ref that is not an id — or not a premise, under `assumes` — is an error, never a dropped edge. */
function link(graph, from, kind, label, refs, file, line) {
  for (const ref of Array.isArray(refs) ? refs : []) {
    const [, to, anchor] = REF.exec(ref) ?? []
    if (to && (kind !== 'assumes' || to.startsWith('P-'))) graph.edges.push({ from, to, kind, ...(anchor && { anchor }), source: at(file, line) })
    else {
      const wanted = kind === 'assumes' ? 'a premise id (P-<n>)' : 'a decision id (ADR-NNNN, R<n> or P-<n>, optionally then §section)'
      graph.errors.push(malformed(from, file, line, `${from}: "${ref}" in ${label} is not ${wanted}`))
    }
  }
}

/** A decision's three relation fields as node keys (null when absent) and as typed edges. */
function relate(graph, node, fields, file) {
  for (const [label, key, kind] of RELATIONS) {
    const [field, repeated] = fields.filter((candidate) => candidate.name === label.toLowerCase())
    if (repeated) graph.errors.push(malformed(node.id, file, repeated.line, `${node.id}: ${label} is written twice`))
    node[key] = field ? refList(field.value) : null
    if (field) link(graph, node.id, kind, label, node[key], file, field.line)
  }
}

/** Every `#n` in a decision's record, as artefacts citing back to it. */
function cited(lines, id) {
  const numbers = new Set(Array.from(lines.join('\n').matchAll(GITHUB_REF), (match) => match[1]))
  return [...numbers].map((number) => ({ id: `#${number}`, kind: 'github', citedBy: [id] }))
}

/** One ADR: the bullets above its first `##` section, and the supersedes edge its Status names. */
export function parseAdr(file, text) {
  const graph = emptyGraph()
  const lines = proseLines(text)
  const id = `ADR-${/(\d{4})-[^/]*$/.exec(file)[1]}`
  const titleAt = Math.max(0, lines.findIndex((line) => /^# /.test(line)))
  const end = lines.findIndex((line) => /^## /.test(line))
  const fields = readFields(lines, 0, end < 0 ? lines.length : end, ADR_FIELD)
  const status = fields.find((field) => field.name === 'status')
  const title = lines[titleAt].replace(/^#\s+(\d{4}\.\s*)?/, '')
  const node = { id, kind: 'adr', title, source: at(file, titleAt + 1), status: status?.value ?? null }
  relate(graph, node, fields, file)
  for (const [, number] of (status?.value ?? '').matchAll(SUPERSEDED_BY)) {
    graph.edges.push({ from: `ADR-${number}`, to: id, kind: 'supersedes', source: at(file, status.line) })
  }
  graph.nodes.push(node)
  graph.artefacts.push(...cited(lines, id))
  return graph
}

/** Every `## R<n> — <title>` block of a rulings file; a block runs to the next `#` or `##` heading. */
export function parseRulings(file, text) {
  const graph = emptyGraph()
  const lines = proseLines(text)
  const heads = lines.flatMap((line, i) => (/^#{1,2} /.test(line) ? [i] : []))
  heads.forEach((head, k) => {
    const heading = /^## (R\d+)\b\s*(.*)$/.exec(lines[head])
    if (!heading) return
    const end = heads[k + 1] ?? lines.length
    const fields = readFields(lines, head + 1, end, RULING_FIELD)
    const node = { id: heading[1], kind: 'ruling', title: heading[2].replace(/^[—–:-]\s*/, ''), source: at(file, head + 1) }
    relate(graph, node, fields, file)
    node.costIfWrong = fields.find((field) => field.name === 'cost if wrong')?.value ?? null
    graph.nodes.push(node)
    graph.artefacts.push(...cited(lines.slice(head, end), node.id))
  })
  return graph
}

/** A table row's cells: split on unescaped pipes; a cell wholly inside one code span or one bold run is unwrapped. */
const cells = (line) =>
  line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '').split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'))
    .map((cell) => /^\*\*([^*]+)\*\*$/.exec(cell)?.[1] ?? /^`([^`]+)`$/.exec(cell)?.[1] ?? cell)

/** The rows of the first table whose header names every column in `required`, keyed by lower-cased header. */
function readTable(lines, required) {
  const isRow = (line) => line.trim().startsWith('|')
  const head = lines.findIndex((line) => isRow(line) && required.every((name) => cells(line).some((cell) => cell.toLowerCase() === name)))
  if (head < 0) return []
  const names = cells(lines[head]).map((cell) => cell.toLowerCase())
  const rows = []
  for (let i = head + 2; i < lines.length && isRow(lines[i]); i++) {
    const values = cells(lines[i])
    rows.push({ line: i + 1, ...Object.fromEntries(names.map((name, k) => [name, values[k] ?? ''])) })
  }
  return rows
}

/** The rows of docs/decisions/premises.md as `P-<n>` nodes; a premise's title is its Premise column. */
export function parsePremises(file, text) {
  const graph = emptyGraph()
  for (const row of readTable(proseLines(text), ['id', 'premise', 'verify', 'expect', 'recorded', 'status'])) {
    if (!/^P-\d+$/.test(row.id)) {
      graph.errors.push(malformed(row.id, file, row.line, `"${row.id}" is not a premise id (P-<n>)`))
      continue
    }
    const { id, premise: title, verify, expect, recorded, status } = row
    graph.nodes.push({ id, kind: 'premise', title, source: at(file, row.line), verify, expect, recorded, status })
    graph.artefacts.push(...cited([title, verify, expect, recorded, status], id))
  }
  return graph
}

/** Ledger rows carrying an `Id` (`L<n>`) as artefacts; the `Decision` column writes introduced-by edges. */
export function parseLedger(file, text) {
  const graph = emptyGraph()
  for (const row of readTable(proseLines(text), ['id', 'decision'])) {
    if (!/^L\d+$/.test(row.id)) {
      graph.errors.push(malformed(row.id, file, row.line, `"${row.id}" is not a ledger row id (L<n>)`))
      continue
    }
    graph.artefacts.push({ id: row.id, kind: 'ledger-row', date: row.date ?? '', title: row['what went wrong'] ?? '', source: at(file, row.line) })
    if (!NO_DECISION.includes(row.decision)) link(graph, row.id, 'introduced-by', 'Decision', refList(row.decision), file, row.line)
  }
  return graph
}

const PARSERS = { adr: parseAdr, rulings: parseRulings, premises: parsePremises, ledger: parseLedger }

/** An id defined more than once — a node or a ledger row — with every place that defines it. */
function duplicates(defined) {
  const where = new Map()
  for (const { id, source } of defined) where.set(id, [...(where.get(id) ?? []), source])
  return [...where].filter(([, sources]) => sources.length > 1)
    .map(([id, sources]) => ({ kind: 'duplicate-id', id, where: sources, message: `${id} is defined ${sources.length} times` }))
}

/** Every edge end naming an id that nothing defines. */
function dangling(edges, defined) {
  const known = new Set(defined.map((item) => item.id))
  return edges.flatMap((edge) => [edge.from, edge.to].filter((id) => !known.has(id)).map((id) => ({
    kind: 'dangling-id', id, where: [edge.source], message: `${edge.from} ${edge.kind} ${edge.to}: no decision has the id ${id}`,
  })))
}

/**
 * Every decision in `sources` — `{ path, text }`, repo-relative — as one graph. A file no parser
 * reads is skipped; the `#n` artefacts of different decisions merge into one entry per number.
 */
export function parseLineage(sources) {
  const graph = emptyGraph()
  for (const { path, text } of sources) {
    const kind = sourceKind(path)
    if (!kind) continue
    const part = PARSERS[kind](path, text)
    for (const key of Object.keys(graph)) graph[key].push(...part[key])
  }
  const artefacts = new Map()
  for (const artefact of graph.artefacts) {
    const seen = artefacts.get(artefact.id)
    if (!seen) artefacts.set(artefact.id, artefact.citedBy ? { ...artefact, citedBy: [...artefact.citedBy] } : artefact)
    else if (seen.kind === 'github') seen.citedBy.push(...artefact.citedBy.filter((id) => !seen.citedBy.includes(id)))
  }
  const defined = [...graph.nodes, ...graph.artefacts.filter((artefact) => artefact.kind === 'ledger-row')]
  const errors = [...graph.errors, ...duplicates(defined), ...dangling(graph.edges, defined)]
  return { nodes: graph.nodes, edges: graph.edges, artefacts: [...artefacts.values()], errors }
}

/** The id a new ruling takes: one past the highest ruling id among `nodes`, by number. */
export function nextRulingId(nodes) {
  const numbers = nodes.filter((node) => node.kind === 'ruling').map((node) => Number(node.id.slice(1)))
  return `R${Math.max(0, ...numbers) + 1}`
}

// #467 — the queries and the check, not yet implemented (the red commit).
const notYet = () => { throw new Error('not implemented (#467)') }
export const trace = notYet
export const radius = notYet
export const formatTree = notYet
export const check = notYet
export const cutOverDate = notYet
export const formatCheck = notYet
export const applyFixes = notYet
export const subgraph = notYet
export const toMermaid = notYet
export const validateGraph = notYet
