import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { cruise } from 'dependency-cruiser'
import { createRequire } from 'node:module'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  CONFIG_FILE,
  KNOWN_VIOLATIONS_FILE,
  countSuppressions,
  formatReport,
  summarise,
} from './layer-ratchet.logic.mjs'

const require = createRequire(import.meta.url)
const REPO_ROOT = path.resolve(import.meta.dirname, '..')
const FIXTURE_ROOT = path.join(REPO_ROOT, 'scripts/fixtures/layer-ratchet')

/** A violation in the shape dependency-cruiser's JSON reporter emits. */
const dep = (name, from, to, severity = 'ignore') => ({ type: 'dependency', from, to, rule: { name, severity } })
const cyc = (from, cycle, severity = 'ignore') => ({
  type: 'cycle',
  from,
  to: cycle[0],
  cycle: cycle.map((name) => ({ name })),
  rule: { name: 'no-circular', severity },
})
const result = (violations) => ({
  summary: {
    violations,
    error: violations.filter((v) => v.rule.severity === 'error').length,
    ignore: violations.filter((v) => v.rule.severity === 'ignore').length,
  },
})

// ── The rules themselves: a guard with no failing case is not a verified guard ─────────────────
//
// Cruises `scripts/fixtures/layer-ratchet` — a miniature repo with one deliberate violation of
// every rule — with the REAL `forbidden` array out of `.dependency-cruiser.cjs`. Only the plumbing
// is overridden: `baseDir` points the cruise at the fixture, and the stub packages give `three` and
// `react` something to resolve to, so the `node_modules/<pkg>` patterns are exercised as written.
describe('the rules in .dependency-cruiser.cjs', () => {
  /** @type {Set<string>} */
  let fired
  /** @type {string} */
  let sandbox

  beforeAll(async () => {
    sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'layer-ratchet-'))
    await fs.cp(FIXTURE_ROOT, sandbox, { recursive: true })
    for (const pkg of ['three', 'react']) {
      const dir = path.join(sandbox, 'node_modules', pkg)
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: pkg, version: '0.0.0', main: 'index.js' }))
      await fs.writeFile(path.join(dir, 'index.js'), 'module.exports = {}\n')
    }
    const config = require(path.join(REPO_ROOT, CONFIG_FILE))
    const cruised = await cruise(['src', 'e2e'], {
      ...config.options,
      baseDir: sandbox,
      ruleSet: { forbidden: config.forbidden },
      validate: true,
    })
    fired = new Set(cruised.output.summary.violations.map((v) => v.rule.name))
  }, 60_000)

  afterAll(async () => {
    await fs.rm(sandbox, { recursive: true, force: true })
  })

  it.each([
    ['engine-no-state', 'src/core importing src/store'],
    ['engine-no-ui', 'src/core importing src/components'],
    ['engine-no-ui-packages', 'src/core importing react'],
    ['state-no-ui', 'src/store importing src/components'],
    ['state-no-3d', 'src/store importing three'],
    ['src-no-e2e', 'src/core importing e2e/types'],
    ['no-circular', 'src/simulation/cycleA ↔ cycleB'],
  ])('catches %s (%s)', (rule) => {
    expect([...fired]).toContain(rule)
  })

  it('fires every rule it declares — no rule is dead', () => {
    const declared = require(path.join(REPO_ROOT, CONFIG_FILE)).forbidden.map((r) => r.name)
    expect([...fired].sort()).toEqual([...declared].sort())
  })
})

// ── The verdict: known violations pass, a new one fails ────────────────────────────────────────
describe('summarise', () => {
  it('passes when every violation is in the baseline', () => {
    const summary = summarise(result([dep('engine-no-state', 'src/core/a.ts', 'src/store/b.ts')]))
    expect(summary).toMatchObject({ known: 1, added: 0, ok: true })
  })

  it('fails on a violation that is not in the baseline, and names it', () => {
    const summary = summarise(
      result([
        dep('engine-no-state', 'src/core/a.ts', 'src/store/b.ts'),
        dep('engine-no-ui', 'src/core/new.ts', 'src/components/x.ts', 'error'),
      ]),
    )
    expect(summary).toMatchObject({ known: 1, added: 1, ok: false })
    expect(summary.addedViolations).toEqual([
      { rule: 'engine-no-ui', from: 'src/core/new.ts', to: 'src/components/x.ts' },
    ])
  })

  it('separates production edges from test-only ones', () => {
    const summary = summarise(
      result([
        dep('engine-no-state', 'src/simulation/truthTable.ts', 'src/store/types.ts'),
        dep('engine-no-state', 'src/simulation/truthTable.test.ts', 'src/store/types.ts'),
        dep('state-no-ui', 'src/store/a.spec.tsx', 'src/components/x.ts'),
        dep('state-no-3d', 'src/test/helpers.ts', 'node_modules/three/build/three.cjs'),
      ]),
    )
    expect(summary).toMatchObject({ production: 1, testOnly: 3 })
  })

  // dependency-cruiser reports one row per cyclic edge, so the audit's 7-file store↔core cycle is
  // 8 rows. Two rows that share a module are the same strongly-connected component, so the count
  // the plan tracks stays comparable with the audit's Tarjan count (REPORT.md §2).
  it('collapses cycle rows that share a module into one cycle', () => {
    const summary = summarise(
      result([
        cyc('src/core/serialization/deserialize.ts', ['src/store/gateActions.ts', 'src/store/circuitStore.ts', 'src/core/serialization/index.ts', 'src/core/serialization/deserialize.ts']),
        cyc('src/core/serialization/index.ts', ['src/core/serialization/deserialize.ts', 'src/store/circuitStore.ts', 'src/core/serialization/index.ts']),
        cyc('src/gates/common/BaseGate.tsx', ['src/gates/common/index.ts', 'src/gates/common/BaseGate.tsx']),
      ]),
    )
    expect(summary).toMatchObject({ cycleEdges: 3, cycles: 2 })
  })

  it('counts each rule, so a regression can be attributed', () => {
    const summary = summarise(
      result([
        dep('engine-no-state', 'src/core/a.ts', 'src/store/b.ts'),
        dep('engine-no-state', 'src/core/c.ts', 'src/store/b.ts'),
        dep('state-no-ui', 'src/store/d.ts', 'src/components/e.ts'),
      ]),
    )
    expect(summary.byRule).toEqual({ 'engine-no-state': 2, 'state-no-ui': 1 })
  })
})

// ── The globals half, which dependency-cruiser cannot see ──────────────────────────────────────
describe('countSuppressions', () => {
  it('sums the ESLint suppression counts for console.* and DOM globals in the engine', () => {
    const text = JSON.stringify({
      'src/utils/wiringScheme/crossing.ts': { 'no-console': { count: 26 } },
      'src/core/testing/chipCompletion.ts': { 'no-restricted-globals': { count: 2 } },
    })
    expect(countSuppressions(text)).toBe(28)
  })

  it('treats a missing or unreadable file as zero rather than throwing', () => {
    expect(countSuppressions(null)).toBe(0)
    expect(countSuppressions('{oops')).toBe(0)
  })
})

describe('formatReport', () => {
  it('prints one greppable metric line with the counts the plan tracks', () => {
    const report = formatReport(
      summarise(result([dep('engine-no-state', 'src/core/a.ts', 'src/store/b.ts')]), { suppressedGlobals: 35 }),
    )
    expect(report.split('\n')[0]).toBe(
      'LAYER-RATCHET: 1 known violation (1 production edge · 0 test-only · 0 cycle edges in 0 cycles) · 35 engine globals suppressed · 0 new',
    )
  })

  it('names every new violation and how to fix it, never how to silence it', () => {
    const report = formatReport(
      summarise(result([dep('engine-no-ui', 'src/core/new.ts', 'src/components/x.ts', 'error')])),
    )
    expect(report).toContain('engine-no-ui')
    expect(report).toContain('src/core/new.ts -> src/components/x.ts')
    expect(report).not.toContain(KNOWN_VIOLATIONS_FILE)
  })
})
