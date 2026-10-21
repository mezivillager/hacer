import { describe, expect, it } from 'vitest'
import { getBuiltinChipRegistry } from '../chips/appRegistry'
import { DEFAULT_MAX_DEPTH, evaluateChipWithCtx } from '../chips/evaluateChip'
import { compileHDL, type EvalContext } from '../hdl/compiler'
import { parseHDL } from '../hdl/parser'
import { bindUnconnectedInputs, compileSpec, parseSpec, SPEC_SCHEMA_VERSION, type CircuitSpec, type PartId, type Ref } from './index'

const chips = getBuiltinChipRegistry()
const sink = (partId: PartId, pin: string): Ref => ({ kind: 'part-pin', partId, pin })
const FALSE: Ref = { kind: 'constant', value: false }
const ctx: EvalContext = { registry: chips, depth: 0, maxDepth: DEFAULT_MAX_DEPTH, evalChip: evaluateChipWithCtx }

function parsed(text: string): CircuitSpec {
  const { doc, diagnostics } = parseSpec(text, { chips })
  if (doc === null) throw new Error(diagnostics.map((d) => d.message).join('; '))
  return doc
}

function run(doc: CircuitSpec, inputs: Record<string, number>): { outputs: Record<string, number> } | { refused: string[] } {
  const compiled = compileSpec({ doc, diagnostics: [] }, chips)
  return compiled.success ? { outputs: compiled.evaluate(inputs, ctx) } : { refused: compiled.diagnostics.map((d) => d.message) }
}

describe('bindUnconnectedInputs', () => {
  it('binds a 16-bit pin no binding lands on to false: Not16(out=o) gives o=65535', () => {
    const doc = parsed('CHIP W { IN a; OUT o[16]; PARTS: Not16(out=o); }')
    expect(run(doc, { a: 0 })).toEqual({
      refused: ['Part "Not16" input pin "in" is not connected: the nand2tetris simulator reads it as 0; bind in=false to do the same'],
    })
    const result = bindUnconnectedInputs(doc, chips)
    expect(result.bound).toEqual([{ partId: 'p1', pin: 'in' }])
    expect(result.doc.nets.filter((n) => n.id === 'false')).toEqual([{ id: 'false', driver: FALSE, sinks: [sink('p1', 'in')] }])
    expect(run(result.doc, { a: 0 })).toEqual({ outputs: { o: 65535 } })
  })

  it('leaves a partially bound pin alone: Or8Way(in[0]=a, out=o) binds nothing and its other bits read 0', () => {
    const doc = parsed('CHIP P { IN a; OUT o; PARTS: Or8Way(in[0]=a, out=o); }')
    const result = bindUnconnectedInputs(doc, chips)
    expect(result).toEqual({ doc, bound: [] })
    expect([0, 1].map((a) => run(result.doc, { a }))).toEqual([{ outputs: { o: 0 } }, { outputs: { o: 1 } }])
  })

  it('leaves a sliced pin alone, because a whole-pin false beside the slice is refused', () => {
    const both = parseHDL('CHIP N { IN x[8]; OUT o[16]; PARTS: Not16(in=false, in[0..7]=x, out=o); }')
    const compiled = both.success ? compileHDL(both.chip, chips) : null
    expect(compiled?.success === false && compiled.errors.map((e) => e.message)).toEqual([
      'Line 1: Part "Not16" pin "in" bit 0 is bound by more than one connection',
    ])
    expect(bindUnconnectedInputs(parsed('CHIP N { IN x[8]; OUT o[16]; PARTS: Not16(in[0..7]=x, out=o); }'), chips).bound).toEqual([])
  })

  it('binds in part order, then pin order, onto the existing false net, and never changes its input', () => {
    const doc = parsed('CHIP M { IN a; OUT o, q; PARTS: And(a=false, out=o); Mux(a=a, out=q); }')
    const before = structuredClone(doc)
    const result = bindUnconnectedInputs(doc, chips)
    expect(doc).toEqual(before)
    expect(result.doc).not.toBe(doc)
    expect(result.bound).toEqual([{ partId: 'p1', pin: 'b' }, { partId: 'p2', pin: 'b' }, { partId: 'p2', pin: 'sel' }])
    expect(result.doc.nets.filter((n) => n.id === 'false')).toEqual([{
      id: 'false',
      driver: FALSE,
      sinks: [sink('p1', 'a'), sink('p1', 'b'), sink('p2', 'b'), sink('p2', 'sel')],
    }])
    expect(result.doc.nets.filter((n) => n.id !== 'false')).toEqual(doc.nets.filter((n) => n.id !== 'false'))
    expect([0, 1].map((a) => run(result.doc, { a }))).toEqual([{ outputs: { o: 0, q: 0 } }, { outputs: { o: 0, q: 1 } }])
  })

  it('skips a part whose chip the registry does not know', () => {
    const doc: CircuitSpec = {
      schemaVersion: SPEC_SCHEMA_VERSION,
      name: 'U',
      ins: [{ name: 'a', width: 1 }],
      outs: [{ name: 'o', width: 1 }],
      parts: [{ id: 'p1', chip: 'Mystery' }, { id: 'p2', chip: 'Not' }],
      nets: [{ id: 'o', driver: { kind: 'part-pin', partId: 'p2', pin: 'out' }, sinks: [{ kind: 'chip-out', pin: 'o' }] }],
    }
    expect(bindUnconnectedInputs(doc, chips).bound).toEqual([{ partId: 'p2', pin: 'in' }])
  })
})
