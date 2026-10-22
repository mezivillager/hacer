import { describe, expect, it, vi } from 'vitest'
import { getBuiltinChipRegistry } from '../chips/appRegistry'
import { combineRegistries } from '../chips/combineRegistries'
import { evaluateChip } from '../chips/evaluateChip'
import { createChipRegistry, type ChipRegistry } from '../chips/registry'
import type { ChipDefinition, ChipPin } from '../chips/types'
import * as compilerModule from '../hdl/compiler'
import { compileHDL, hdlChipDefinition } from '../hdl/compiler'
import { parseHDL } from '../hdl/parser'
import type { HDLChip } from '../hdl/types'
import { compileSpec, type CompileSpecResult } from './compileSpec'
import { parseSpec } from './parseSpec'

function withBuiltins(): ChipRegistry {
  const registry = createChipRegistry()
  for (const chip of getBuiltinChipRegistry().list()) registry.register(chip)
  return registry
}

function specChip(source: string, registry: ChipRegistry): ChipDefinition {
  const result = compileSpec(parseSpec(source, { chips: registry }), registry)
  if (!result.success) throw new Error(result.diagnostics.map((d) => d.message).join('; '))
  return result.chip
}

function register(registry: ChipRegistry, ...sources: string[]): ChipRegistry {
  for (const source of sources) registry.register(specChip(source, registry))
  return registry
}

/** A 'circuit' definition taken from the parse alone, so it is registered without being compiled. */
function uncompiled(source: string, registry: ChipRegistry): ChipDefinition {
  const { doc } = parseSpec(source, { chips: registry })
  if (doc === null) throw new Error(`no document for ${source}`)
  return { name: doc.name, inputs: doc.ins.map((p) => ({ ...p })), outputs: doc.outs.map((p) => ({ ...p })), implementation: { type: 'circuit', spec: doc } }
}

const P = 'CHIP P { IN a; OUT out; PARTS: wire out = a; }'
const Q = 'CHIP Q { IN x; OUT y; PARTS: P(a=x, out=y); }'
const R = 'CHIP R { IN x; OUT z; PARTS: Q(x=x, y=t); Not(in=t, out=z); }'
const FOO_NOT = 'CHIP Foo { IN a; OUT out; PARTS: Not(in=a, out=out); }'
const FOO_WIRE = 'CHIP Foo { IN a; OUT out; PARTS: wire out = a; }'
const BAR = 'CHIP Bar { IN a; OUT out; PARTS: Foo(a=a, out=out); }'
const SELF = 'CHIP P { IN a; OUT out; PARTS: P(a=a, out=out); }'

const run = (registry: ChipRegistry, name: string, inputs: Record<string, number>): Record<string, number> => {
  const chip = registry.get(name)
  if (!chip) throw new Error(`${name} is not registered`)
  return evaluateChip(chip, inputs, registry)
}

describe('compileSpec — registration and nesting', () => {
  it('a registered spec is a part another spec can name', () => {
    const registry = register(withBuiltins(), 'CHIP Inv { IN x; OUT y; PARTS: Nand(a=x, b=x, out=y); }', 'CHIP Buf { IN x; OUT y; PARTS: Inv(x=x, y=t); Inv(x=t, y=y); }')
    expect(registry.get('Buf')?.implementation.type).toBe('circuit')
    for (const x of [0, 1]) expect(run(registry, 'Buf', { x })).toEqual({ y: x })
  })

  it('three levels of specs with a pass-through at every boundary evaluate', () => {
    const registry = register(withBuiltins(), P, Q, R)
    for (const x of [0, 1]) {
      expect(run(registry, 'Q', { x })).toEqual({ y: x })
      expect(run(registry, 'R', { x })).toEqual({ z: 1 - x })
    }
  })

  it('an edited spec registered in a fresh registry changes what its unchanged dependents evaluate', () => {
    const before = register(withBuiltins(), FOO_NOT)
    const bar = specChip(BAR, before)
    before.register(bar)
    const after = register(withBuiltins(), FOO_WIRE)
    after.register(bar)
    expect(evaluateChip(bar, { a: 1 }, before)).toEqual({ out: 0 })
    expect(evaluateChip(bar, { a: 1 }, after)).toEqual({ out: 1 })
    expect(evaluateChip(bar, { a: 0 }, before)).toEqual({ out: 1 })
  })

  it('a spec that names itself as a part is refused by name', () => {
    const registry = register(withBuiltins(), P)
    const result = compileSpec(parseSpec(SELF, { chips: registry }), registry)
    expect(result).toEqual({ success: false, diagnostics: [{ code: 'compile', severity: 'error', message: 'Cannot use chip P to implement itself' }] })

    const parsed = parseSpec(SELF, { chips: registry })
    if (parsed.doc === null) throw new Error('SELF did not parse')
    const fresh = withBuiltins()
    const self: ChipDefinition = { name: 'P', inputs: [{ name: 'a', width: 1 }], outputs: [{ name: 'out', width: 1 }], implementation: { type: 'circuit', spec: parsed.doc } }
    fresh.register(self)
    expect(() => evaluateChip(self, { a: 1 }, fresh)).toThrow('Cannot use chip P to implement itself')
  })
})

describe('compileSpec — a part cycle through the registry (#816)', () => {
  const A_FROM_B = 'CHIP A { IN a; OUT out; PARTS: B(a=a, out=out); }'
  const B_FROM_A = 'CHIP B { IN a; OUT out; PARTS: A(a=a, out=out); }'
  const refused = { success: false, diagnostics: [{ code: 'compile', severity: 'error', message: 'Cannot use chip A to implement itself through B' }] }

  it("refuses two 'circuit' chips that use each other, naming both", () => {
    const registry = withBuiltins()
    registry.register(specChip(A_FROM_B, register(withBuiltins(), 'CHIP B { IN a; OUT out; PARTS: wire out = a; }')))
    registry.register(uncompiled(B_FROM_A, registry))
    expect(registry.get('B')?.implementation.type).toBe('circuit')
    expect(compileSpec(parseSpec(A_FROM_B, { chips: registry }), registry)).toEqual(refused)
  })

  it("refuses a 'circuit' A whose 'hdl' part B uses A, naming both", () => {
    const registry = withBuiltins()
    registry.register({ name: 'B', inputs: [{ name: 'a', width: 1 }], outputs: [{ name: 'out', width: 1 }], implementation: { type: 'hdl', source: B_FROM_A } })
    registry.register(uncompiled(A_FROM_B, registry))
    expect(compileSpec(parseSpec(A_FROM_B, { chips: registry }), registry)).toEqual(refused)
  })
})

describe('compileSpec — a registered part that does not compile refuses the spec, naming the chain (#821)', () => {
  const FOO_B = 'CHIP Foo { IN b; OUT out; PARTS: Not(in=b, out=out); }'
  const INN = 'CHIP Inn { IN x; OUT y; PARTS: Foo(a=x, out=y); }'
  const MID = 'CHIP Mid { IN x; OUT y; PARTS: Inn(x=x, y=y); }'
  const OUTER = 'CHIP Outer { IN a; OUT o; PARTS: Inn(x=a, y=o); }'
  const XY = { inputs: [{ name: 'x', width: 1 }], outputs: [{ name: 'y', width: 1 }] }
  const refusal = (partId: string, message: string) => ({ code: 'compile', severity: 'error', partId, message })
  const compiled = (source: string, registry: ChipRegistry): CompileSpecResult => compileSpec(parseSpec(source, { chips: registry }), registry)
  const diagnostics = (result: CompileSpecResult) => (result.success ? [] : result.diagnostics)
  /** `Inn`, compiled and registered while `Foo` is FOO_NOT. */
  const inn = (): ChipDefinition => specChip(INN, register(withBuiltins(), FOO_NOT))

  it("renamed pin: Foo renamed under the same Inn refuses Outer with Inn's own refusal, chained from the Inn part", () => {
    const registry = register(withBuiltins(), FOO_B)
    const innChip = inn()
    registry.register(innChip)
    if (innChip.implementation.type !== 'circuit') throw new Error('Inn is not a circuit chip')
    const own = diagnostics(compileSpec({ doc: innChip.implementation.spec, diagnostics: [] }, registry))
    expect(own.length).toBeGreaterThan(0)
    const result = compiled(OUTER, registry)
    expect(diagnostics(result)).toContainEqual(refusal('p1', 'Outer › Inn: Part "Foo" has no pin "a"'))
    expect(result).toEqual({ success: false, diagnostics: own.map((d) => refusal('p1', `Outer › Inn: ${d.message}`)) })
  })

  it('missing part: with Foo absent, Outer is refused as Outer › Inn: Unknown chip-part', () => {
    const registry = withBuiltins()
    registry.register(inn())
    expect(compiled(OUTER, registry)).toEqual({ success: false, diagnostics: [refusal('p1', 'Outer › Inn: Unknown chip-part: "Foo"')] })
  })

  it("undriven: a hand-registered 'circuit' Bad whose parse reports undriven refuses Outer as Outer › Bad", () => {
    const parsed = parseSpec('CHIP Bad { IN a; OUT out; PARTS: Not(in=t, out=out); }', { chips: withBuiltins() })
    expect(parsed.diagnostics.map((d) => d.code)).toContain('undriven')
    const registry = withBuiltins()
    registry.register(uncompiled('CHIP Bad { IN a; OUT out; PARTS: Not(in=t, out=out); }', registry))
    expect(compiled('CHIP Outer { IN a; OUT o; PARTS: Bad(a=a, out=o); }', registry)).toEqual({ success: false, diagnostics: [refusal('p1', 'Outer › Bad: Signal "t" is read but nothing drives it')] })
  })

  it("two levels, 'hdl' middle: Outer → 'hdl' Mid → 'hdl' Inn over the renamed Foo is refused as one flat chain", () => {
    const registry = register(withBuiltins(), FOO_B)
    registry.register({ name: 'Mid', ...XY, implementation: { type: 'hdl', source: MID } })
    registry.register({ name: 'Inn', ...XY, implementation: { type: 'hdl', source: INN } })
    const found = diagnostics(compiled('CHIP Outer { IN a; OUT o; PARTS: Mid(x=a, y=o); }', registry))
    expect(found).toContainEqual(refusal('p1', 'Outer › Mid › Inn: Line 1: Part "Foo" has no pin "a"'))
    expect(found.every((d) => d.code === 'compile' && d.partId === 'p1' && d.message.startsWith('Outer › Mid › Inn: '))).toBe(true)
  })

  it("once per definition: Inn used twice and through Mid is compiled once, named by its first chain and the first Inn part's id", () => {
    const before = register(withBuiltins(), FOO_NOT)
    const innChip = specChip(INN, before)
    before.register(innChip)
    const registry = register(withBuiltins(), FOO_B)
    registry.register(innChip)
    registry.register(specChip(MID, before))
    const parsed = parseSpec('CHIP Outer { IN a; OUT o1, o2, o3; PARTS: Inn(x=a, y=o1); Inn(x=a, y=o2); Mid(x=a, y=o3); }', { chips: registry })
    const spy = vi.spyOn(compilerModule, 'compileHDL')
    const result = compileSpec(parsed, registry)
    const innCompiles = spy.mock.calls.filter(([ast]) => ast.name === 'Inn').length
    spy.mockRestore()
    expect(innCompiles).toBe(1)
    const found = diagnostics(result)
    expect(found).toContainEqual(refusal('p1', 'Outer › Inn: Part "Foo" has no pin "a"'))
    expect(found.every((d) => d.partId === 'p1' && d.message.startsWith('Outer › Inn: '))).toBe(true)
  })

  it("unchanged: a grandchild that changes but still compiles changes an already-evaluated Outer's value", () => {
    const before = register(withBuiltins(), FOO_NOT, INN, OUTER)
    const after = register(withBuiltins(), FOO_WIRE)
    for (const name of ['Inn', 'Outer']) after.register(before.get(name) as ChipDefinition)
    expect(run(before, 'Outer', { a: 1 })).toEqual({ o: 0 })
    expect(run(after, 'Outer', { a: 1 })).toEqual({ o: 1 })
    expect(run(before, 'Outer', { a: 0 })).toEqual({ o: 1 })
  })

  it("never throws: two 'circuit' chips that use each other, and a Top above them, get #816's refusal", () => {
    const registry = withBuiltins()
    registry.register(specChip('CHIP A { IN a; OUT out; PARTS: B(a=a, out=out); }', register(withBuiltins(), 'CHIP B { IN a; OUT out; PARTS: wire out = a; }')))
    registry.register(uncompiled('CHIP B { IN a; OUT out; PARTS: A(a=a, out=out); }', registry))
    const refused = { success: false, diagnostics: [{ code: 'compile', severity: 'error', message: 'Cannot use chip A to implement itself through B' }] }
    expect(compiled('CHIP A { IN a; OUT out; PARTS: B(a=a, out=out); }', registry)).toEqual(refused)
    expect(compiled('CHIP Top { IN a; OUT out; PARTS: A(a=a, out=out); }', registry)).toEqual(refused)
  })

  describe("over the builtins and a user registry of 'hdl' chips, builtins first (#901)", () => {
    const HALF_BROKEN = 'CHIP HalfAdder { IN a, b; OUT sum, carry; PARTS: Not(in=q, out=carry); }'
    const FULL = 'CHIP FullAdder { IN a, b, c; OUT sum, carry; PARTS: HalfAdder(a=a, b=b, sum=s1, carry=c1); HalfAdder(a=s1, b=c, sum=sum, carry=c2); Or(a=c1, b=c2, out=carry); }'
    const NOT_BROKEN = 'CHIP Not { IN in; OUT out; PARTS: Nand(a=q, b=q, out=out); }'
    const OUTER_NOT = 'CHIP Outer { IN a; OUT o; PARTS: Not(in=a, out=o); }'
    function parsed(source: string): HDLChip {
      const ast = parseHDL(source)
      if (!ast.success) throw new Error(`parse failed: ${source}`)
      return ast.chip
    }
    function user(...sources: string[]): ChipRegistry {
      const registry = createChipRegistry()
      for (const source of sources) registry.register(hdlChipDefinition(parsed(source), source))
      return registry
    }
    const builtinsFirst = (...sources: string[]): ChipRegistry => combineRegistries(getBuiltinChipRegistry(), user(...sources))
    const ownFirst = (...sources: string[]): ChipRegistry => combineRegistries(user(...sources), getBuiltinChipRegistry())

    it("refuses a 'circuit' FullAdder over a broken user HalfAdder in both orders, where the web IDE builds it on its builtin HalfAdder with 0 reads and 1+1+1 gives sum=1 carry=1", () => {
      const refused = { success: false, diagnostics: [refusal('p1', 'FullAdder › HalfAdder: Line 1: Signal "q" is read by part "Not" but no part produces it')] }
      expect(compiled(FULL, builtinsFirst(HALF_BROKEN))).toEqual(refused)
      expect(compiled(FULL, ownFirst(HALF_BROKEN))).toEqual(refused)
    })

    it("compiles an 'hdl' FullAdder over the same HalfAdder, and its first evaluateChip throws the refusal with its chain", () => {
      const chips = builtinsFirst(HALF_BROKEN)
      expect(compileHDL(parsed(FULL), chips).success).toBe(true)
      expect(() => evaluateChip(hdlChipDefinition(parsed(FULL), FULL), { a: 1, b: 1, c: 1 }, chips)).toThrow(
        expect.objectContaining({ message: 'evaluateChip: chip "FullAdder" failed to compile: FullAdder › HalfAdder: Line 1: Signal "q" is read by part "Not" but no part produces it' }),
      )
    })

    it("accepts a 'circuit' Outer over a broken user Not on the builtin Not, as the web IDE does, and refuses it own first", () => {
      const chips = builtinsFirst(NOT_BROKEN)
      const result = compiled(OUTER_NOT, chips)
      if (!result.success) throw new Error(result.diagnostics.map((d) => d.message).join('; '))
      expect(evaluateChip(result.chip, { a: 1 }, chips)).toEqual({ o: 0 })
      expect(evaluateChip(result.chip, { a: 0 }, chips)).toEqual({ o: 1 })
      expect(compiled(OUTER_NOT, ownFirst(NOT_BROKEN))).toEqual({ success: false, diagnostics: [refusal('p1', 'Outer › Not: Line 1: Signal "q" is read by part "Nand" but no part produces it')] })
    })
  })

  describe('a definition whose name or pins differ from its source, or from the name it was looked up by, is refused (#903)', () => {
    const OUTER_FOO = 'CHIP Outer { IN a; OUT o; PARTS: Foo(a=a, out=o); }'
    const BAR_NOT = 'CHIP Bar { IN a; OUT out; PARTS: Not(in=a, out=out); }'
    const pin = (name: string, width = 1): ChipPin => ({ name, width })
    const hdl = (name: string, inputs: ChipPin[], outputs: ChipPin[], source: string): ChipDefinition => ({ name, inputs, outputs, implementation: { type: 'hdl', source } })
    const over = (def: ChipDefinition): ChipRegistry => {
      const registry = withBuiltins()
      registry.register(def)
      return registry
    }
    const refusedAs = (message: string) => ({ success: false, diagnostics: [refusal('p1', message)] })
    function ast(source: string): HDLChip {
      const parsed = parseHDL(source)
      if (!parsed.success) throw new Error(`parse failed: ${source}`)
      return parsed.chip
    }

    it("refuses a 'circuit' Outer over an 'hdl' Foo declaring IN a over source IN b, naming both sides, without throwing", () => {
      expect(compiled(OUTER_FOO, over(hdl('Foo', [pin('a')], [pin('out')], FOO_B)))).toEqual(refusedAs('Outer › Foo: Foo declares IN a, but its source declares IN b'))
    })

    it("refuses it over an 'hdl' Foo whose source is CHIP Bar, in the reference's words", () => {
      expect(compiled(OUTER_FOO, over(hdl('Foo', [pin('a')], [pin('out')], BAR_NOT)))).toEqual(refusedAs('Outer › Foo: Wrong chip name: Foo holds CHIP Bar'))
    })

    it("refuses it over a 'circuit' Foo declaring a over a document whose ins are b", () => {
      const foo = { ...uncompiled(FOO_B, withBuiltins()), inputs: [pin('a')] }
      expect(compiled(OUTER_FOO, over(foo))).toEqual(refusedAs('Outer › Foo: Foo declares IN a, but its source declares IN b'))
    })

    it("refuses it over a 'circuit' Foo whose document is named Bar", () => {
      const foo = { ...uncompiled(BAR_NOT, withBuiltins()), name: 'Foo' }
      expect(compiled(OUTER_FOO, over(foo))).toEqual(refusedAs('Outer › Foo: Wrong chip name: Foo holds CHIP Bar'))
    })

    it('refuses a Foo declaring IN a[16] over source IN a: the widths differ', () => {
      const registry = over(hdl('Foo', [pin('a', 16)], [pin('out')], FOO_NOT))
      expect(compiled('CHIP Outer { IN a[16]; OUT o; PARTS: Foo(a=a, out=o); }', registry)).toEqual(refusedAs('Outer › Foo: Foo declares IN a[16], but its source declares IN a'))
    })

    it('refuses a Foo declaring OUT o2 over source OUT out', () => {
      const registry = over(hdl('Foo', [pin('a')], [pin('o2')], FOO_NOT))
      expect(compiled('CHIP Outer { IN a; OUT o; PARTS: Foo(a=a, o2=o); }', registry)).toEqual(refusedAs('Outer › Foo: Foo declares OUT o2, but its source declares OUT out'))
    })

    it("refuses Outer under a registry view that returns the 'hdl' Bar for Foo, where Outer looks Foo up: compileSpec's engine pass and compileHDL's part resolution", () => {
      const base = over(hdlChipDefinition(ast(BAR_NOT), BAR_NOT))
      const asBar = (name: string): string => (name === 'Foo' ? 'Bar' : name)
      const view: ChipRegistry = { ...base, get: (name) => base.get(asBar(name)), has: (name) => base.has(asBar(name)) }
      expect(compiled(OUTER_FOO, view)).toEqual({ success: false, diagnostics: [{ code: 'compile', severity: 'error', message: 'Wrong chip name: Foo holds CHIP Bar' }] })
      expect(compileHDL(ast(OUTER_FOO), view)).toEqual({ success: false, errors: [{ message: 'Line 1: Wrong chip name: Foo holds CHIP Bar', partName: 'Foo', line: 1 }] })
    })

    it('accepts a Foo2 declaring IN b, a over source IN a, b: pins compare by name and width, in any order', () => {
      const registry = over(hdl('Foo2', [pin('b'), pin('a')], [pin('out')], 'CHIP Foo2 { IN a, b; OUT out; PARTS: And(a=a, b=b, out=out); }'))
      const result = compiled('CHIP Outer { IN a, b; OUT o; PARTS: Foo2(a=a, b=b, out=o); }', registry)
      if (!result.success) throw new Error(result.diagnostics.map((d) => d.message).join('; '))
      expect(evaluateChip(result.chip, { a: 1, b: 0 }, registry)).toEqual({ o: 0 })
      expect(evaluateChip(result.chip, { a: 1, b: 1 }, registry)).toEqual({ o: 1 })
    })
  })
})
