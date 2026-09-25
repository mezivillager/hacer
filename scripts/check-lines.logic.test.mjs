import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { formatDecision, formatVerdict } from './browser-qa.logic.mjs'
import { CHECK_LINES, parseCheckLine, publishLine } from './check-lines.logic.mjs'
import { formatReport } from './layer-ratchet.logic.mjs'
import { evaluate, formatConsole } from './pr-hygiene.logic.mjs'
import { REQUIRED_CONTEXTS } from './required-checks.logic.mjs'

const read = (file) => readFileSync(path.join(import.meta.dirname, '..', file), 'utf8')

// Lines the three checks printed in real runs (`gh run view <run> --log`, 2026-09-24/25).
const REAL = {
  hygiene: 'HYGIENE: WARN reviewable=383 test=312 excluded=121 files=13 issue=#467', // run 36092745863, #501
  qa: 'BROWSER-QA: PASS suites=store passed=107 failed=0 flaky=0 skipped=0', // run 36007517554, #459 (critical)
  skipped: 'BROWSER-QA: skipped (no critical paths)', // run 36092745443
  ratchet: 'LAYER-RATCHET: 71 known violations (39 production edges · 25 test-only · 7 cycle edges in 3 cycles) · ' +
    '8 engine globals suppressed · 0 new', // run 36094324579, main at 1705e3b
}

/** publishLine's I/O, recorded: what it printed, and what it appended to which file. */
function recorder(env) {
  const printed = []
  const appended = []
  return { printed, appended, io: { env, log: (text) => printed.push(text), append: (file, text) => appended.push([file, text]) } }
}
const ACTIONS = { GITHUB_ACTIONS: 'true', GITHUB_STEP_SUMMARY: '/runner/_temp/step_summary' }

describe('publishLine', () => {
  it('in Actions, prints the report\'s first line as a ::notice titled by its prefix, and adds it to the job summary', () => {
    const { printed, appended, io } = recorder(ACTIONS)
    expect(publishLine(`${REAL.ratchet}\n  by rule: core-through-index 43`, io)).toBe(true)
    // The runner stores a notice as an annotation on the job's own check run (probe run 36094881378).
    expect(printed).toEqual([`::notice title=LAYER-RATCHET::${REAL.ratchet}`])
    expect(appended).toEqual([['/runner/_temp/step_summary', `\n\`${REAL.ratchet}\`\n`]])

    // No summary file: the notice alone.
    const bare = recorder({ GITHUB_ACTIONS: 'true' })
    expect(publishLine(REAL.skipped, bare.io)).toBe(true)
    expect([bare.printed, bare.appended]).toEqual([[`::notice title=BROWSER-QA::${REAL.skipped}`], []])
  })

  it('writes nothing outside Actions, or for a line that is not a check\'s — a local `pnpm run lint` prints what it did', () => {
    for (const [env, line] of [[{}, REAL.hygiene], [{ ...ACTIONS, GITHUB_ACTIONS: 'false' }, REAL.hygiene], [ACTIONS, 'no prefix']]) {
      const { printed, appended, io } = recorder(env)
      expect(publishLine(line, io)).toBe(false)
      expect([printed, appended]).toEqual([[], []])
    }
  })

  it('escapes the message as the runner decodes it, so the line stays one notice and reads back as printed', () => {
    const { printed, io } = recorder(ACTIONS)
    publishLine('HYGIENE: FAIL 100%0A::error::x\rsecond', io)
    expect(printed).toEqual(['::notice title=HYGIENE::HYGIENE: FAIL 100%250A::error::x%0Dsecond'])
  })
})

describe('parseCheckLine', () => {
  it('reads the lines the checks printed in real runs: a verdict and the numbers', () => {
    expect(parseCheckLine(REAL.hygiene)).toEqual({ verdict: 'WARN', fields: { reviewable: 383, test: 312, excluded: 121, files: 13, issue: '#467' } })
    expect(parseCheckLine(REAL.qa)).toEqual({ verdict: 'PASS', fields: { suites: 'store', passed: 107, failed: 0, flaky: 0, skipped: 0 } })
    expect(parseCheckLine(REAL.skipped)).toEqual({ verdict: 'SKIPPED', fields: {} })
    // LAYER-RATCHET's line has no verdict word: it fails on a new violation, as layer-ratchet.mjs exits 1 on one.
    expect(parseCheckLine(REAL.ratchet)).toEqual({ verdict: 'PASS', fields: { known: 71, new: 0 } })
  })

  it('reads what the formatters print today, so a format the reader cannot follow fails here and not in the snapshot', () => {
    const files = [{ filename: 'scripts/a.mjs', additions: 250, deletions: 10, status: 'modified' },
      { filename: 'scripts/a.test.mjs', additions: 40, deletions: 0, status: 'added' }]
    const hygiene = formatConsole(evaluate({ body: 'Fixes #477', author: 'mezivillager', labels: [], files, gitattributes: '' }))
    expect(parseCheckLine(hygiene.split('\n')[0])).toEqual({
      verdict: 'WARN', fields: { reviewable: 260, test: 40, excluded: 0, files: 1, issue: '#477', linked: 'fixes' },
    })
    expect(parseCheckLine(formatVerdict(['store'], { passed: 0, failed: 0, flaky: 0, skipped: 0, errors: 0 }))).toEqual({
      verdict: 'FAIL', fields: { suites: 'store', passed: 0, failed: 0, flaky: 0, skipped: 0 },
    })
    expect(parseCheckLine(formatDecision({ critical: false, reasons: [], suites: [] }))).toEqual({ verdict: 'SKIPPED', fields: {} })
    const added = [{ rule: 'engine-no-ui', from: 'src/core/a.ts', to: 'src/components/b.ts' }]
    const ratchet = formatReport({ known: 1, added: 1, production: 1, testOnly: 0, cycleEdges: 0, cycles: 0,
      byRule: { 'engine-no-state': 1 }, addedViolations: added, suppressedGlobals: 0, ok: false })
    expect(parseCheckLine(ratchet.split('\n')[0])).toEqual({ verdict: 'FAIL', fields: { known: 1, new: 1 } })
  })

  it('claims nothing it cannot read: no line, or one of another shape, has no verdict', () => {
    expect(parseCheckLine(null)).toEqual({ verdict: null, fields: {} })
    expect(parseCheckLine('HYGIENE: ???')).toEqual({ verdict: null, fields: {} })
    expect(parseCheckLine('LAYER-RATCHET: unreadable baseline')).toEqual({ verdict: null, fields: {} })
  })
})

describe('the three required checks', () => {
  it('each publishes its one line: a prefix per required context, and each script publishes what it prints', () => {
    expect(Object.keys(CHECK_LINES).sort()).toEqual([...REQUIRED_CONTEXTS].sort())
    for (const script of ['scripts/pr-hygiene.mjs', 'scripts/browser-qa.mjs', 'scripts/layer-ratchet.mjs']) {
      expect(read(script)).toMatch(/^import \{[^}]*\bpublishLine\b[^}]*\} from '\.\/check-lines\.logic\.mjs'$/m)
      expect(read(script)).toMatch(/\bpublishLine\(/)
    }
  })

  it('publishing needs no permission: the workflows that run them still grant no write', () => {
    for (const workflow of ['pr-hygiene.yml', 'browser-qa.yml', 'ci.yml']) {
      const source = read(`.github/workflows/${workflow}`)
      expect(source).toMatch(/^permissions:$/m)
      expect(source).not.toMatch(/^[ \t]+[a-z-]+:[ \t]*write\b/m)
    }
  })
})
