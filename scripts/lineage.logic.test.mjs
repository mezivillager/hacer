import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it, expect, onTestFinished } from 'vitest'
import {
  applyFixes, check, correctionPlan, cutOverDate, formatCheck, formatPlan, formatTree, nextRulingId, parseAdr, parseLedger, parseLineage,
  parsePremises, parseRulings, radius, rootEpic, statusRuling, subgraph, toMermaid, trace, validateGraph,
} from './lineage.logic.mjs'

// The fixtures under scripts/fixtures/lineage/ are small repos, laid out like this one:
//   chains/        the four chains of docs/research/2026-09-24-decision-lineage/REPORT.md §3a, with
//                  real ruling ids and titles from the coordinator's run directories, lineage written
//                  in the REPORT §6 field format — plus a ledger, a template, READMEs that yield nothing
//   adr/           two real ADR headers with the three lineage bullets
//   duplicate-id/  R224 twice, the restatement REPORT §3 measured
//   dangling-id/   a ruling that builds on R9999
//   reverse-links/ the six live ADR headers of the four pairs the survey found without a reverse link
//                  (0007/0008/0009 → 0020, 0012 → 0016), with the forward links typed on 0016 and 0020
//   cut-over/      rulings dated either side of a recorded cut-over date, with and without Builds on:
// chains/github.json holds PR and issue bodies in `gh … --json number,title,body,url` shape — the
// `Decisions:` and `Introduced by:` lines #469 adds, present for chains (i) and (iii).
const FIXTURES = path.join(import.meta.dirname, 'fixtures', 'lineage')
const REPO = path.join(import.meta.dirname, '..')

/** Every file of one fixture repo — a name under FIXTURES, or any directory — as `{ path, text }`, repo-relative: what the CLI hands the parser. */
function loadFixture(name) {
  const root = path.resolve(FIXTURES, name)
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

const loadGithub = () => JSON.parse(fixtureText('chains', 'github.json'))
/** One file's lines, out of a `{ path, text }` list. */
const linesOf = (files, file) => files.find((source) => source.path === file).text.split('\n')
const DECISIONS = 'docs/decisions'
const ADR_0020 = `${DECISIONS}/0020-spec-only-writes-read-only-projections.md`

describe('the schema, tightened (#467, from the DL-1 verification)', () => {
  it('an ADR\'s "- **Supersedes:**" bullet is the forward link, and its Status is read only in the template\'s exact form', () => {
    const adr = parseAdr(ADR_0020, '# 0020. Spec-only writes\n\n- **Status:** Accepted\n- **Date:** 2026-09-23\n- **Amends:** ADR-0008 §6, ADR-0009\n- **Supersedes:** ADR-0007\n')
    expect(edgeLines(adr.edges)).toEqual(['ADR-0020 amends ADR-0008 §6', 'ADR-0020 amends ADR-0009', 'ADR-0020 supersedes ADR-0007'])
    expect(adr.edges[2]).toEqual({ from: 'ADR-0020', to: 'ADR-0007', kind: 'supersedes', source: `${ADR_0020}:6` })
    // The node keeps DL-1's shape: Supersedes is a relation, never a lineage claim like Builds on.
    expect(Object.keys(adr.nodes[0])).toEqual(['id', 'kind', 'title', 'source', 'status', 'buildsOn', 'amends', 'assumes'])
    expect(adr.errors).toEqual([])

    // `- **Amended by:**` is the reverse `check --fix` writes: the same relation, stated by the ADR it changes.
    const amended = `${DECISIONS}/0008-scene-graph-routing-testing-layer.md`
    expect(parseAdr(amended, '# 0008. Scene graph\n\n- **Status:** Accepted\n- **Amended by:** ADR-0020\n').edges)
      .toEqual([{ from: 'ADR-0020', to: 'ADR-0008', kind: 'amends', source: `${amended}:4` }])
    // Supersedes names ADRs only.
    expect(parseAdr(ADR_0020, '# 0020. X\n\n- **Supersedes:** R607\n').errors).toMatchObject([{ kind: 'malformed', where: [`${ADR_0020}:3`] }])

    // The Status: only a value that opens with `Superseded by [ADR-NNNN]` is a supersession.
    const status = (value) => edgeLines(parseAdr(`${DECISIONS}/0099-x.md`, `# 0099. X\n\n- **Status:** ${value}\n`).edges)
    expect(status('Superseded by [ADR-0100](0100-y.md) — replaced whole')).toEqual(['ADR-0100 supersedes ADR-0099'])
    expect(status('Accepted — not superseded by ADR-0021')).toEqual([])
    expect(status('Superseded by 2026-10-01 review')).toEqual([])
    // The old prose form names the replacement too late in the value to be read: `check` reports it
    // once the replacement says `Supersedes:`, and `--fix` rewrites it (below).
    expect(status('Accepted — Superseded by [ADR-0020](0020-x.md) (Stages 2–4 cancelled)')).toEqual([])
  })

  it('a relation field spelt any other way is an error, never silently dropped', () => {
    const file = `${DECISIONS}/rulings/x.md`
    // The verifier's input — ADR-style bullets inside a ruling — and a field only an ADR has.
    const rulings = parseRulings(file, '## R1 — t\n- **Builds on:** R2\n- **Assumes:** P-9\nSupersedes: R3\n\n## R2 — u\nBuilds on: none\n')
    expect(rulings.nodes.map((node) => [node.id, node.buildsOn])).toEqual([['R1', null], ['R2', 'none']])
    const misspelt = (line) => `R1: "${line}" is not a relation field as this file writes one — see docs/decisions/README.md#lineage`
    expect(rulings.errors).toEqual([
      { kind: 'malformed', id: 'R1', where: [`${file}:2`], message: misspelt('- **Builds on:** R2') },
      { kind: 'malformed', id: 'R1', where: [`${file}:3`], message: misspelt('- **Assumes:** P-9') },
      { kind: 'malformed', id: 'R1', where: [`${file}:4`], message: misspelt('Supersedes: R3') },
    ])
    // An ADR header: the colon outside the bold, and a ruling-style bare line. Prose below the header is not a field.
    const adr = `${DECISIONS}/0013-x.md`
    const parsed = parseAdr(adr, '# 0013. X\n\n- **Status:** Accepted\n- **Builds on**: ADR-0012\nAmends: ADR-0011\n\n## Context\n- Amends: prose, never a field\n')
    expect(parsed.edges).toEqual([])
    expect(parsed.errors.map((error) => error.where)).toEqual([[`${adr}:4`], [`${adr}:5`]])
  })
})

describe('lineage queries and check (#467)', () => {
  it('trace <ruling> lists its upstream closure with each premise\'s status', () => {
    const graph = parseLineage(loadFixture('chains'))
    // Chain (iv): R520 → R518 → R517 → P-003. R520 also amends R517, which the tree has already shown.
    expect(formatTree(trace(graph, 'R520')).split('\n')).toEqual([
      'R520 — correction to R517: the red non-required checks were NOT a standing problem, and no issue is filed',
      '├─ R518 (builds-on) — my own R517 fix shipped a safety hole; the tool\'s first live run caught it',
      '│  └─ R517 (builds-on) — `gh-merge-on-green` treated every red check as fatal; scoped to required contexts',
      '│     └─ P-003 (assumes) — `main-rules` requires exactly `ci`, `pr-hygiene`, `browser-qa` [holds]',
      '└─ R517 (amends) — see above',
    ])
    // Chain (ii): the premise that expired, and where the record stops — R398 was imported unannotated.
    expect(formatTree(trace(graph, 'R405')).split('\n')).toEqual([
      'R405 — #409 is the first PR tiered under #351\'s new rule',
      '└─ R400 (builds-on) — The real risk is bump ordering, not a version hold, and it survives the premise expiring',
      '   ├─ R399 (builds-on) — #342 closed, not built: its premise expired before any builder opened it',
      '   │  └─ R398 (builds-on) — #342 dispatched with "verify the premise first, and close the issue if it has moved" · Builds on: unknown',
      '   │     └─ P-001 (assumes) — R3F\'s peer range excludes React 19.3 [expired 2026-09-22]',
      '   └─ P-005 (assumes) — `pnpm install` only warns on a peer violation [holds]',
    ])
    expect(trace(graph, 'R9999')).toBeNull()
  })

  it('radius ADR-0020 lists at least #372, R513, PR#433, R514, R519 and #374, as a tree', () => {
    const tree = formatTree(radius(parseLineage(loadFixture('chains'), loadGithub()), 'ADR-0020')).split('\n')
    // Chain (i), and more: R501–R503 sit between the ADR and R513, and R607 (chain iii) rests on §7.5b.
    // Each decision's artefacts: the #n its record cites (a PR shows as PR#n once GitHub says it is
    // one), then — as children — the PRs whose Decisions: line and the issues whose Introduced by: line name it.
    expect(tree).toEqual([
      'ADR-0020 — Spec-only writes, read-only projections',
      '├─ R501 (builds-on §1.5) — The #372 spike executed ADR-0020 §1.5\'s mechanism and found it does not work · cites #372',
      '│  ├─ R502 (builds-on) — Substitution hides a genuine double drive from #362, and that is the sharper finding · cites #362',
      '│  ├─ R503 (builds-on) — Two agents found the same live `main` bug independently, from opposite directions · cites #372, #397, #431',
      '│  └─ R513 (builds-on) — The ADR amendment argued back against the spike and was right to · cites #374',
      '│     └─ R514 (builds-on) — #433\'s nits go in as a briefed builder round, not a merge-as-is and not a fourth review · cites #374, PR#433',
      '│        └─ R519 (builds-on) — #433 merges on its tightening round, with no fourth review · cites PR#433',
      '├─ R502 (builds-on §1.8) — see above',
      '├─ R607 (builds-on §7.5b) — #403 takes option 2, ruled in the brief · cites #403',
      '│  ├─ PR#459 (implements) — fix(store): removeJunction deletes only the wires that would dangle (#403)',
      '│  └─ #462 (introduced-by) — Removing a junction in an imported document still loses the source→sink connection that ran through it',
      '└─ R513 (amends §1.5) — see above',
    ])
    for (const item of ['#372', 'R513', 'PR#433', 'R514', 'R519', '#374']) expect(tree.join('\n')).toContain(item)
  })

  it('radius R607 lists PR#459 and #462', () => {
    // Chain (iii): the repo holds R607 and the #403 it cites; what rests on it is in GitHub bodies —
    // PR #459's Decisions: line and #462's Introduced by: line, the links #469 adds.
    expect(formatTree(radius(parseLineage(loadFixture('chains'), loadGithub()), 'R607')).split('\n')).toEqual([
      'R607 — #403 takes option 2, ruled in the brief',
      '├─ PR#459 (implements) — fix(store): removeJunction deletes only the wires that would dangle (#403)',
      '└─ #462 (introduced-by) — Removing a junction in an imported document still loses the source→sink connection that ran through it',
    ])
    // Without the bodies nothing rests on it — faithful to the repo, and what `--github` is for.
    expect(formatTree(radius(parseLineage(loadFixture('chains')), 'R607'))).toBe('R607 — #403 takes option 2, ruled in the brief')
  })

  it('check: every referenced id resolves; unresolved ids are listed with their file:line', () => {
    const file = `${DECISIONS}/rulings/2026-09-25-fixture.md`
    const report = check(parseLineage(loadFixture('dangling-id')))
    expect(report.findings).toEqual([
      { kind: 'dangling-id', id: 'R9999', where: [`${file}:9`], message: 'R611 builds-on R9999: no decision has the id R9999' },
    ])
    expect(formatCheck(report).split('\n')).toEqual([
      `dangling-id ${file}:9: R611 builds-on R9999: no decision has the id R9999`,
      'LINEAGE: 2 decisions · 0 unlinked · 1 unresolved · 0 superseded-cited',
    ])
    // A PR's Decisions: and an issue's Introduced by: are references too, resolved the same way.
    const github = [
      { number: 900, title: 'a PR', url: 'https://github.com/mezivillager/hacer/pull/900', body: 'Fixes #1\n\nDecisions: R610, R9998\n' },
      { number: 901, title: 'an issue', url: 'https://github.com/mezivillager/hacer/issues/901', body: '- **Introduced by:** R611, not-an-id\n' },
    ]
    expect(check(parseLineage(loadFixture('dangling-id'), github)).findings.map((finding) => [finding.kind, finding.id, finding.where])).toEqual([
      ['malformed', '#901', ['#901:1']],
      ['dangling-id', 'R9999', [`${file}:9`]],
      ['dangling-id', 'R9998', ['PR#900:3']],
    ])
    expect(check(parseLineage(loadFixture('chains'), loadGithub())).summary).toMatchObject({ unresolved: 0 })
  })

  it('check: reverse links agree, and --fix writes the missing amended-by lines', () => {
    const [a7, a8, a9, a12] = [
      '0007-wire-routing-engine-direction', '0008-scene-graph-routing-testing-layer',
      '0009-bus-components-entity-and-wireendpoint-bus', '0012-e2e-tests-manual-only',
    ].map((name) => `${DECISIONS}/${name}.md`)
    const sources = loadFixture('reverse-links')
    const report = check(parseLineage(sources))
    // The four gaps the survey measured (REPORT §5): 0007/0008/0009 omit 0020, 0012 omits 0016.
    expect(report.findings.map((finding) => [finding.kind, finding.id, finding.where])).toEqual([
      ['reverse-link', 'ADR-0007', [`${a7}:1`]],
      ['reverse-link', 'ADR-0008', [`${a8}:1`]],
      ['reverse-link', 'ADR-0009', [`${a9}:1`]],
      ['reverse-link', 'ADR-0012', [`${a12}:1`]],
    ])
    expect(report.findings[0].message).toBe(
      `ADR-0007's Status does not open with "Superseded by [ADR-0020](…)", yet ADR-0020 supersedes it (${ADR_0020}:6) — --fix rewrites it`,
    )
    expect(report.findings[1].message).toBe(`ADR-0008 has no "Amended by: ADR-0020", yet ADR-0020 amends it (${ADR_0020}:5) — --fix writes it`)

    const fixed = applyFixes(sources, report.findings)
    expect(fixed.map((file) => file.path)).toEqual([a7, a8, a9, a12])
    // A superseded ADR's reverse link is the template's Status value; an amended one gains the line.
    expect(linesOf(fixed, a7)[2]).toBe(
      '- **Status:** Superseded by [ADR-0020](0020-spec-only-writes-read-only-projections.md) (Stages 2–4 cancelled: they were designed ' +
        'for interactive re-routing, and there is no drag; Stage 1 shipped and its findings survive inside channel routing)',
    )
    expect(linesOf(fixed, a8).slice(3, 6)).toEqual(['- **Date:** 2026-06-26', '- **Amended by:** ADR-0020', '- **Deciders:** Repo owner / scene-graph-routing-testing session'])
    expect(linesOf(fixed, a9).slice(3, 6)).toEqual(['- **Date:** 2026-06-27', '- **Amended by:** ADR-0020', '- **Deciders:** P05-12a session (bus splitter/joiner)'])
    expect(linesOf(fixed, a12).slice(3, 6)).toEqual(['- **Date:** 2026-09-17', '- **Amended by:** ADR-0016', '- **Deciders:** Repo owner'])
    // Nothing else moves, and the fixed repo agrees with itself.
    for (const { path: file, text } of fixed) {
      expect(text.split('\n').length - linesOf(sources, file).length).toBe(file === a7 ? 0 : 1)
    }
    const after = sources.map((source) => fixed.find((file) => file.path === source.path) ?? source)
    expect(check(parseLineage(after)).findings).toEqual([])

    // A ruling that amends an ADR needs the pointer too — chain (i)'s missing one: R513 amends ADR-0020 §1.5.
    const chains = loadFixture('chains')
    const gaps = check(parseLineage(chains)).findings.filter((finding) => finding.kind === 'reverse-link')
    expect(gaps.map((finding) => finding.message)).toEqual([
      `ADR-0020 has no "Amended by: R513", yet R513 amends it (${LOOP}:24) — --fix writes it`,
    ])
    expect(linesOf(applyFixes(chains, gaps), ADR_0020).slice(4, 6)).toEqual(['- **Builds on:** unknown', '- **Amended by:** R513'])

    // Agreement runs both ways: a reverse link with no forward one is a gap on the deciding side.
    const inline = [
      ['0030-a', '- **Status:** Accepted\n- **Date:** 2026-09-25\n- **Amended by:** ADR-0031'],
      ['0031-b', '- **Status:** Accepted\n- **Date:** 2026-09-25\n- **Builds on:** none'],
      ['0032-c', '- **Status:** Superseded by [ADR-0033](0033-d.md)\n- **Date:** 2026-09-25'],
      ['0033-d', '- **Status:** Accepted\n- **Date:** 2026-09-25'],
    ].map(([name, header]) => ({ path: `${DECISIONS}/${name}.md`, text: `# ${name.slice(0, 4)}. ${name.slice(5)}\n\n${header}\n` }))
    const oneSided = check(parseLineage(inline)).findings
    expect(oneSided.map((finding) => [finding.id, finding.where])).toEqual([
      ['ADR-0031', [`${DECISIONS}/0031-b.md:1`]],
      ['ADR-0033', [`${DECISIONS}/0033-d.md:1`]],
    ])
    const written = applyFixes(inline, oneSided)
    expect(linesOf(written, `${DECISIONS}/0031-b.md`).slice(4, 6)).toEqual(['- **Builds on:** none', '- **Amends:** ADR-0030'])
    expect(linesOf(written, `${DECISIONS}/0033-d.md`).slice(3, 5)).toEqual(['- **Date:** 2026-09-25', '- **Supersedes:** ADR-0032'])
  })

  it('check: a superseded ADR cited from src/ is reported', () => {
    // ADR-0020 supersedes ADR-0007 (its Supersedes: line); ADR-0008 is amended, not superseded.
    const graph = parseLineage(loadFixture('reverse-links'))
    const code = [
      { path: 'src/utils/wiringScheme/core.ts', text: '    // dense, closely-spaced pins on distinct lanes (B-003/B-004, ADR-0007).\nexport const core = 1\n' },
      { path: 'src/utils/wiringScheme/lanes.ts', text: '/**\n * Lane assignment, as ADR-0020 projects it,\n * and docs/decisions/0007-wire-routing-engine-direction.md.\n */\n' },
      { path: 'src/simulation/eval.test.ts', text: '// Not16: 0x0007 in; ADR-00070 and ADR-0008 cite no superseded ADR\n' },
    ]
    const report = check(graph, { code })
    expect(report.findings.filter((finding) => finding.kind === 'superseded-cited')).toEqual([
      { kind: 'superseded-cited', id: 'ADR-0007', where: ['src/utils/wiringScheme/core.ts:1'], message: 'cites ADR-0007, superseded by ADR-0020' },
      { kind: 'superseded-cited', id: 'ADR-0007', where: ['src/utils/wiringScheme/lanes.ts:3'], message: 'cites ADR-0007, superseded by ADR-0020' },
    ])
    expect(report.summary.supersededCited).toBe(2)

    // The live tree, through the CLI. REPORT §5 counted ADR-0007 nine times in seven files; the
    // expectation here is found from the tree independently — every file under src/, whatever its
    // extension — never pinned, so fixing a citation cannot turn this red (R606).
    const run = spawnSync(process.execPath, ['scripts/lineage.mjs', 'check'], { cwd: REPO, encoding: 'utf8' })
    expect(run.status).toBe(0)
    const printed = run.stdout.split('\n').filter((line) => line.startsWith('superseded-cited ')).map((line) => line.split(' ')[1].replace(/:$/, ''))
    const live = JSON.parse(spawnSync(process.execPath, ['scripts/lineage.mjs', 'parse', '--json'], { cwd: REPO, encoding: 'utf8' }).stdout)
    const replaced = live.edges.filter((edge) => edge.kind === 'supersedes').map((edge) => live.nodes.find((node) => node.id === edge.to))
    const names = replaced.flatMap((node) => [node.id, path.basename(node.source.replace(/:\d+$/, ''), '.md')])
    const found = readdirSync(path.join(REPO, 'src'), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.relative(REPO, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
      .flatMap((file) => readFileSync(path.join(REPO, file), 'utf8').split('\n')
        .flatMap((line, i) => (names.some((name) => new RegExp(`\\b${name}\\b`).test(line)) ? [`${file}:${i + 1}`] : [])))
    expect([...new Set(printed)].sort()).toEqual(found.sort())
    expect(printed).toHaveLength(found.length)
  })

  it('check: rulings dated after the cut-over without Builds on: are counted', () => {
    const cutOver = cutOverDate(fixtureText('cut-over', `${DECISIONS}/README.md`))
    expect(cutOver).toBe('2026-09-26')
    // Until #469 records one there is no cut-over, and nothing is counted.
    expect(cutOverDate('- **Cut-over:** none yet — #469 sets it to its merge date')).toBeNull()
    const graph = parseLineage(loadFixture('cut-over'))
    const report = check(graph, { cutOver })
    // A ruling is dated by its file, `<date>-<run>.md`; from the cut-over date on it must carry
    // Builds on:. R801 is older, R803 has the field, and R804's `unknown` has it too (it counts as unlinked).
    const required = 'required from the cut-over, 2026-09-26'
    expect(report.findings).toEqual([
      { kind: 'no-builds-on', id: 'R802', where: [`${DECISIONS}/rulings/2026-09-26-cut-over-day.md:3`], message: `R802 (dated 2026-09-26) has no Builds on: — ${required}` },
      { kind: 'no-builds-on', id: 'R805', where: [`${DECISIONS}/rulings/2026-09-27-after.md:6`], message: `R805 (dated 2026-09-27) has no Builds on: — ${required}` },
    ])
    // Warn mode: counted, not failing, and not one of the LINEAGE line's four numbers.
    expect(report.summary).toMatchObject({ cutOver: '2026-09-26', withoutBuildsOn: 2, decisions: 5, unlinked: 1, unresolved: 0 })
    expect(formatCheck(report).split('\n').at(-1)).toBe('LINEAGE: 5 decisions · 1 unlinked · 0 unresolved · 0 superseded-cited')
    expect(check(graph).summary).toMatchObject({ cutOver: null, withoutBuildsOn: 0 })
  })

  it('graph --mermaid renders chain (iii); graph --json validates against the schema', () => {
    const graph = parseLineage(loadFixture('chains'), loadGithub())
    // Chain (iii) is R607's lineage: the ADR section it rests on, and the PR and issue that name it.
    expect(toMermaid(subgraph(graph, 'R607')).split('\n')).toEqual([
      'flowchart BT',
      '  ADR_0020["ADR-0020 — Spec-only writes, read-only projections"]',
      '  R607["R607 — #403 takes option 2, ruled in the brief"]',
      '  gh459["PR#459 — fix(store): removeJunction deletes only the wires that would dangle (#403)"]',
      '  gh462["#462 — Removing a junction in an imported document still loses the source→sink connection that ran through it"]',
      '  R607 -->|builds-on §7.5b| ADR_0020',
      '  gh459 -->|implements| R607',
      '  gh462 -->|introduced-by| R607',
    ])
    // A quote in a title cannot close its label early.
    const quoted = { nodes: [{ id: 'R1', kind: 'ruling', title: 'say "no"' }, { id: 'R2', kind: 'ruling', title: 't' }], edges: [{ from: 'R2', to: 'R1', kind: 'builds-on' }], artefacts: [] }
    expect(toMermaid(quoted).split('\n')).toContain('  R1["R1 — say #quot;no#quot;"]')

    // graph --json, as the CLI prints it for a whole fixture repo, has the schema's shape…
    const run = spawnSync(process.execPath, ['scripts/lineage.mjs', 'graph', '--json', '--root', path.join(FIXTURES, 'chains')], { cwd: REPO, encoding: 'utf8' })
    const printed = JSON.parse(run.stdout)
    expect(Object.keys(printed)).toEqual(['nodes', 'edges', 'artefacts'])
    expect(validateGraph(printed)).toEqual([])
    expect(validateGraph(subgraph(graph))).toEqual([])
    // …one edge per relation, however many sides write it…
    expect(printed.edges).toHaveLength(new Set(printed.edges.map((edge) => `${edge.from} ${edge.kind} ${edge.to}`)).size)
    // …and the validator is not vacuous.
    expect(validateGraph({
      nodes: [{ id: 'R-1', kind: 'ruling', title: 't', source: 'x.md:1' }],
      edges: [{ from: 'R-1', to: 'R2', kind: 'depends-on', source: 'x.md:2' }],
      artefacts: [{ id: '403', kind: 'github' }],
    })).toEqual([
      'node R-1: not a ruling id',
      'artefact 403: not a github id',
      'edge R-1 depends-on R2: depends-on is not an edge kind',
      'edge R-1 depends-on R2: R2 is not a node',
    ])
  })

  it('pnpm run lint:lineage exists, runs inside pnpm run lint, exits 0 in warn mode, and prints one line in the repo\'s style', () => {
    const { scripts } = JSON.parse(readFileSync(path.join(REPO, 'package.json'), 'utf8'))
    expect(scripts['lint:lineage']).toBe('node scripts/lineage.mjs check --summary')
    expect(scripts.lint.split(' && ')).toContain('pnpm run lint:lineage')
    const lint = (...args) => spawnSync(process.execPath, ['scripts/lineage.mjs', 'check', '--summary', ...args], { cwd: REPO, encoding: 'utf8' })
    // Warn mode: an unresolved id is counted, and the exit is still 0 — failing is #471.
    const dangling = lint('--root', path.join(FIXTURES, 'dangling-id'))
    expect([dangling.status, dangling.stdout]).toEqual([0, 'LINEAGE: 2 decisions · 0 unlinked · 1 unresolved · 0 superseded-cited\n'])
    // The live repo: one line, counting what `parse` reads — every decision, and every `unknown`.
    const live = lint()
    expect(live.status).toBe(0)
    expect(live.stdout).toMatch(/^LINEAGE: \d+ decisions · \d+ unlinked · \d+ unresolved · \d+ superseded-cited\n$/)
    const parsed = JSON.parse(spawnSync(process.execPath, ['scripts/lineage.mjs', 'parse', '--json'], { cwd: REPO, encoding: 'utf8' }).stdout)
    const [, decisions, unlinked] = /^LINEAGE: (\d+) decisions · (\d+) unlinked/.exec(live.stdout)
    expect(Number(decisions)).toBe(parsed.nodes.length)
    expect(Number(unlinked)).toBe(parsed.nodes.filter((node) => node.buildsOn === 'unknown').length)
  })
})

// `lineage correct` (#470) — REPORT §7's correction workflow. The drafts are written out by hand below
// from the chains fixture, never from the tool's output. `--file` runs against a copy of the fixture with
// `gh` stubbed on PATH: the stub logs every call and answers from github.json, so no test reaches GitHub.
const GH_STUB = `const fs = require('node:fs')
const path = require('node:path')
const dir = path.dirname(__dirname)
const args = process.argv.slice(2)
fs.appendFileSync(path.join(dir, 'calls.jsonl'), JSON.stringify(args) + '\\n')
if (args[0] === 'issue' && args[1] === 'create') {
  const filed = fs.readFileSync(path.join(dir, 'calls.jsonl'), 'utf8').split('\\n').filter((line) => line.startsWith('["issue","create"'))
  console.log('https://github.com/mezivillager/hacer/issues/' + (899 + filed.length))
} else {
  const answers = JSON.parse(fs.readFileSync(path.join(dir, 'answers.json'), 'utf8'))
  const key = args.slice(0, args[1] === 'view' ? 3 : 2).join(' ')
  if (!(key in answers)) {
    console.error('gh stub: no answer for gh ' + args.join(' '))
    process.exit(1)
  }
  console.log(JSON.stringify(answers[key]))
}
`

/** A copy of the chains fixture and a `gh` stub on PATH that answers `pr list` / `issue list` from github.json and
 *  `issue view <n>` from `views`, files issues from #900 up, and logs every call. `correct(...args)` runs the CLI there. */
function withGhStub(views = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'lineage-correct-'))
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }))
  const root = path.join(dir, 'repo')
  cpSync(path.join(FIXTURES, 'chains'), root, { recursive: true })
  mkdirSync(path.join(dir, 'bin'))
  writeFileSync(path.join(dir, 'bin', 'package.json'), '{ "type": "commonjs" }\n')
  writeFileSync(path.join(dir, 'bin', 'gh'), `#!${process.execPath}\n${GH_STUB}`, { mode: 0o755 })
  const github = loadGithub()
  writeFileSync(path.join(dir, 'answers.json'), JSON.stringify({
    'pr list': github.filter((item) => item.url.includes('/pull/')),
    'issue list': github.filter((item) => !item.url.includes('/pull/')),
    ...Object.fromEntries(Object.entries(views).map(([number, view]) => [`issue view ${number}`, view])),
  }))
  const log = path.join(dir, 'calls.jsonl')
  const logged = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line)) : [])
  const env = { ...process.env, PATH: `${path.join(dir, 'bin')}${path.delimiter}${process.env.PATH}` }
  return {
    root,
    correct(...args) {
      const before = logged().length
      const run = spawnSync(process.execPath, ['scripts/lineage.mjs', 'correct', ...args, '--root', root], { cwd: REPO, encoding: 'utf8', env })
      return { status: run.status, stdout: run.stdout, stderr: run.stderr, calls: logged().slice(before) }
    },
  }
}

/** Each `gh` call as a short name: `pr list`, `issue view 403`, `issue create`. */
const callNames = (calls) => calls.map((args) => args.slice(0, args[1] === 'view' ? 3 : 2).join(' '))
/** Each `gh issue create` call's options by name; an option not passed is undefined. */
const filed = (calls) => calls.filter(([, verb]) => verb === 'create').map((args) => Object.fromEntries(
  ['--title', '--body', '--label', '--parent', '--blocked-by'].map((name) => [name.slice(2), args.includes(name) ? args[args.indexOf(name) + 1] : undefined])))

const LOOP_FILE = 'docs/decisions/rulings/2026-09-24-hacer-loop.md'
const FOUND_R607 = '- **Found wrong:** R607 — #403 takes option 2, ruled in the brief (`docs/decisions/rulings/2026-09-24-hacer-loop-93.md:7`)'
const TITLE_459 = 'fix(store): removeJunction deletes only the wires that would dangle (#403)'
const TITLE_462 = 'Removing a junction in an imported document still loses the source→sink connection that ran through it'
const DRY_RUN_R607 = [
  'Correction plan for R607 — its own correction issue first, then 2 drafts it blocks, one per decision or artefact resting on it. ' +
    `\`--file --retract|--amend\` files them and appends R609 to ${LOOP_FILE}.`,
  '',
  '## Correct R607 — #403 takes option 2, ruled in the brief',
  'Introduced by: R607',
  '',
  FOUND_R607,
  '- **Correct it first:** every task resting on it is blocked by this issue —',
  '  - PR #459 implements R607',
  '  - #462 was introduced by R607',
  '',
  'Drafted by `node scripts/lineage.mjs correct R607`.',
  '',
  `## Correct R607 → PR#459 — ${TITLE_459}`,
  'Introduced by: R607',
  '',
  FOUND_R607,
  `- **Revisit:** PR #459 — ${TITLE_459}`,
  '- **Rests on it:** PR #459 implements R607',
  '',
  "Blocked by R607's own correction issue. Drafted by `node scripts/lineage.mjs correct R607`.",
  '',
  `## Correct R607 → #462 — ${TITLE_462}`,
  'Introduced by: R607',
  '',
  FOUND_R607,
  `- **Revisit:** #462 — ${TITLE_462}`,
  '- **Rests on it:** #462 was introduced by R607',
  '',
  "Blocked by R607's own correction issue. Drafted by `node scripts/lineage.mjs correct R607`.",
].join('\n')

describe('lineage correct (#470)', () => {
  it('correct R607 --dry-run prints one draft per downstream node (PR#459, #462), each body naming the root and the node\'s artefacts', () => {
    // Chain (iii): R607 → PR#459 (its Decisions: line) and #462 (its Introduced by: line). The plan opens with R607's
    // own correction issue, which blocks one draft per node `radius R607` reaches.
    const plan = correctionPlan(parseLineage(loadFixture('chains'), loadGithub()), 'R607')
    expect(plan.drafts.map((draft) => draft.id)).toEqual(['#459', '#462'])
    expect(formatPlan(plan, LOOP_FILE)).toBe(DRY_RUN_R607)
    // Through the CLI: --dry-run is the default, and it only reads — the PR and issue lists, nothing filed.
    const gh = withGhStub()
    for (const args of [['R607', '--dry-run', '--github'], ['R607', '--github']]) {
      const run = gh.correct(...args)
      expect([run.status, run.stdout, run.stderr]).toEqual([0, `${DRY_RUN_R607}\n`, ''])
      expect(callNames(run.calls)).toEqual(['pr list', 'issue list'])
    }
  })

  it('a decision\'s draft names how it rests on the root and its own artefacts — PRs via Decisions:, issues via Introduced by:, ledger rows via Decision', () => {
    const rulings = 'docs/decisions/rulings/2026-09-25-fixture.md'
    const sources = [
      { path: rulings, text: '# Rulings — 2026-09-25 fixture\n\n## R1 — the root\nBuilds on: none\n\n## R2 — rests on the root\nBuilds on: R1\n\nSee #7.\n' },
      { path: 'docs/harness/ledger.md', text: '| Id | Date | What went wrong | Decision |\n|---|---|---|---|\n| L001 | 2026-09-25 | a defect R2 caused | R2 |\n' },
    ]
    const github = [
      { number: 10, title: 'feat: carry R2 out', url: 'https://github.com/mezivillager/hacer/pull/10', body: 'Decisions: R2\n' },
      { number: 11, title: 'R2 broke something', url: 'https://github.com/mezivillager/hacer/issues/11', body: '**Introduced by:** R2\n' },
    ]
    const plan = correctionPlan(parseLineage(sources, github), 'R1')
    expect(plan.drafts.map((draft) => [draft.id, draft.title])).toEqual([
      ['R2', 'Correct R1 → R2 — rests on the root'],
      ['#10', 'Correct R1 → PR#10 — feat: carry R2 out'],
      ['#11', 'Correct R1 → #11 — R2 broke something'],
      ['L001', 'Correct R1 → L001 — a defect R2 caused'],
    ])
    expect(plan.drafts[0].body.split('\n')).toEqual([
      'Introduced by: R1',
      '',
      `- **Found wrong:** R1 — the root (\`${rulings}:3\`)`,
      `- **Revisit:** R2 — rests on the root (\`${rulings}:6\`)`,
      '- **Rests on it:** R2 builds on R1',
      '- **Its artefacts:** PR #10, #11, L001 · its record cites #7',
      '',
      "Blocked by R1's own correction issue. Drafted by `node scripts/lineage.mjs correct R1`.",
    ])
    // An artefact is revisited itself; its draft says how it reaches the root, through the decision it names.
    expect(plan.drafts[3].body.split('\n').slice(3, 5)).toEqual([
      '- **Revisit:** L001 — a defect R2 caused (`docs/harness/ledger.md:3`)',
      '- **Rests on it:** L001 was introduced by R2, which builds on R1',
    ])
    expect(plan.drafts.slice(1).map((draft) => draft.body.includes('Its artefacts'))).toEqual([false, false, false])

    // Chain (iv) — R520 builds on R518, which builds on R517, and also amends R517: one draft, on the path radius took.
    // Chain (i) — a section anchor stays on the relation; R607's artefacts are the PR and the issue naming it.
    const chains = parseLineage(loadFixture('chains'), loadGithub())
    expect(correctionPlan(chains, 'R517').drafts.map((draft) => draft.body.split('\n')[4])).toEqual([
      '- **Rests on it:** R518 builds on R517',
      '- **Rests on it:** R520 builds on R518, which builds on R517',
    ])
    const r607 = correctionPlan(chains, 'ADR-0020').drafts.find((draft) => draft.id === 'R607').body.split('\n')
    expect(r607.slice(4, 6)).toEqual(['- **Rests on it:** R607 builds on ADR-0020 §7.5b', '- **Its artefacts:** PR #459, #462 · its record cites #403'])
    // A title is clipped for GitHub, never the body.
    const long = 'x'.repeat(200)
    const clipped = correctionPlan(parseLineage([{ path: rulings, text: `## R1 — r\nBuilds on: none\n\n## R2 — ${long}\nBuilds on: R1\n` }]), 'R1')
    expect(clipped.drafts[0].title).toBe(`Correct R1 → R2 — ${'x'.repeat(119)}…`)
    expect(clipped.drafts[0].body).toContain(long)
  })

  it('correct drafts exactly the nodes radius reaches, each once, and nothing for an id that does not exist', () => {
    const graph = parseLineage(loadFixture('chains'), loadGithub())
    const reached = (tree) => tree.children.flatMap((child) => (child.seen ? [] : [child.id, ...reached(child)]))
    for (const { id } of graph.nodes) expect(correctionPlan(graph, id).drafts.map((draft) => draft.id)).toEqual(reached(radius(graph, id)))
    expect(correctionPlan(graph, 'ADR-0020').drafts).toHaveLength(9)
    expect(correctionPlan(graph, 'R9999')).toBeNull()
  })

  it('correct on a decision with no dependents prints nothing and exits 0', () => {
    // R519 is the end of chain (i): nothing builds on it, implements it or names it.
    expect(correctionPlan(parseLineage(loadFixture('chains'), loadGithub()), 'R519').drafts).toEqual([])
    expect(formatPlan(correctionPlan(parseLineage(loadFixture('chains')), 'R519'), LOOP_FILE)).toBe('')
    const run = spawnSync(process.execPath, ['scripts/lineage.mjs', 'correct', 'R519', '--dry-run', '--root', path.join(FIXTURES, 'chains')], { cwd: REPO, encoding: 'utf8' })
    expect([run.status, run.stdout, run.stderr]).toEqual([0, '', ''])
    // --file has no plan to file either: it reads the bodies, then files nothing and writes nothing.
    const gh = withGhStub()
    const filing = gh.correct('R519', '--file', '--retract')
    expect([filing.status, filing.stdout, callNames(filing.calls)]).toEqual([0, '', ['pr list', 'issue list']])
    expect(readFileSync(path.join(gh.root, LOOP_FILE), 'utf8')).toBe(fixtureText('chains', LOOP_FILE))
  })

  it('correct --file creates the issues with label lineage:correction, Introduced by: <root>, the root\'s epic as parent when known, and blocked-by the root\'s own correction issue', () => {
    // R607's artefacts, by number: #403 (its record cites it), PR#459 and #462. The stub says #403 sits under #318.
    const gh = withGhStub({ 403: { labels: [{ name: 'project:foundation' }], parent: { number: 318, title: 'Foundation plan' } } })
    const run = gh.correct('R607', '--file', '--retract')
    expect([run.status, run.stderr]).toEqual([0, ''])
    // --file reads the bodies as --github does, asks for the first artefact's parent, then files the root's issue first.
    expect(callNames(run.calls)).toEqual(['pr list', 'issue list', 'issue view 403', 'issue create', 'issue create', 'issue create'])
    expect(run.calls[2]).toEqual(['issue', 'view', '403', '--json', 'labels,parent'])
    const plan = correctionPlan(parseLineage(loadFixture('chains'), loadGithub()), 'R607')
    const [own, pr, issue] = filed(run.calls)
    expect(own).toEqual({ title: plan.root.title, body: plan.root.body, label: 'lineage:correction', parent: '318', 'blocked-by': undefined })
    expect(pr).toEqual({ title: plan.drafts[0].title, body: plan.drafts[0].body, label: 'lineage:correction', parent: '318', 'blocked-by': '900' })
    expect(issue).toEqual({ title: plan.drafts[1].title, body: plan.drafts[1].body, label: 'lineage:correction', parent: '318', 'blocked-by': '900' })
    for (const { body } of [own, pr, issue]) expect(body.split('\n')[0]).toBe('Introduced by: R607')
    expect(run.stdout.split('\n')).toEqual([
      'filed https://github.com/mezivillager/hacer/issues/900: Correct R607 — #403 takes option 2, ruled in the brief',
      `filed https://github.com/mezivillager/hacer/issues/901: Correct R607 → PR#459 — ${TITLE_459}`,
      `filed https://github.com/mezivillager/hacer/issues/902: Correct R607 → #462 — ${TITLE_462}`,
      `wrote ${LOOP_FILE}: R609 — R607 retracted: correction plan #900`,
      '',
    ])

    // The epic, when known: the first artefact by number that is an epic, or has a parent; none → no --parent.
    expect(plan.root.artefacts).toEqual([403, 459, 462])
    const view = (answers) => (number) => answers[number] ?? { labels: [], parent: null }
    expect(rootEpic([403, 459, 462], view({}))).toBeNull()
    expect(rootEpic([403, 459, 462], view({ 459: { labels: [], parent: { number: 318 } }, 462: { labels: [], parent: { number: 138 } } }))).toBe(318)
    expect(rootEpic([403, 459], view({ 403: { labels: [{ name: 'epic' }], parent: null }, 459: { labels: [], parent: { number: 318 } } }))).toBe(403)
    // R517's record names no issue, and nothing on GitHub names R517: no lookups, no --parent.
    const amend = withGhStub().correct('R517', '--file', '--amend')
    expect([amend.status, callNames(amend.calls)]).toEqual([0, ['pr list', 'issue list', 'issue create', 'issue create', 'issue create']])
    expect(filed(amend.calls).map((issue) => [issue.title, issue.parent, issue['blocked-by']])).toEqual([
      ['Correct R517 — `gh-merge-on-green` treated every red check as fatal; scoped to required contexts', undefined, undefined],
      ['Correct R517 → R518 — my own R517 fix shipped a safety hole; the tool\'s first live run caught it', undefined, '900'],
      ['Correct R517 → R520 — correction to R517: the red non-required checks were NOT a standing problem, and no issue is filed', undefined, '900'],
    ])
  })

  it('the root ruling\'s Status becomes retracted or amended (flag) with a pointer to the correction issues', () => {
    // A ruling is append-only (docs/decisions/README.md "Lineage"), so the status is a new ruling that amends the root —
    // the schema's `Amends:` — appended to the newest rulings file, with the id next-id would give.
    const retracted = [
      '## R609 — R607 retracted: correction plan #900',
      'Builds on: none',
      'Amends: R607',
      'Cost if wrong: R607 stood after all; the plan\'s issues close as not planned.',
      '',
      'Filed by `lineage correct R607 --file`: #900 corrects R607 itself, and blocks #901, #902 — one per decision or artefact resting on it.',
    ].join('\n')
    const plan = correctionPlan(parseLineage(loadFixture('chains'), loadGithub()), 'R607')
    expect(plan.root).toMatchObject({ id: 'R607', next: 'R609' })
    expect(statusRuling(plan.root, 'retracted', [900, 901, 902])).toBe(retracted)
    expect(statusRuling(plan.root, 'amended', [900, 901])).toBe(retracted
      .replace('R607 retracted', 'R607 amended').replace('and blocks #901, #902', 'and blocks #901'))

    const gh = withGhStub({ 403: { labels: [], parent: null }, 459: { labels: [], parent: null }, 462: { labels: [], parent: null } })
    const before = loadFixture(gh.root)
    expect(gh.correct('R607', '--file', '--retract').status).toBe(0)
    expect(readFileSync(path.join(gh.root, LOOP_FILE), 'utf8')).toBe(`${fixtureText('chains', LOOP_FILE)}\n\n${retracted}\n`)
    const after = parseLineage(loadFixture(gh.root), loadGithub())
    expect(after.errors).toEqual([])
    expect(after.nodes.find((node) => node.id === 'R609')).toMatchObject({ title: 'R607 retracted: correction plan #900', buildsOn: 'none', amends: ['R607'] })
    expect(edgeLines(after.edges.filter((edge) => edge.from === 'R609'))).toEqual(['R609 amends R607'])
    expect(check(after).findings).toEqual(check(parseLineage(before, loadGithub())).findings)

    // The plan's own records are not drafted again, and a second --file refuses before it files anything.
    const issues = [900, 901, 902].map((number) => ({
      number, title: `Correct R607 ${number === 900 ? '—' : '→'} …`, url: `https://github.com/mezivillager/hacer/issues/${number}`, body: 'Introduced by: R607\n',
    }))
    const replanned = correctionPlan(parseLineage(loadFixture(gh.root), [...loadGithub(), ...issues]), 'R607')
    expect([replanned.drafts.map((draft) => draft.id), replanned.planned]).toEqual([['#459', '#462'], 'R609'])
    const again = gh.correct('R607', '--file', '--amend')
    expect([again.status, again.stderr, callNames(again.calls)]).toEqual([1, 'correct: R607 already has a correction plan, R609 — nothing filed\n', ['pr list', 'issue list']])
    // The status is the flag's, and only one: without it, or with both, --file stops before any gh call.
    for (const flags of [[], ['--retract', '--amend']]) {
      const refused = withGhStub().correct('R607', '--file', ...flags)
      expect([refused.status, refused.stdout, refused.calls]).toEqual([2, '', []])
      expect(refused.stderr).toContain('correct --file needs one of --retract or --amend')
    }
  })

  it('correct R607 --dry-run on the live repo prints one draft per node radius R607 reaches', () => {
    // The issue's verification command. Derived from `radius`, never pinned (R606): new rows naming R607 must not turn this red.
    const live = (...args) => spawnSync(process.execPath, ['scripts/lineage.mjs', ...args], { cwd: REPO, encoding: 'utf8' })
    const reached = live('radius', 'R607').stdout.trim().split('\n').slice(1)
      .filter((line) => !line.endsWith(' — see above')).map((line) => /[├└]─ (\S+) \(/.exec(line)[1])
    const run = live('correct', 'R607', '--dry-run')
    expect(run.status).toBe(0)
    const drafts = run.stdout.split('\n').filter((line) => line.startsWith('## Correct R607 → ')).map((line) => /^## Correct R607 → (\S+) — /.exec(line)[1])
    expect(drafts).toEqual(reached)
    expect(run.stdout.split('\n').filter((line) => line === 'Introduced by: R607')).toHaveLength(reached.length ? reached.length + 1 : 0)
  })
})
