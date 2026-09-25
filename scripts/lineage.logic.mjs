// Decision Lineage (epic #457): the pure logic of scripts/lineage.mjs — no I/O, unit-tested in
// lineage.logic.test.mjs over the fixture repos in scripts/fixtures/lineage/. The model is
// docs/research/2026-09-24-decision-lineage/REPORT.md §6; the schema a writer follows is the
// "Lineage" section of docs/decisions/README.md.
//
// Each parser turns one file into a partial graph { nodes, edges, artefacts, errors }; parseLineage
// merges them and adds the two checks only the whole set can make: duplicate ids and dangling ids.
// The operations of REPORT §7 follow: trace, radius, check (warn mode — #471 makes it fail), graph.

/** A decision id as a relation writes it, optionally followed by a section: `ADR-0020 §1.5`. */
const REF = /^(ADR-\d{4}|R\d+|P-\d+)(?:\s+(§\S+))?$/
/** An issue or PR number — not a cross-repo `owner/repo#n`, not an HTML entity. */
const GITHUB_REF = /(?<![\w&/])#(\d+)\b/g
/** The template's Status value for a replaced ADR: the one relation a Status still carries. */
const SUPERSEDED_BY = /^Superseded by \[?ADR-(\d{4})\b/gi
/** An ADR header bullet: `- **Builds on:** …`. */
const ADR_FIELD = /^- \*\*([^*:]+):\*\*\s*(.*)$/
/** A ruling's field line; a bold name is the same field. */
const RULING_FIELD = /^(?:\*\*)?(Builds on|Amends|Assumes|Cost if wrong):(?:\*\*)?\s*(.*)$/i
/** A PR's or issue's links to decisions (#469) — bold, listed or bare — and any spelling of a relation field at all. */
const GITHUB_FIELD = /^\s*(?:[-*]\s+)?(?:\*\*)?(Decisions|Introduced by):(?:\*\*)?\s*(.*)$/i
const LOOSE_FIELD = /^\s*(?:[-*+]\s+)?[*_]*(?:builds on|amends|assumes|supersedes|amended by)[*_]*\s*:/i
/** Each relation field: its name, the node key its value is kept under, the edge it writes. */
const RELATIONS = [['Builds on', 'buildsOn', 'builds-on'], ['Amends', 'amends', 'amends'], ['Assumes', 'assumes', 'assumes']]
/** An ADR's two more, edges only — `Amended by:` names the far end: in ADR-0008, `Amended by: ADR-0020` is ADR-0020
 *  amends ADR-0008 — and what a relation may name, where not any decision id. */
const ADR_RELATIONS = [...RELATIONS, ['Supersedes', null, 'supersedes'], ['Amended by', null, 'amends', true]]
const TARGETS = {
  Assumes: [/^P-/, 'a premise id (P-<n>)'], Supersedes: [/^ADR-/, 'an ADR id (ADR-NNNN)'], 'Amended by': [/^(ADR|R)/, 'an ADR or ruling id'],
}
/** What a ledger row's `Decision` cell holds when no decision is known (#466). */
const NO_DECISION = ['', '—', '-']

const emptyGraph = () => ({ nodes: [], edges: [], artefacts: [], errors: [] })
const at = (file, line) => `${file}:${line}`
const malformed = (id, file, line, message) => ({ kind: 'malformed', id, where: [at(file, line)], message })
const fileOf = (source) => source.replace(/:\d+$/, '')
const byNumber = (a, b) => a.localeCompare(b, 'en', { numeric: true })
/** A PR shows as `PR#n` once GitHub says it is one. */
const labelOf = (item) => (item.type === 'pr' ? `PR${item.id}` : item.id)

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
    if (match) fields.push((open = { name: match[1].toLowerCase(), value: match[2].trim(), line: i + 1, last: i + 1 }))
    else if (open && /^\s+\S/.test(lines[i])) Object.assign(open, { value: `${open.value} ${lines[i].trim()}`.trim(), last: i + 1 })
    else open = null
  }
  return fields
}

/** Every line in lines[from, to) spelling a relation field otherwise than `pattern` reads one: an error, never dropped. */
function misspelt(graph, id, lines, from, to, pattern, file) {
  for (let i = from; i < to; i++) {
    const message = `${id}: "${lines[i].trim()}" is not a relation field as this file writes one — see docs/decisions/README.md#lineage`
    if (LOOSE_FIELD.test(lines[i]) && !pattern.test(lines[i])) graph.errors.push(malformed(id, file, i + 1, message))
  }
}

/** A relation's value: `none`, `unknown`, or its refs as written. */
const refList = (value) => (/^(none|unknown)$/i.test(value) ? value.toLowerCase() : value.split(',').map((ref) => ref.trim()))

/** The edges a relation's refs write; a ref that is not an id — or not one its field takes — is an error, never a dropped edge. */
function link(graph, from, kind, label, refs, file, line, far = false) {
  const [allowed, wanted] = TARGETS[label] ?? [/./, 'a decision id (ADR-NNNN, R<n> or P-<n>, optionally then §section)']
  for (const ref of Array.isArray(refs) ? refs : []) {
    const [, to, anchor] = REF.exec(ref) ?? []
    const ends = far ? { from: to, to: from } : { from, to }
    if (to && allowed.test(to)) graph.edges.push({ ...ends, kind, ...(anchor && !far && { anchor }), source: at(file, line) })
    else graph.errors.push(malformed(from, file, line, `${from}: "${ref}" in ${label} is not ${wanted}`))
  }
}

/** A decision's relation fields as node keys (null when absent) and as typed edges. */
function relate(graph, node, fields, file, relations = RELATIONS) {
  for (const [label, key, kind, far] of relations) {
    const [field, repeated] = fields.filter((candidate) => candidate.name === label.toLowerCase())
    if (repeated) graph.errors.push(malformed(node.id, file, repeated.line, `${node.id}: ${label} is written twice`))
    if (key) node[key] = field ? refList(field.value) : null
    if (field) link(graph, node.id, kind, label, refList(field.value), file, field.line, far)
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
  relate(graph, node, fields, file, ADR_RELATIONS)
  misspelt(graph, id, lines, 0, end < 0 ? lines.length : end, ADR_FIELD, file)
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
    misspelt(graph, node.id, lines, head + 1, end, RULING_FIELD, file)
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

/** PRs and issues as artefacts; a body's `Decisions:` line writes implements edges, `Introduced by:` introduced-by edges. */
function parseGithub(items) {
  const graph = emptyGraph()
  for (const { number, title, body, url } of items) {
    const artefact = { id: `#${number}`, kind: 'github', citedBy: [], type: /\/pull\/\d+$/.test(url ?? '') ? 'pr' : 'issue', title }
    proseLines(body ?? '').forEach((line, i) => {
      const [, name, value] = GITHUB_FIELD.exec(line) ?? []
      const [label, kind] = /^decisions$/i.test(name) ? ['Decisions', 'implements'] : ['Introduced by', 'introduced-by']
      if (name) link(graph, artefact.id, kind, label, refList(value.trim()), labelOf(artefact), i + 1)
    })
    graph.artefacts.push(artefact)
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
 * `github` adds PR and issue bodies, as `gh … --json number,title,body,url` lists them.
 */
export function parseLineage(sources, github = []) {
  const graph = emptyGraph()
  for (const { path, text } of sources) {
    const kind = sourceKind(path)
    if (!kind) continue
    const part = PARSERS[kind](path, text)
    for (const key of Object.keys(graph)) graph[key].push(...part[key])
  }
  const bodies = parseGithub(github)
  for (const key of Object.keys(graph)) graph[key].push(...bodies[key])
  const artefacts = new Map()
  for (const artefact of graph.artefacts) {
    const seen = artefacts.get(artefact.id)
    if (!seen) artefacts.set(artefact.id, artefact.citedBy ? { ...artefact, citedBy: [...artefact.citedBy] } : artefact)
    else if (seen.kind === 'github') seen.citedBy.push(...artefact.citedBy.filter((id) => !seen.citedBy.includes(id)))
    if (seen && artefact.type) Object.assign(seen, { type: artefact.type, title: artefact.title })
  }
  const defined = [...graph.nodes, ...graph.artefacts.filter((artefact) => artefact.kind === 'ledger-row')]
  const errors = [...graph.errors, ...duplicates(defined), ...dangling(graph.edges, [...defined, ...bodies.artefacts])]
  return { nodes: graph.nodes, edges: graph.edges, artefacts: [...artefacts.values()], errors }
}

/** The id a new ruling takes: one past the highest ruling id among `nodes`, by number. */
export function nextRulingId(nodes) {
  const numbers = nodes.filter((node) => node.kind === 'ruling').map((node) => Number(node.id.slice(1)))
  return `R${Math.max(0, ...numbers) + 1}`
}

/** Each relation once, however many ends write it: the anchored edge kept, with every anchor it names. */
function relations(graph) {
  const edges = new Map()
  for (const edge of graph.edges) {
    const key = `${edge.from} ${edge.kind} ${edge.to}`
    const seen = edges.get(key)
    if (!seen || (edge.anchor && !seen.anchor)) edges.set(key, edge)
    else if (edge.anchor && !seen.anchor.split(', ').includes(edge.anchor)) edges.set(key, { ...seen, anchor: `${seen.anchor}, ${edge.anchor}` })
  }
  return [...edges.values()]
}

/** The relations a lineage walks, in the order a tree lists them — not supersedes: a replacement does not rest on what it replaced. */
const WALKED = ['builds-on', 'assumes', 'amends', 'implements', 'introduced-by']

/** One decision's lineage as a tree, a node reached twice expanded once. Up: what it rests on, premises with their status,
 *  `unknown` where the record stops. Down: what rests on it, the #n each cites, the artefacts naming it as children. */
function lineage(graph, id, down) {
  if (!graph.nodes.some((node) => node.id === id)) return null
  const items = new Map([...graph.artefacts, ...graph.nodes].map((item) => [item.id, item]))
  const edges = relations(graph).filter((edge) => WALKED.includes(edge.kind))
  const [near, far] = down ? ['to', 'from'] : ['from', 'to']
  const seen = new Set()
  const grow = (key, edge) => {
    const item = items.get(key) ?? { id: key, title: 'no decision has this id' }
    const node = { id: key, label: labelOf(item), via: edge && [edge.kind, edge.anchor].filter(Boolean).join(' '), title: item.title }
    if (seen.has(key)) return { ...node, seen: true }
    seen.add(key)
    const cites = graph.artefacts.filter((artefact) => artefact.citedBy?.includes(key)).map((artefact) => artefact.id).sort(byNumber)
    Object.assign(node, item.kind === 'premise' && { status: item.status }, !down && item.buildsOn === 'unknown' && { unknown: true },
      down && edge && { cites: cites.map((cite) => labelOf(items.get(cite))) })
    node.children = edges.filter((next) => next[near] === key)
      .sort((a, b) => WALKED.indexOf(a.kind) - WALKED.indexOf(b.kind) || byNumber(a[far], b[far])).map((next) => grow(next[far], next))
    return node
  }
  return grow(id)
}

/** What `id` rests on (`lineage trace`), and what rests on it (`lineage radius` — the step-100 query). */
export const trace = (graph, id) => lineage(graph, id, false)
export const radius = (graph, id) => lineage(graph, id, true)

/** A lineage tree as trace and radius print it, one box-drawn line per node. */
export function formatTree(tree) {
  const describe = (node) => (node.seen ? 'see above' : `${node.title}${node.status ? ` [${node.status}]` : ''}` +
    `${node.cites?.length ? ` · cites ${node.cites.join(', ')}` : ''}${node.unknown ? ' · Builds on: unknown' : ''}`)
  const lines = [`${tree.label} — ${describe(tree)}`]
  const walk = (children, indent) => children.forEach((child, k) => {
    const last = k === children.length - 1
    lines.push(`${indent}${last ? '└─' : '├─'} ${child.label} (${child.via}) — ${describe(child)}`)
    if (!child.seen) walk(child.children, indent + (last ? '   ' : '│  '))
  })
  walk(tree.children, '')
  return lines.join('\n')
}

/** Every amends or supersedes relation into an ADR written at one end only (the deciding side's Amends: / Supersedes:,
 *  or the ADR's own Amended by: / Status), with the fix writing the other end — never into a ruling, which is append-only. */
function reverseLinks(graph) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]))
  const pairs = new Map()
  for (const edge of graph.edges.filter((e) => ['amends', 'supersedes'].includes(e.kind) && nodes.get(e.to)?.kind === 'adr' && nodes.has(e.from))) {
    const key = `${edge.from} ${edge.kind} ${edge.to}`
    pairs.set(key, { ...pairs.get(key) ?? edge, [fileOf(edge.source) === fileOf(nodes.get(edge.to).source) ? 'reverse' : 'forward']: edge.source })
  }
  return [...pairs.values()].filter((pair) => !pair.forward || !pair.reverse).map(({ from, kind, to, forward, reverse }) => {
    const target = nodes.get(forward ? to : from)
    const field = forward ? kind === 'amends' && 'Amended by' : { amends: 'Amends', supersedes: 'Supersedes' }[kind]
    const fix = field ? { file: fileOf(target.source), field, id: forward ? from : to }
      : { file: fileOf(target.source), status: from, link: fileOf(nodes.get(from).source).split('/').pop() }
    const message = field ? `${target.id} has no "${field}: ${fix.id}", yet ${forward ? `${from} ${kind} it` : `${to} names it`}`
      : `${to}'s Status does not open with "Superseded by [${from}](…)", yet ${from} supersedes it`
    const fixable = target.kind === 'adr'
    const how = !fixable ? 'write it by hand' : field ? '--fix writes it' : '--fix rewrites it'
    const finding = { kind: 'reverse-link', id: target.id, where: [target.source], message: `${message} (${forward ?? reverse}) — ${how}` }
    return fixable ? { ...finding, fix } : finding
  }).sort((a, b) => byNumber(a.where[0], b.where[0]))
}

/** Every line of `code` citing a superseded ADR, by its id or by its file name. */
function supersededCited(graph, code) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]))
  const replaced = relations(graph).filter((edge) => edge.kind === 'supersedes' && nodes.has(edge.to)).map(({ from, to }) => {
    const name = fileOf(nodes.get(to).source).split('/').pop().replace(/\.md$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return { from, to, cite: new RegExp(`\\b(?:${to}|${name})\\b`) }
  })
  return code.flatMap(({ path, text }) => text.split(/\r?\n/).flatMap((line, i) => replaced.filter(({ cite }) => cite.test(line))
    .map(({ from, to }) => ({ kind: 'superseded-cited', id: to, where: [at(path, i + 1)], message: `cites ${to}, superseded by ${from}` }))))
}

/** From the cut-over date on — a ruling is dated by its file, `<date>-<run>.md` — every ruling with no Builds on: line. */
function withoutBuildsOn(graph, cutOver) {
  const dated = (node) => /\/(\d{4}-\d{2}-\d{2})-[^/]*:\d+$/.exec(node.source)?.[1] ?? ''
  return graph.nodes.filter((node) => cutOver && node.kind === 'ruling' && node.buildsOn === null && dated(node) >= cutOver).map((node) => ({
    kind: 'no-builds-on', id: node.id, where: [node.source],
    message: `${node.id} (dated ${dated(node)}) has no Builds on: — required from the cut-over, ${cutOver}`,
  }))
}

/** The date docs/decisions/README.md records as `- **Cut-over:** YYYY-MM-DD` (#469), or null while there is none. */
export const cutOverDate = (text) => /^- \*\*Cut-over:\*\*\s*(\d{4}-\d{2}-\d{2})\b/m.exec(text)?.[1] ?? null

/** Is the graph sound? Every parse error, every ADR relation written at one end only, every line of `code` (src/) citing
 *  a superseded ADR and, from the `cutOver` date, every ruling without Builds on:. Warn mode: never a verdict (#471). */
export function check(graph, { code = [], cutOver = null } = {}) {
  const findings = [...graph.errors, ...reverseLinks(graph), ...supersededCited(graph, code), ...withoutBuildsOn(graph, cutOver)]
  const count = (kind) => findings.filter((finding) => finding.kind === kind).length
  const unlinked = graph.nodes.filter((node) => node.buildsOn === 'unknown').length
  return {
    findings,
    summary: { decisions: graph.nodes.length, unlinked, unresolved: graph.errors.length, supersededCited: count('superseded-cited'),
      reverseLinks: count('reverse-link'), cutOver, withoutBuildsOn: count('no-builds-on') },
  }
}

/** The one line `pnpm run lint:lineage` prints, in the shape of the repo's other checks. */
export const formatSummary = ({ decisions, unlinked, unresolved, supersededCited }) =>
  `LINEAGE: ${decisions} decisions · ${unlinked} unlinked · ${unresolved} unresolved · ${supersededCited} superseded-cited`
/** `check`'s report: `<kind> <file:line>: <message>` per finding, then the LINEAGE line. */
export const formatCheck = ({ findings, summary }) =>
  [...findings.map((finding) => `${finding.kind} ${finding.where.join(', ')}: ${finding.message}`), formatSummary(summary)].join('\n')

/** An ADR's header bullets: the fields above its first `##` section. */
function headerFields(text) {
  const lines = proseLines(text)
  const end = lines.findIndex((line) => /^## /.test(line))
  return readFields(lines, 0, end < 0 ? lines.length : end, ADR_FIELD)
}

/** `id` added to an ADR's `name` bullet, or a new bullet below its last relation — else below Date. */
function addToField(text, name, id) {
  const lines = text.split('\n')
  const fields = headerFields(text)
  const field = fields.find((candidate) => candidate.name === name.toLowerCase())
  const relation = (candidate) => ADR_RELATIONS.some(([label]) => label.toLowerCase() === candidate.name)
  const after = fields.findLast(relation) ?? fields.find((candidate) => candidate.name === 'date')
  if (field && /^(none|unknown)$/i.test(field.value)) lines[field.line - 1] = `- **${name}:** ${id}`
  else if (field) lines[field.last - 1] += `, ${id}`
  else lines.splice(after?.last ?? 1, 0, `- **${name}:** ${id}`)
  return lines.join('\n')
}

/** An ADR's Status in the template's form for a replaced ADR — `Superseded by [ADR-NNNN](file)` — then what followed its old status word. */
function supersede(text, id, link) {
  const lines = text.split('\n')
  const status = headerFields(text).find((field) => field.name === 'status')
  if (!status) return addToField(text, 'Status', `Superseded by [${id}](${link})`)
  const rest = lines[status.line - 1].replace(/^- \*\*Status:\*\*\s*/, '').replace(/^(?:Proposed|Accepted|Deprecated)\b\s*(?:[—–-]\s*)?/i, '')
  const named = new RegExp(`^Superseded by \\[?${id}\\b`, 'i').test(rest)
  const value = named ? rest : [`Superseded by [${id}](${link})`, rest].filter(Boolean).join(' — ')
  lines[status.line - 1] = `- **Status:** ${value}`
  return lines.join('\n')
}

/** The files `check --fix` rewrites, `{ path, text }`: each finding's missing end written into its ADR. */
export function applyFixes(sources, findings) {
  const texts = new Map(sources.map((source) => [source.path, source.text]))
  for (const { fix } of findings.filter((finding) => finding.fix && texts.has(finding.fix.file))) {
    texts.set(fix.file, fix.status ? supersede(texts.get(fix.file), fix.status, fix.link) : addToField(texts.get(fix.file), fix.field, fix.id))
  }
  return sources.filter((source) => texts.get(source.path) !== source.text).map((source) => ({ path: source.path, text: texts.get(source.path) }))
}

/** What `graph` draws: all of it, or one decision's lineage — what it rests on and what rests on it. One edge per relation. */
export function subgraph(graph, id) {
  const collect = (tree) => (tree ? [tree.id, ...(tree.children ?? []).flatMap(collect)] : [])
  const ids = id === undefined ? null : new Set([...collect(trace(graph, id)), ...collect(radius(graph, id))])
  const keep = (items, ...ends) => (ids ? items.filter((item) => ends.every((end) => ids.has(item[end]))) : items)
  return { nodes: keep(graph.nodes, 'id'), edges: keep(relations(graph), 'from', 'to'), artefacts: keep(graph.artefacts, 'id') }
}

/** A graph as a Mermaid flowchart for GitHub: every relation, and every decision or artefact a relation touches. */
export function toMermaid({ nodes, edges, artefacts }) {
  const name = (id) => (id.startsWith('#') ? `gh${id.slice(1)}` : id.replace(/\W/g, '_'))
  const touched = new Set(edges.flatMap((edge) => [edge.from, edge.to]))
  const boxes = [...nodes, ...artefacts].filter((item) => touched.has(item.id))
    .map((item) => `  ${name(item.id)}["${`${labelOf(item)} — ${item.title}`.replaceAll('"', '#quot;')}"]`)
  const arrows = edges.map((edge) => `  ${name(edge.from)} -->|${[edge.kind, edge.anchor].filter(Boolean).join(' ')}| ${name(edge.to)}`)
  return ['flowchart BT', ...boxes, ...arrows].join('\n')
}

/** The schema `graph --json` follows (docs/decisions/README.md "Lineage"): each node and artefact kind's id form, and the edge kinds. */
const FORMS = {
  node: { adr: /^ADR-\d{4}$/, ruling: /^R\d+$/, premise: /^P-\d+$/ },
  artefact: { github: /^#\d+$/, 'ledger-row': /^L\d+$/ },
}
const EDGE_KINDS = ['builds-on', 'amends', 'supersedes', 'assumes', 'introduced-by', 'implements']

/** Every departure of a graph from the schema, as `<what>: <why>`; [] when it conforms. */
export function validateGraph({ nodes = [], edges = [], artefacts = [] }) {
  const ids = new Set(nodes.map((node) => node.id))
  const known = new Set([...ids, ...artefacts.map((artefact) => artefact.id)])
  const article = (kind) => (/^[aeiou]/.test(kind) ? 'an' : 'a')
  const form = (what, item) => (FORMS[what][item.kind]?.test(item.id) ? [] : [`${what} ${item.id}: not ${article(item.kind)} ${item.kind} id`])
  return [...nodes.flatMap((node) => form('node', node)), ...artefacts.flatMap((artefact) => form('artefact', artefact)), ...edges.flatMap((edge) => [
    !EDGE_KINDS.includes(edge.kind) && `${edge.kind} is not an edge kind`, !ids.has(edge.to) && `${edge.to} is not a node`,
    !known.has(edge.from) && `${edge.from} is neither a node nor an artefact`,
  ].filter(Boolean).map((why) => `edge ${edge.from} ${edge.kind} ${edge.to}: ${why}`))]
}

/** `lineage correct` (#470): the correction plan, its dry-run text, the epic its issues go under, and the root's status ruling. */
export function correctionPlan() { throw new Error('not implemented (#470)') }
export function formatPlan() { throw new Error('not implemented (#470)') }
export function rootEpic() { throw new Error('not implemented (#470)') }
export function statusRuling() { throw new Error('not implemented (#470)') }
