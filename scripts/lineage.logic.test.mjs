import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { nextRulingId, parseAdr, parseLedger, parseLineage, parsePremises, parseRulings } from './lineage.logic.mjs'

// The fixtures under scripts/fixtures/lineage/ are small repos, laid out like this one:
//   chains/        the four chains of docs/research/2026-09-24-decision-lineage/REPORT.md §3a, with
//                  real ruling ids and titles from the coordinator's run directories, lineage written
//                  in the REPORT §6 field format — plus a ledger, a template, READMEs that yield nothing
//   adr/           two real ADR headers with the three lineage bullets
//   duplicate-id/  R224 twice, the restatement REPORT §3 measured
//   dangling-id/   a ruling that builds on R9999
const FIXTURES = path.join(import.meta.dirname, 'fixtures', 'lineage')
const REPO = path.join(import.meta.dirname, '..')

/** Every file of one fixture repo as `{ path, text }`, repo-relative — what the CLI hands the parser. */
function loadFixture(name) {
  const root = path.join(FIXTURES, name)
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .map((entry) => entry.split(path.sep).join('/'))
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => ({ path: file, text: readFileSync(path.join(root, file), 'utf8') }))
}

const fixtureText = (name, file) => readFileSync(path.join(FIXTURES, name, file), 'utf8')
const ids = (items) => items.map((item) => item.id)
/** `R513 amends ADR-0020 §1.5` — an edge as one comparable line. */
const edgeLines = (edges) => edges.map((edge) => [edge.from, edge.kind, edge.to, edge.anchor].filter(Boolean).join(' '))
/** Each `#n` artefact with the decisions citing it, sorted. */
const citations = (graph) =>
  Object.fromEntries(graph.artefacts.filter((a) => a.kind === 'github').map((a) => [a.id, [...a.citedBy].sort()]))

const LOOP = 'docs/decisions/rulings/2026-09-24-hacer-loop.md'
const FOUNDATION = 'docs/decisions/rulings/2026-09-23-hacer-foundation.md'

describe('lineage parsers', () => {
  it('parses an ADR\'s "- **Builds on:** / **Amends:** / **Assumes:**" bullets and its Status', () => {
    const file = 'docs/decisions/0016-browser-qa-in-the-cloud.md'
    const adr = parseAdr(file, fixtureText('adr', file))
    expect(adr.nodes).toEqual([
      {
        id: 'ADR-0016', kind: 'adr', title: 'Browser QA in the cloud is required for critical changes',
        source: `${file}:1`, status: 'Accepted', buildsOn: ['ADR-0013 §4'], amends: ['ADR-0012 §1'], assumes: 'none',
      },
    ])
    // Only the header's bullets are fields: the `- **Amends:**` bullet under ## Context is prose.
    expect(adr.edges).toEqual([
      { from: 'ADR-0016', to: 'ADR-0013', kind: 'builds-on', anchor: '§4', source: `${file}:5` },
      { from: 'ADR-0016', to: 'ADR-0012', kind: 'amends', anchor: '§1', source: `${file}:6` },
    ])
    expect(ids(adr.artefacts)).toEqual(['#220', '#257'])
    expect(adr.errors).toEqual([])

    // The template's `Superseded by [ADR-XXXX]` Status value is the supersedes edge, written on the
    // replaced side; a Status continued on an indented line is one value.
    const replaced = 'docs/decisions/0007-wire-routing-engine-direction.md'
    const old = parseAdr(replaced, fixtureText('adr', replaced))
    expect(old.nodes[0]).toMatchObject({
      id: 'ADR-0007',
      status:
        'Superseded by [ADR-0020](0020-spec-only-writes-read-only-projections.md) — Stages 2–4 cancelled: ' +
        'they were designed for interactive re-routing, and there is no drag',
      buildsOn: 'unknown', amends: null, assumes: null,
    })
    expect(old.edges).toEqual([{ from: 'ADR-0020', to: 'ADR-0007', kind: 'supersedes', source: `${replaced}:3` }])

    // Relations in Status prose — today's ADRs — are not read: not "amends [ADR-…]", not "in part".
    const legacy = parseAdr(
      'docs/decisions/0016-legacy.md',
      '# 0016. Legacy\n\n- **Status:** Accepted — amends [ADR-0012](0012-e2e.md); Superseded in part by [ADR-0099](x.md)\n',
    )
    expect(legacy.nodes[0]).toMatchObject({ buildsOn: null, amends: null, assumes: null })
    expect(legacy.edges).toEqual([])
  })

  it('parses a ruling block: id, title, Builds on (list | none | unknown), Assumes, Amends, Cost if wrong', () => {
    const loop = parseRulings(LOOP, fixtureText('chains', LOOP))
    const ruling = (id) => loop.nodes.find((node) => node.id === id)
    expect(ruling('R513')).toEqual({
      id: 'R513', kind: 'ruling', title: 'The ADR amendment argued back against the spike and was right to',
      source: `${LOOP}:22`, buildsOn: ['R501'], amends: ['ADR-0020 §1.5'], assumes: null,
      costIfWrong: 'the ADR records a capability the lowering does not have.',
    })
    expect(ruling('R517')).toEqual({
      id: 'R517', kind: 'ruling', title: '`gh-merge-on-green` treated every red check as fatal; scoped to required contexts',
      source: `${LOOP}:35`, buildsOn: 'none', amends: null, assumes: ['P-003'],
      costIfWrong: 'the tool merges a PR whose non-required check was actually load-bearing.',
    })
    // A bold field name is the same field.
    expect(ruling('R514').costIfWrong).toBe('one extra small docs round on a document that has already had a review.')
    expect(loop.edges.find((edge) => edge.from === 'R513' && edge.kind === 'amends')).toEqual({
      from: 'R513', to: 'ADR-0020', kind: 'amends', anchor: '§1.5', source: `${LOOP}:24`,
    })
    expect(ids(loop.nodes)).toEqual(['R501', 'R502', 'R503', 'R513', 'R514', 'R517', 'R518', 'R519', 'R520'])
    expect(loop.errors).toEqual([])

    const foundation = parseRulings(FOUNDATION, fixtureText('chains', FOUNDATION))
    const [r398, r399, , r405] = foundation.nodes
    expect(r398).toMatchObject({ id: 'R398', buildsOn: 'unknown', assumes: ['P-001'] })
    expect(r399).toMatchObject({ id: 'R399', buildsOn: ['R398'], costIfWrong: null })
    // An indented line continues the field above it.
    expect(r405.costIfWrong).toBe('one overturned Sonnet verdict, which is the documented trip-wire that moves the rule back.')

    // A value that is not an id is an error, never a silently dropped edge.
    const bad = parseRulings('docs/decisions/rulings/x.md', '## R1 — t\nBuilds on: R2, #403, none\nAssumes: R3\n')
    expect(edgeLines(bad.edges)).toEqual(['R1 builds-on R2'])
    expect(bad.errors.map((error) => [error.kind, error.where])).toEqual([
      ['malformed', ['docs/decisions/rulings/x.md:2']],
      ['malformed', ['docs/decisions/rulings/x.md:2']],
      ['malformed', ['docs/decisions/rulings/x.md:3']],
    ])
  })

  it('parses docs/decisions/premises.md rows: id, premise, verify, expect, recorded, status', () => {
    const file = 'docs/decisions/premises.md'
    const register = parsePremises(file, fixtureText('chains', file))
    expect(ids(register.nodes)).toEqual(['P-001', 'P-002', 'P-003', 'P-004', 'P-005'])
    expect(register.nodes[0]).toEqual({
      id: 'P-001', kind: 'premise', title: "R3F's peer range excludes React 19.3", source: `${file}:11`,
      verify: 'npm view @react-three/fiber peerDependencies.react', expect: '<19.3',
      recorded: '2026-09-21 (#342)', status: 'expired 2026-09-22',
    })
    // A cell is unwrapped only when one code span or one bold run covers all of it.
    expect(register.nodes[2]).toMatchObject({
      title: '`main-rules` requires exactly `ci`, `pr-hygiene`, `browser-qa`', verify: 'gh api …/rulesets/13907542',
      expect: 'those three', recorded: '2026-09-24 (R517)', status: 'holds',
    })
    expect(register.nodes[4]).toMatchObject({ verify: '`pnpm install` on a fixture', expect: 'exit 0' })
    expect(citations(register)).toEqual({ '#342': ['P-001'], '#355': ['P-002'], '#432': ['P-004'], '#455': ['P-005'] })
    expect(register.errors).toEqual([])

    const header = '| Id | Premise | Verify | Expect | Recorded | Status |\n|---|---|---|---|---|---|\n'
    const misnumbered = parsePremises(file, `${header}| P1 | a fact | \`true\` | 0 | 2026-09-25 | holds |\n`)
    expect(misnumbered.nodes).toEqual([])
    expect(misnumbered.errors).toMatchObject([{ kind: 'malformed', id: 'P1', where: [`${file}:3`] }])
  })

  it('parses ledger rows carrying Id and Decision columns', () => {
    const file = 'docs/harness/ledger.md'
    const ledger = parseLedger(file, fixtureText('chains', file))
    expect(ledger.nodes).toEqual([])
    expect(ledger.artefacts).toEqual([
      { id: 'L001', kind: 'ledger-row', date: '2026-09-18', title: 'Four statements in the workspace `CLAUDE.md` were stale for months', source: `${file}:8` },
      { id: 'L006', kind: 'ledger-row', date: '2026-09-18', title: '`pnpm install` in every worktree prints `husky: command not found`', source: `${file}:9` },
      {
        id: 'L048', kind: 'ledger-row', date: '2026-09-23',
        title: "#342's criteria rested on an upstream fact that expired ~31 hours after the issue was written", source: `${file}:10`,
      },
    ])
    // `—` is "no decision known"; the #342 row traces to the premise that expired (#466).
    expect(ledger.edges).toEqual([{ from: 'L048', to: 'P-001', kind: 'introduced-by', source: `${file}:10` }])
    expect(ledger.errors).toEqual([])

    // The live ledger has neither column until #469, so it contributes nothing yet — and no error.
    const today = '| Date | What went wrong | Should have been caught by | Mechanised? |\n|---|---|---|---|\n| 2026-09-18 | a | b | no |\n'
    expect(parseLedger(file, today)).toEqual({ nodes: [], edges: [], artefacts: [], errors: [] })
  })
})

// The four chains, reconstructed. Written by hand from REPORT §3a and the rulings' own text, never
// from the parser's output. Chain (iv) is R517 → R518 → R520 as the REPORT draws it, and R520 also
// amends R517 because its heading says so ("correction to R517").
const CHAIN_NODES = {
  '(i) ADR-0020 §1.5': ['ADR-0020', 'R501', 'R502', 'R503', 'R513', 'R514', 'R519'],
  '(ii) the #342 premise': ['P-001', 'P-005', 'R398', 'R399', 'R400', 'R405', 'R608'],
  '(iii) removeJunction': ['R607'],
  '(iv) R517 → R518 → R520': ['P-003', 'R517', 'R518', 'R520'],
}
const CHAIN_EDGES = {
  '(i) ADR-0020 §1.5': [
    'R501 builds-on ADR-0020 §1.5',
    'R502 builds-on R501',
    'R502 builds-on ADR-0020 §1.8',
    'R503 builds-on R501',
    'R513 builds-on R501',
    'R513 amends ADR-0020 §1.5',
    'R514 builds-on R513',
    'R519 builds-on R514',
  ],
  '(ii) the #342 premise': [
    'R398 assumes P-001',
    'R399 builds-on R398',
    'R400 builds-on R399',
    'R400 assumes P-005',
    'R405 builds-on R400',
    'R608 builds-on R400',
    'R608 assumes P-005',
    'L048 introduced-by P-001',
  ],
  '(iii) removeJunction': ['R607 builds-on ADR-0020 §7.5b'],
  '(iv) R517 → R518 → R520': ['R517 assumes P-003', 'R518 builds-on R517', 'R520 builds-on R518', 'R520 amends R517'],
}

describe('the lineage graph', () => {
  it('the four chains of REPORT §3a, as fixtures, yield the expected node and edge sets', () => {
    const graph = parseLineage(loadFixture('chains'))
    // The template, both READMEs and the fenced example in rulings/README.md yield nothing.
    expect(graph.errors).toEqual([])
    // P-002 and P-004 are in the register; no chain rests on them.
    expect(ids(graph.nodes).sort()).toEqual([...Object.values(CHAIN_NODES).flat(), 'P-002', 'P-004'].sort())
    expect(edgeLines(graph.edges).sort()).toEqual(Object.values(CHAIN_EDGES).flat().sort())
    expect(ids(graph.artefacts.filter((a) => a.kind === 'ledger-row'))).toEqual(['L001', 'L006', 'L048'])
    // Every `#n` a decision's record cites is an artefact of that decision — the associations
    // `radius` (#467) and `verify` (#468) walk to, e.g. P-001 → R398 → #342, R400 → #408, R405 → #409.
    expect(citations(graph)).toEqual({
      '#318': ['ADR-0020'], '#327': ['ADR-0020'], '#372': ['ADR-0020', 'R501', 'R503'],
      '#342': ['P-001', 'R398', 'R399', 'R608'], '#355': ['P-002'], '#432': ['P-004'], '#455': ['P-005', 'R608'],
      '#408': ['R400'], '#409': ['R405'], '#351': ['R405'], '#403': ['R607'], '#410': ['R608'],
      '#362': ['R502'], '#397': ['R503'], '#431': ['R503'], '#374': ['R513', 'R514'], '#433': ['R514', 'R519'],
    })
  })

  it('duplicate ids are an error', () => {
    const graph = parseLineage(loadFixture('duplicate-id'))
    const file = 'docs/decisions/rulings/2026-09-21-hacer-auto.md'
    expect(graph.errors).toEqual([
      { kind: 'duplicate-id', id: 'R224', where: [`${file}:6`, `${file}:13`], message: 'R224 is defined 2 times' },
    ])
    expect(ids(graph.nodes)).toEqual(['R224', 'R225', 'R224'])
  })

  it('a dangling id is an error', () => {
    const graph = parseLineage(loadFixture('dangling-id'))
    const file = 'docs/decisions/rulings/2026-09-25-fixture.md'
    expect(graph.errors).toEqual([
      { kind: 'dangling-id', id: 'R9999', where: [`${file}:9`], message: 'R611 builds-on R9999: no decision has the id R9999' },
    ])
    expect(edgeLines(graph.edges)).toEqual(['R611 builds-on R610', 'R611 builds-on R9999'])
  })

  it('next-id allocates one past the highest existing ruling id', () => {
    expect(nextRulingId(parseLineage(loadFixture('chains')).nodes)).toBe('R609')
    // By number, not by string: R100 is higher than R99. ADR and premise numbers do not count.
    const nodes = [{ id: 'R99', kind: 'ruling' }, { id: 'R100', kind: 'ruling' }, { id: 'ADR-0999', kind: 'adr' }, { id: 'P-900', kind: 'premise' }]
    expect(nextRulingId(nodes)).toBe('R101')
    expect(nextRulingId([])).toBe('R1')
  })

  it('node scripts/lineage.mjs parse --json prints the graph (nodes, edges, artefacts) for the live repo', () => {
    const run = spawnSync(process.execPath, ['scripts/lineage.mjs', 'parse', '--json'], { cwd: REPO, encoding: 'utf8' })
    const graph = JSON.parse(run.stdout)
    expect(Object.keys(graph)).toEqual(['nodes', 'edges', 'artefacts', 'errors'])
    // Counts are derived from the tree, never pinned: a new ADR or premise must not turn this red
    // (R606's class — a test that reads live state and asserts a constant). Whether the live graph
    // is *sound* is `lineage check` (#467), which starts in warn mode; this only proves it is read.
    const decisions = path.join(REPO, 'docs', 'decisions')
    const adrIds = readdirSync(decisions).filter((file) => /^\d{4}-.+\.md$/.test(file) && !file.startsWith('0000-'))
      .sort().map((file) => `ADR-${file.slice(0, 4)}`)
    const premiseRows = readFileSync(path.join(decisions, 'premises.md'), 'utf8').split('\n').filter((line) => /^\|\s*P-\d+\s*\|/.test(line))
    const rulingHeadings = readdirSync(path.join(decisions, 'rulings'))
      .flatMap((file) => readFileSync(path.join(decisions, 'rulings', file), 'utf8').split('\n'))
      .filter((line) => /^## R\d+/.test(line))
    expect(adrIds.length).toBeGreaterThan(0)
    expect(premiseRows.length).toBeGreaterThan(0)
    expect(ids(graph.nodes.filter((node) => node.kind === 'adr'))).toEqual(adrIds)
    expect(graph.nodes.filter((node) => node.kind === 'premise')).toHaveLength(premiseRows.length)
    expect(graph.nodes.filter((node) => node.kind === 'ruling')).toHaveLength(rulingHeadings.length)
    expect(graph.edges.every((edge) => ['builds-on', 'amends', 'supersedes', 'assumes', 'introduced-by'].includes(edge.kind))).toBe(true)
  })
})
