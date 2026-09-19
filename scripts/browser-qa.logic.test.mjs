import { describe, it, expect } from 'vitest'
import {
  CRITICAL_LABEL,
  CRITICAL_PATHS,
  SEVERITY_LABELS,
  decide,
  formatDecision,
  formatSummary,
  formatVerdict,
  grepFor,
  isCritical,
  isCriticalPath,
  suitesFor,
  summarizeResults,
  verdict,
} from './browser-qa.logic.mjs'

/** A Playwright JSON report (`--reporter=json`) reduced to what the verdict reads. */
function report(stats = {}, errors = []) {
  return { stats: { expected: 0, unexpected: 0, flaky: 0, skipped: 0, ...stats }, errors }
}

describe('constants', () => {
  it('carries the ADR-0016 definition of critical: the PR changes the UI (amended 2026-09-19, #282)', () => {
    expect(CRITICAL_PATHS).toEqual([
      'src/components/',
      'src/App.tsx',
      'src/gates/',
      'src/nodes/',
      'src/store/',
      'src/utils/',
      'src/styles/',
      'index.html',
      'e2e/',
      'playwright.config.ts',
      'src/surfaces/',
    ])
    expect(CRITICAL_LABEL).toBe('critical')
    expect(SEVERITY_LABELS).toEqual(['sev:high', 'sev:critical'])
  })
})

describe('isCriticalPath', () => {
  it.each([
    'src/components/ui/Toolbar.tsx',
    'src/components/canvas/Scene.tsx',
    'src/gates/components/NandGate.tsx',
    'src/nodes/InputNode.tsx',
    'src/App.tsx',
    'src/store/actions/gates/addGate.ts',
    'src/store/types.ts',
    'src/store/circuitStore.ts',
    'src/utils/wiringScheme/approach.ts',
    'src/styles/globals.css',
    'index.html',
    'e2e/specs/gates/gate-types.ui.spec.ts',
    'playwright.config.ts',
    'src/surfaces/2d/Board.tsx',
  ])('matches %s', (filename) => {
    expect(isCriticalPath(filename)).toBe(true)
  })

  it.each([
    'src/core/hdl/parser.ts',
    'src/simulation/topologicalEval.ts',
    'src/App.test.tsx',
    'src/components.ts',
    'src/nodesLegacy/Old.tsx',
    'docs/decisions/0016-browser-qa-in-the-cloud.md',
    'docs/index.html',
    '.github/workflows/browser-qa.yml',
    'scripts/browser-qa.logic.mjs',
  ])('does not match %s', (filename) => {
    expect(isCriticalPath(filename)).toBe(false)
  })
})

describe('isCritical', () => {
  it('is true when any file is on a critical path', () => {
    expect(isCritical(['README.md', 'src/App.tsx'], [])).toBe(true)
  })

  it('is true on the critical label alone', () => {
    expect(isCritical(['docs/x.md'], ['critical'])).toBe(true)
  })

  it('is true on a sev:high or sev:critical fix alone', () => {
    expect(isCritical(['src/core/x.ts'], ['sev:high'])).toBe(true)
    expect(isCritical(['src/core/x.ts'], ['sev:critical'])).toBe(true)
  })

  it('is false for non-critical paths and unrelated labels', () => {
    expect(isCritical(['src/core/x.ts', 'docs/x.md'], ['risk:2', 'sev:low', 'critical-path', 'noncritical'])).toBe(
      false,
    )
  })

  it('is false for an empty PR', () => {
    expect(isCritical([], [])).toBe(false)
  })
})

describe('suitesFor', () => {
  it('is store only for the DOM shell, the store and the rest of the UI', () => {
    expect(suitesFor(['src/App.tsx'])).toEqual(['store'])
    expect(suitesFor(['src/store/actions/wires/addWire.ts'])).toEqual(['store'])
    expect(suitesFor(['src/components/ui/Toolbar.tsx'])).toEqual(['store'])
    expect(suitesFor(['src/utils/grid.ts', 'index.html'])).toEqual(['store'])
  })

  // Owner ruling 2026-09-19 (#282): 3D browser testing is far-future research (#284); `@ui`
  // runs only by hand through e2e.yml.
  it('never adds ui, even when canvas, gates, nodes or a @ui spec are touched', () => {
    expect(suitesFor(['src/components/canvas/Scene.tsx'])).toEqual(['store'])
    expect(suitesFor(['src/gates/components/NandGate.tsx'])).toEqual(['store'])
    expect(suitesFor(['docs/x.md', 'src/nodes/InputNode.tsx'])).toEqual(['store'])
    expect(suitesFor(['e2e/specs/gates/gate-types.ui.spec.ts'])).toEqual(['store'])
  })

  it('is store only when critical by label with no critical file', () => {
    expect(suitesFor([])).toEqual(['store'])
    expect(suitesFor(['src/core/x.ts'])).toEqual(['store'])
  })
})

describe('grepFor', () => {
  it('turns suites into a Playwright --grep pattern', () => {
    expect(grepFor(['store'])).toBe('@store')
    expect(grepFor(['store', 'ui'])).toBe('@store|@ui')
  })
})

describe('decide', () => {
  it('skips a PR with no critical paths and no label', () => {
    expect(decide(['docs/x.md', 'src/core/x.ts'], ['risk:1'])).toEqual({ critical: false, reasons: [], suites: [] })
  })

  it('names every reason it is critical, paths first', () => {
    const result = decide(['src/gates/A.tsx', 'src/App.tsx', 'docs/x.md'], ['critical', 'sev:high'])
    expect(result.critical).toBe(true)
    expect(result.reasons).toEqual(['path src/gates/A.tsx', 'path src/App.tsx', 'label critical', 'label sev:high'])
    expect(result.suites).toEqual(['store'])
  })
})

// `sev:*` lives on issues, not PRs: the runner resolves the body's Fixes/Closes/Resolves/Part of #n
// (pr-hygiene's findLinkedIssues) and passes each linked issue's labels in.
describe('linked issues', () => {
  const sevHigh223 = { number: 223, labels: ['bug', 'sev:high', 'agent-ready'] }

  // #223's own fix was in src/utils, which is a critical path since #282; src/simulation stays off.
  it('makes a sev:high fix critical off the critical paths (a fix in src/simulation)', () => {
    expect(decide(['src/simulation/topologicalEval.ts'], ['project:bugs', 'risk:1'], [sevHigh223])).toEqual({
      critical: true,
      reasons: ['issue #223 sev:high'],
      suites: ['store'],
    })
    expect(isCritical(['src/simulation/topologicalEval.ts'], ['risk:1'], [sevHigh223])).toBe(true)
  })

  it('counts sev:critical and critical on a linked issue', () => {
    const issues = [
      { number: 1, labels: ['sev:critical'] },
      { number: 2, labels: ['critical'] },
    ]
    expect(decide(['docs/x.md'], [], issues).reasons).toEqual(['issue #1 sev:critical', 'issue #2 critical'])
  })

  it('ignores linked issues without those labels', () => {
    const issues = [{ number: 5, labels: ['bug', 'sev:low', 'risk:0'] }]
    expect(decide(['src/core/x.ts'], [], issues)).toEqual({ critical: false, reasons: [], suites: [] })
    expect(isCritical(['src/core/x.ts'], [], issues)).toBe(false)
  })

  it('lists paths, then the PR labels, then the linked issues', () => {
    expect(decide(['src/App.tsx'], ['critical'], [sevHigh223]).reasons).toEqual([
      'path src/App.tsx',
      'label critical',
      'issue #223 sev:high',
    ])
  })
})

describe('formatDecision', () => {
  it('prints the exact skip line', () => {
    expect(formatDecision(decide(['docs/x.md'], []))).toBe('BROWSER-QA: skipped (no critical paths)')
  })

  it('prints the suites and the reasons when critical', () => {
    expect(formatDecision(decide(['src/nodes/N.tsx'], ['critical']))).toBe(
      'BROWSER-QA: critical suites=store — path src/nodes/N.tsx, label critical',
    )
  })
})

describe('summarizeResults', () => {
  it('reads the counts from the report stats', () => {
    expect(summarizeResults(report({ expected: 40, unexpected: 1, flaky: 2, skipped: 3 }))).toEqual({
      passed: 40,
      failed: 1,
      flaky: 2,
      skipped: 3,
      errors: 0,
    })
  })

  it('counts top-level runner errors', () => {
    expect(summarizeResults(report({ expected: 1 }, [{ message: 'boom' }])).errors).toBe(1)
  })

  it('is all zeros for a missing or malformed report', () => {
    const zeros = { passed: 0, failed: 0, flaky: 0, skipped: 0, errors: 0 }
    expect(summarizeResults(null)).toEqual(zeros)
    expect(summarizeResults({})).toEqual(zeros)
    expect(summarizeResults({ stats: 'nope' })).toEqual(zeros)
  })
})

describe('verdict', () => {
  it('passes when every test passed, flaky included', () => {
    expect(verdict(summarizeResults(report({ expected: 40, flaky: 1 })))).toEqual({ verdict: 'PASS', reason: null })
  })

  it('fails on any failed test', () => {
    expect(verdict(summarizeResults(report({ expected: 40, unexpected: 1 })))).toEqual({
      verdict: 'FAIL',
      reason: '1 failed',
    })
  })

  it('fails when nothing ran — a vacuous run is not a pass', () => {
    expect(verdict(summarizeResults(report({ skipped: 5 })))).toEqual({ verdict: 'FAIL', reason: 'no tests ran' })
    expect(verdict(summarizeResults(null))).toEqual({ verdict: 'FAIL', reason: 'no tests ran' })
  })

  it('fails on runner errors even when the tests passed', () => {
    expect(verdict(summarizeResults(report({ expected: 3 }, [{}, {}])))).toEqual({
      verdict: 'FAIL',
      reason: '2 runner errors',
    })
  })
})

describe('formatVerdict', () => {
  it('prints one greppable BROWSER-QA line', () => {
    const summary = summarizeResults(report({ expected: 40, flaky: 1, skipped: 2 }))
    expect(formatVerdict(['store', 'ui'], summary)).toBe(
      'BROWSER-QA: PASS suites=store,ui passed=40 failed=0 flaky=1 skipped=2',
    )
  })

  it('appends the reason on FAIL', () => {
    const summary = summarizeResults(report({ expected: 4, unexpected: 2 }))
    expect(formatVerdict(['store'], summary)).toBe(
      'BROWSER-QA: FAIL suites=store passed=4 failed=2 flaky=0 skipped=0 (2 failed)',
    )
  })
})

describe('formatSummary', () => {
  it('renders the decision and the verdict as a job summary', () => {
    const decision = decide(['src/App.tsx'], [])
    const summary = summarizeResults(report({ expected: 10 }))
    const md = formatSummary(decision, summary)
    expect(md).toContain('## browser-qa: PASS')
    expect(md).toContain('| store |')
    expect(md).toContain('path src/App.tsx')
    expect(md).toContain('| 10 | 0 | 0 | 0 |')
  })

  it('renders the skip without a verdict', () => {
    const md = formatSummary(decide(['docs/x.md'], []))
    expect(md).toContain('## browser-qa: skipped')
    expect(md).toContain('no critical paths')
    expect(md).not.toContain('PASS')
  })
})
