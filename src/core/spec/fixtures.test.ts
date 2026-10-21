// The first committed `.spec` fixture was the v1 boundary (ADR-0020 §1): v1 changes only through
// `migrate(1 → 2)`, so every v1 file here still reads, through it, as a v2 document.
import { describe, expect, it } from 'vitest'
import { getBuiltinChipRegistry } from '../chips/appRegistry'
import { DEFAULT_MAX_DEPTH, evaluateChipWithCtx } from '../chips/evaluateChip'
import { compileHDL, type CompiledEvaluator, type EvalContext } from '../hdl/compiler'
import { parseHDL } from '../hdl/parser'
import { compileSpec } from './compileSpec'
import { parseSpec } from './parseSpec'
import { printSpec } from './printSpec'
import type { CircuitSpec, Sidecar } from './types'

const V1 = Object.entries(import.meta.glob<string>('./fixtures/v1/*.spec', { query: '?raw', import: 'default', eager: true }))
const LITERALS = V1.find(([path]) => path.endsWith('/Literals.spec'))?.[1] ?? ''
const chips = getBuiltinChipRegistry()
const ctx: EvalContext = { registry: chips, depth: 0, maxDepth: DEFAULT_MAX_DEPTH, evalChip: evaluateChipWithCtx }

/** The v1 text with only its two version numbers moved. */
const asV2 = (text: string): string => text.replace(/^\/\/ hacer-spec 1\n/, '// hacer-spec 2\n').replace(/\n {2}"schemaVersion": 1,\n/, '\n  "schemaVersion": 2,\n')

function read(text: string): { doc: CircuitSpec; sidecar: Sidecar } {
  const result = parseSpec(text)
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([])
  if (result.doc === null) throw new Error('fixture refused')
  return result
}

function evaluator(compiled: { success: true; evaluate: CompiledEvaluator } | { success: false }): CompiledEvaluator {
  if (!compiled.success) throw new Error('did not compile')
  return compiled.evaluate
}

describe('the committed v1 .spec fixtures', () => {
  it('include real version-1 documents, one with a literal on a 1-bit pin and one on a 16-bit pin', () => {
    expect(V1.length).toBeGreaterThan(1)
    expect(V1.every(([, text]) => text.startsWith('// hacer-spec 1\n') && text.includes('"schemaVersion": 1,'))).toBe(true)
    expect(LITERALS).toContain('And(a=a, b=true, out=x);')
    expect(LITERALS).toContain('Not16(in=true, out=zeros);')
  })

  it.each(V1)('%s reads through migrate(1 → 2) as a v2 document, header and sidecar', (_path, text) => {
    const { doc, sidecar } = read(text)
    expect([doc.schemaVersion, sidecar.schemaVersion]).toEqual([2, 2])
    const literals = doc.nets.filter((n) => n.id === 'true' || n.id === 'false')
    expect(literals.map((n) => n.driver)).toEqual(literals.map((n) => ({ kind: 'constant', value: n.id === 'true' })))
  })

  it.each(V1)('%s prints with // hacer-spec 2 and sidecar schemaVersion 2, otherwise byte for byte', (_path, text) => {
    const { doc, sidecar } = read(text)
    expect(asV2(text)).not.toBe(text)
    expect(printSpec(doc, { sidecar })).toBe(asV2(text))
  })

  it('Literals.spec carries both constants, and evaluates as the HDL engine reads its v1 text, before and after', () => {
    expect(read(LITERALS).doc.nets.filter((n) => n.id === 'true' || n.id === 'false').map((n) => n.id).sort()).toEqual(['false', 'true'])
    const parsed = parseHDL(LITERALS)
    if (!parsed.success) throw new Error('the engine does not read the fixture')
    const engine = evaluator(compileHDL(parsed.chip, chips))
    const migrated = evaluator(compileSpec(parseSpec(LITERALS), chips))
    const printed = evaluator(compileSpec(parseSpec(asV2(LITERALS)), chips))
    for (const inputs of [{ a: 0, b: 0 }, { a: 0, b: 1 }, { a: 1, b: 0 }, { a: 1, b: 1 }]) {
      expect({ inputs, out: migrated(inputs, ctx) }).toEqual({ inputs, out: engine(inputs, ctx) })
      expect({ inputs, out: printed(inputs, ctx) }).toEqual({ inputs, out: engine(inputs, ctx) })
    }
    expect(engine({ a: 1, b: 0 }, ctx)).toEqual({ x: 1, y: 0, zeros: 0 })
  })
})
