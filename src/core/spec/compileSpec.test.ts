import { describe, expect, it } from 'vitest'
import { getBuiltinChipRegistry } from '../chips/appRegistry'
import { DEFAULT_MAX_DEPTH, evaluateChipWithCtx } from '../chips/evaluateChip'
import { compileHDL, type CompiledEvaluator, type EvalContext } from '../hdl/compiler'
import { parseHDL } from '../hdl/parser'
import type { HDLSlice } from '../hdl/types'
import { compileSpec, type CompileSpecInput } from './compileSpec'
import { parseSpec } from './parseSpec'
import { SPEC_SCHEMA_VERSION } from './types'
import type { CircuitSpec, Net, Part, PartId, Port, Ref, SpecDiagnostic } from './types'

const chips = getBuiltinChipRegistry()
const ctx: EvalContext = { registry: chips, depth: 0, maxDepth: DEFAULT_MAX_DEPTH, evalChip: evaluateChipWithCtx }

const passThrough = (width: number): string =>
  width === 1 ? 'CHIP P { IN a; OUT out; PARTS: wire out = a; }' : `CHIP P { IN a[${width}]; OUT out[${width}]; PARTS: wire out = a; }`
const OUT_TO_OUT = 'CHIP V7 { IN a; OUT o1, o2; PARTS: Not(in=a, out=o1); wire o2 = o1; }'
const CHAIN = 'CHIP C { IN a; OUT x, y, z; PARTS: wire x = y; wire y = z; wire z = a; }'
const ONE_BIT = 'CHIP V2 { IN a; OUT out[2], any; PARTS: Not(in=a, out=out[1]); wire out[0] = a; Or(a=out[0], b=out[1], out=any); }'
const MIXED = 'CHIP M { IN a; OUT out[2], y; PARTS: Not(in=a, out=out[1]); DMux4Way(in=true, sel=out, b=y); wire out[0] = a; }'
const STRADDLE = 'CHIP S { IN s[2]; OUT out[4], y[2]; PARTS: wire out[0..1] = s; Not(in=s[0], out=out[2]); Not(in=s[1], out=out[3]); Not16(in[0..1]=out[1..2], out[0..1]=y); }'
const TWO_DRIVERS = 'CHIP C { IN a, b; OUT out; PARTS: Not(in=a, out=out); Not(in=b, out=out); }'
const C8 = 'CHIP C8 { IN a, b; OUT out; PARTS: Not(in=a, in=b, out=out); }'
const SLICED_UNDRIVEN = 'CHIP U { IN a; OUT out[2], y; PARTS: Not(in=a, out=out[1]); Not(in=out[0], out=y); }'
const WIDTH = 'CHIP W { IN a[16]; OUT out; PARTS: Not(in=a, out=out); }'
const LOOP = 'CHIP L { IN a; OUT out; PARTS: Nand(a=a, b=t, out=u); Not(in=u, out=t); And(a=u, b=u, out=out); }'
const NOT_HDL = 'this is not HDL'

const port = (name: string, width = 1): Port => ({ name, width })
const partPin = (partId: PartId, pin: string): Ref => ({ kind: 'part-pin', partId, pin })
const chipIn = (pin: string, slice?: HDLSlice): Ref => ({ kind: 'chip-in', pin, ...(slice && { slice }) })
const chipOut = (pin: string, slice?: HDLSlice): Ref => ({ kind: 'chip-out', pin, ...(slice && { slice }) })
const doc = (name: string, ins: Port[], outs: Port[], parts: Part[], nets: Net[]): CircuitSpec => ({ schemaVersion: SPEC_SCHEMA_VERSION, name, ins, outs, parts, nets })

const PART_AND_ALIAS = doc('V4', [port('a')], [port('out')], [{ id: 'p1', chip: 'Not' }], [
  { id: 'a', driver: chipIn('a'), sinks: [partPin('p1', 'in')] },
  { id: 'out[0]', driver: partPin('p1', 'out'), sinks: [chipOut('out', { start: 0, end: 0 })] },
  { id: 'out', driver: chipIn('a'), sinks: [chipOut('out')] },
])
const REPEATED_ID = doc('R', [port('a'), port('b')], [port('out')], [{ id: 'p1', chip: 'Not' }, { id: 'p2', chip: 'Not' }], [
  { id: 'a', driver: chipIn('a'), sinks: [partPin('p1', 'in')] },
  { id: 'b', driver: chipIn('b'), sinks: [partPin('p2', 'in')] },
  { id: 'out', driver: partPin('p1', 'out'), sinks: [chipOut('out')] },
  { id: 'out', driver: partPin('p2', 'out'), sinks: [chipOut('out')] },
])
const REPEATED_READ = doc('T', [port('a')], [port('out')], [{ id: 'p1', chip: 'Not' }, { id: 'p2', chip: 'Not' }], [
  { id: 'a', driver: chipIn('a'), sinks: [partPin('p1', 'in')] },
  { id: 't', driver: partPin('p1', 'out'), sinks: [] },
  { id: 't', driver: null, sinks: [partPin('p2', 'in')] },
  { id: 'out', driver: partPin('p2', 'out'), sinks: [chipOut('out')] },
])
const WRITES_IN = doc('E1', [port('a', 2)], [port('out')], [{ id: 'p1', chip: 'Not' }], [
  { id: 'a[0]', driver: chipIn('a', { start: 1, end: 1 }), sinks: [partPin('p1', 'in')] },
  { id: 'out', driver: partPin('p1', 'out'), sinks: [chipOut('out')] },
])
const WRITES_INTERNAL = doc('E2', [port('a')], [port('out')], [{ id: 'p1', chip: 'Not' }], [
  { id: 't', driver: chipIn('a'), sinks: [partPin('p1', 'in')] },
  { id: 'out', driver: partPin('p1', 'out'), sinks: [chipOut('out')] },
])
const READS_NO_PORT = doc('E3', [port('a')], [port('out')], [], [{ id: 'out', driver: chipIn('zz'), sinks: [chipOut('out')] }])
const WIDTH_ALIAS = doc('E4', [port('a', 2)], [port('out')], [], [{ id: 'out', driver: chipIn('a'), sinks: [chipOut('out')] }])
const UNDRIVEN_ROOT = 'CHIP F { IN a; OUT o0, o2, y; PARTS: wire o2 = o0; Not(in=o2, out=y); }'
const UNREAD_ROOT = 'CHIP F { IN a; OUT o0, o2; PARTS: wire o2 = o0; }'
const TWO_CYCLE = doc('X', [port('a')], [port('x'), port('y')], [], [
  { id: 'x', driver: chipOut('y'), sinks: [chipOut('x')] },
  { id: 'y', driver: chipOut('x'), sinks: [chipOut('y')] },
])
const SELF_CYCLE = doc('X', [port('a')], [port('x')], [], [{ id: 'x', driver: chipOut('x'), sinks: [chipOut('x')] }])
const WIDE_TRUE = 'CHIP A { IN a[16]; OUT out[16]; PARTS: And16(a=a, b=true, out=out); }'
const TRUE: Ref = { kind: 'constant', value: true }
const FALSE: Ref = { kind: 'constant', value: false }
const AND_WITH = (driver: Ref | null): CircuitSpec => doc('K', [port('a')], [port('out')], [{ id: 'p1', chip: 'And' }], [
  { id: 'a', driver: chipIn('a'), sinks: [partPin('p1', 'a')] },
  { id: 'true', driver, sinks: [partPin('p1', 'b')] },
  { id: 'out', driver: partPin('p1', 'out'), sinks: [chipOut('out')] },
])
const CONSTANT_ON_OUT = doc('K', [port('a')], [port('out')], [], [{ id: 'out', driver: TRUE, sinks: [chipOut('out')] }])

function documentOf(source: string): CircuitSpec {
  const { doc: parsed, diagnostics } = parseSpec(source)
  if (parsed === null) throw new Error(diagnostics.map((d) => d.message).join('; '))
  return parsed
}

function compiled(source: string): CompiledEvaluator {
  const result = compileSpec(parseSpec(source), chips)
  if (!result.success) throw new Error(result.diagnostics.map((d) => d.message).join('; '))
  return result.evaluate
}

const run = (source: string, inputs: Record<string, number>): Record<string, number> => compiled(source)(Object.freeze({ ...inputs }), ctx)

function refusal(input: CompileSpecInput): SpecDiagnostic[] {
  const result = compileSpec(input, chips)
  if (result.success) throw new Error('compiled')
  return result.diagnostics
}

function engineMessages(source: string): string[] {
  const parsed = parseHDL(source)
  if (!parsed.success) throw new Error(parsed.errors.map((e) => e.message).join('; '))
  const result = compileHDL(parsed.chip, chips)
  return result.success ? [] : result.errors.map((e) => e.message)
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const inner of Object.values(value)) deepFreeze(inner)
  }
  return value
}

describe('compileSpec — the §1.5 lowering', () => {
  it('a pass-through evaluates out = a at widths 1, 4, 8 and 16', () => {
    for (const width of [1, 4, 8, 16]) {
      const evaluate = compiled(passThrough(width))
      const all = 2 ** width - 1
      for (const a of [0, 1, all, 0b1010 & all, all ^ 1]) {
        expect({ width, a, out: evaluate({ a }, ctx).out }).toEqual({ width, a, out: a })
      }
    }
  })

  it('an OUT→OUT alias is written back after its root', () => {
    for (const a of [0, 1]) expect(run(OUT_TO_OUT, { a })).toEqual({ o1: 1 - a, o2: 1 - a })
  })

  it('a three-long alias chain resolves', () => {
    for (const a of [0, 1]) expect(run(CHAIN, { a })).toEqual({ x: a, y: a, z: a })
  })

  it('a part reading one alias bit reads the root', () => {
    for (const a of [0, 1]) expect(run(ONE_BIT, { a })).toEqual({ out: ((1 - a) << 1) | a, any: 1 })
  })

  it('a whole read of a mixed signal is split on the part\'s own pin', () => {
    for (const a of [0, 1]) expect(run(MIXED, { a })).toEqual({ out: ((1 - a) << 1) | a, y: a })
  })

  it('a wide literal reads all ones of its pin: And16(a=a, b=true) gives out = a', () => {
    for (const a of [0, 1, 0x5555, 0xaaaa, 0x8000, 0xffff]) expect(run(WIDE_TRUE, { a })).toEqual({ out: a })
  })

  it('a constant driver built without a parse compiles on its own literal\'s net', () => {
    const result = compileSpec({ doc: AND_WITH(TRUE), diagnostics: [] }, chips)
    expect(result.success && [0, 1].map((a) => result.evaluate({ a }, ctx))).toEqual([{ out: 0 }, { out: 1 }])
  })

  it('a read straddling an alias boundary is split', () => {
    for (let s = 0; s < 4; s++) {
      const [s0, s1] = [s & 1, s >> 1]
      expect({ s, ...run(STRADDLE, { s }) }).toEqual({ s, out: s | ((1 - s0) << 2) | ((1 - s1) << 3), y: (1 - s1) | (s0 << 1) })
    }
  })
})

describe('compileSpec — refusals (§1.1, §1.8)', () => {
  it('refuses two drivers on one net, with both drivers in the message', () => {
    expect(refusal(parseSpec(TWO_DRIVERS))).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'multiple-drivers', severity: 'error', message: expect.stringMatching(/p1\.out.*p2\.out/) })]),
    )
  })

  it('refuses a part and an alias on one bit, naming both, when no parse diagnostics are given', () => {
    const found = refusal({ doc: PART_AND_ALIAS, diagnostics: [] })
    expect(found).toEqual([expect.objectContaining({ code: 'multiple-drivers', severity: 'error' })])
    expect(found[0].message).toContain('p1.out')
    expect(found[0].message).toContain('a (net "out")')
  })

  it('refuses one pin bit bound by two nets, naming both', () => {
    const named = expect.objectContaining({ code: 'multiple-drivers', partId: 'p1', message: expect.stringMatching(/"a".*"b"/) })
    expect(refusal(parseSpec(C8))).toEqual(expect.arrayContaining([named]))
    expect(refusal({ doc: documentOf(C8), diagnostics: [] })).toEqual([named])
  })

  it('refuses a document with repeated net ids, naming the id', () => {
    expect(refusal({ doc: REPEATED_READ, diagnostics: [] })).toEqual([
      expect.objectContaining({ code: 'duplicate-net-id', severity: 'error', netId: 't', message: expect.stringContaining('"t"') }),
    ])
  })

  it('reports two drivers of one repeated id as multiple-drivers alone', () => {
    expect(refusal({ doc: REPEATED_ID, diagnostics: [] })).toEqual([
      expect.objectContaining({ code: 'multiple-drivers', severity: 'error', netId: 'out', message: expect.stringMatching(/p1\.out.*p2\.out/) }),
    ])
  })

  it('a refusal carries only error diagnostics, without the parse\'s note of what it dropped', () => {
    expect(refusal(parseSpec(TWO_DRIVERS))).toEqual([{ code: 'multiple-drivers', severity: 'error', netId: 'out', partId: 'p2', message: 'Signal "out" is driven by p1.out and p2.out' }])
  })

  it('refuses a net whose alias writes a chip IN or an internal signal, or reads no port, by name', () => {
    expect(refusal({ doc: WRITES_IN, diagnostics: [] })).toEqual([expect.objectContaining({ code: 'invalid-wire', netId: 'a[0]', message: expect.stringContaining('"a" is not a chip OUT') })])
    expect(refusal({ doc: WRITES_INTERNAL, diagnostics: [] })).toEqual([expect.objectContaining({ code: 'invalid-wire', netId: 't', message: expect.stringContaining('"t" is not a chip OUT') })])
    expect(refusal({ doc: READS_NO_PORT, diagnostics: [] })).toEqual([expect.objectContaining({ code: 'invalid-wire', netId: 'out', message: expect.stringContaining('"zz" is not a chip IN') })])
  })

  it('refuses an alias whose target and source differ in width', () => {
    expect(refusal({ doc: WIDTH_ALIAS, diagnostics: [] })).toEqual([expect.objectContaining({ code: 'invalid-wire', netId: 'out', message: 'wire out = a: target is 1 bits wide but its source is 2' })])
  })

  it('refuses a read of an alias whose root nothing drives, naming the signal the part bound', () => {
    expect(parseSpec(UNDRIVEN_ROOT).diagnostics.filter((d) => d.severity === 'error')).toEqual([])
    expect(refusal(parseSpec(UNDRIVEN_ROOT))).toEqual([expect.objectContaining({ code: 'undriven', severity: 'error', netId: 'o2', message: expect.stringMatching(/^Signal "o2" .*"o0"/) })])
    for (const a of [0, 1]) expect(run(UNREAD_ROOT, { a })).toEqual({ o0: 0, o2: 0 })
  })

  it('refuses an alias cycle with its members, and terminates', () => {
    expect(refusal({ doc: TWO_CYCLE, diagnostics: [] })).toEqual([expect.objectContaining({ code: 'alias-cycle', members: ['x', 'y', 'x'] })])
    expect(refusal({ doc: SELF_CYCLE, diagnostics: [] })).toEqual([expect.objectContaining({ code: 'alias-cycle', members: ['x', 'x'] })])
  })

  it('refuses a constant driver on any net but its own literal\'s, by name', () => {
    expect(refusal({ doc: CONSTANT_ON_OUT, diagnostics: [] })).toEqual([
      { code: 'invalid-wire', severity: 'error', netId: 'out', message: 'wire out = true: a constant drives only the net its own literal names' },
    ])
    expect(refusal({ doc: AND_WITH(FALSE), diagnostics: [] })).toEqual([
      { code: 'invalid-wire', severity: 'error', netId: 'true', message: 'wire true = false: a constant drives only the net its own literal names' },
    ])
  })

  it('refuses a true net with no driver, built without a parse, as undriven', () => {
    expect(refusal({ doc: AND_WITH(null), diagnostics: [] })).toEqual([
      { code: 'undriven', severity: 'error', netId: 'true', message: 'Signal "true" is read but nothing drives it' },
    ])
  })

  it('refuses a sliced read of bits nothing drives', () => {
    expect(refusal({ doc: documentOf(SLICED_UNDRIVEN), diagnostics: [] })).toEqual([expect.objectContaining({ code: 'undriven', severity: 'error', netId: 'out[0]' })])
  })

  it('refuses a parse result with no document, returning its diagnostics', () => {
    const parsed = parseSpec(NOT_HDL)
    expect(parsed.doc).toBeNull()
    expect(refusal(parsed)).toEqual(parsed.diagnostics)
  })

  it("an engine refusal is a 'compile' diagnostic with compileHDL's message", () => {
    for (const source of [WIDTH, LOOP]) {
      const messages = engineMessages(source)
      expect(messages).not.toEqual([])
      expect(refusal(parseSpec(source))).toEqual(messages.map((message) => ({ code: 'compile', severity: 'error', message })))
    }
  })

  it('never throws, and leaves the document it was given unchanged', () => {
    const sources = [passThrough(1), passThrough(16), OUT_TO_OUT, CHAIN, ONE_BIT, MIXED, STRADDLE, TWO_DRIVERS, C8, SLICED_UNDRIVEN, UNDRIVEN_ROOT, WIDTH, LOOP, NOT_HDL, WIDE_TRUE]
    for (const source of sources) {
      const parsed = parseSpec(source)
      const before = structuredClone(parsed)
      deepFreeze(parsed)
      expect(() => compileSpec(parsed, chips)).not.toThrow()
      expect(parsed).toEqual(before)
      expect(parseSpec(source)).toEqual(before)
    }
    const documents = [
      PART_AND_ALIAS, REPEATED_ID, REPEATED_READ, WRITES_IN, WRITES_INTERNAL, READS_NO_PORT, WIDTH_ALIAS, TWO_CYCLE, SELF_CYCLE, documentOf(C8), documentOf(SLICED_UNDRIVEN),
      CONSTANT_ON_OUT, AND_WITH(TRUE), AND_WITH(FALSE), AND_WITH(null),
    ]
    for (const document of documents) {
      const input = deepFreeze({ doc: structuredClone(document), diagnostics: [] })
      expect(() => compileSpec(input, chips)).not.toThrow()
      expect(input.doc).toEqual(document)
    }
  })
})

describe('compileSpec — an alias slice must fit its port (#371)', () => {
  const alias = (ins: Port[], outs: Port[], id: string, driver: Ref, sink: Ref): CompileSpecInput => ({ doc: doc('T', ins, outs, [], [{ id, driver, sinks: [sink] }]), diagnostics: [] })

  it.each([
    ['a target past the end of its OUT', alias([port('a')], [port('o', 2)], 'o[3]', chipIn('a'), chipOut('o', { start: 3, end: 3 })), 'o[3]', 'wire o[3] = a: sub-bus index out of range ("o" has width 2)'],
    ['a source past the end of its IN', alias([port('a', 2)], [port('o')], 'o', chipIn('a', { start: 5, end: 5 }), chipOut('o')), 'o', 'wire o = a[5]: sub-bus index out of range ("a" has width 2)'],
    ['a partial target that runs off its OUT', alias([port('a', 2)], [port('o', 2)], 'o[1..2]', chipIn('a'), chipOut('o', { start: 1, end: 2 })), 'o[1..2]', 'wire o[1..2] = a: sub-bus index out of range ("o" has width 2)'],
  ])('refuses %s, when no parse diagnostics are given', (_, input, netId, message) => {
    expect(refusal(input)).toEqual([{ code: 'invalid-wire', severity: 'error', netId, message }])
  })
})

describe('compileSpec — a chip-OUT sink sits on the net named for it (#855)', () => {
  const notInto = (id: string, sink: Ref, outs: Port[] = [port('out')]): CircuitSpec => doc('S', [port('a')], outs, [{ id: 'p1', chip: 'Not' }], [
    { id: 'a', driver: chipIn('a'), sinks: [partPin('p1', 'in')] },
    { id, driver: partPin('p1', 'out'), sinks: [sink] },
  ])
  const shapes: Array<[string, CircuitSpec, string, string]> = [
    ['a constant\'s net', doc('K', [port('a')], [port('out')], [], [{ id: 'true', driver: TRUE, sinks: [chipOut('out')] }]), 'true', 'Net "true" sinks chip OUT "out": only the net named "out" carries it'],
    ['a part-driven net named for another signal', notInto('t', chipOut('out')), 't', 'Net "t" sinks chip OUT "out": only the net named "out" carries it'],
    ['a net named for other bits of the OUT', notInto('out[0]', chipOut('out', { start: 1, end: 1 }), [port('out', 2)]), 'out[0]', 'Net "out[0]" sinks chip OUT "out[1]": only the net named "out[1]" carries it'],
    ['an alias named for another OUT', doc('A', [port('a')], [port('out'), port('y')], [], [{ id: 'out', driver: chipIn('a'), sinks: [chipOut('y')] }]), 'out', 'Net "out" sinks chip OUT "y": only the net named "y" carries it'],
    ['an OUT sink that names no chip OUT', notInto('zz', chipOut('zz')), 'zz', 'Net "zz" sinks "zz", which is not a chip OUT'],
  ]

  it.each(shapes)('refuses %s by name, rather than reading the OUT as 0', (_, document, netId, message) => {
    expect(refusal({ doc: document, diagnostics: [] })).toEqual([{ code: 'invalid-wire', severity: 'error', netId, message }])
  })

  it('never throws on them, and leaves each document unchanged', () => {
    for (const [, document] of shapes) {
      const input = deepFreeze({ doc: structuredClone(document), diagnostics: [] })
      expect(() => compileSpec(input, chips)).not.toThrow()
      expect(input.doc).toEqual(document)
    }
  })

  it('a part-driven net named for its OUT still compiles: out = not a', () => {
    const result = compileSpec({ doc: notInto('out', chipOut('out')), diagnostics: [] }, chips)
    expect(result.success && [0, 1].map((a) => result.evaluate({ a }, ctx))).toEqual([{ out: 1 }, { out: 0 }])
  })
})
