// src/core/chips/evaluateChip.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createChipRegistry, registerBuiltin } from './registry'
import type { ChipRegistry } from './registry'
import { ChipCompileError, evaluateChip } from './evaluateChip'
import { getBuiltinChipRegistry } from './appRegistry'
import { combineRegistries } from './combineRegistries'
import * as compilerModule from '../hdl/compiler'
import { parseHDL } from '../hdl/parser'
import { compileSpec } from '../spec/compileSpec'
import { parseSpec } from '../spec/parseSpec'
import type { ChipDefinition } from './types'

const ONE_IN_ONE_OUT = { inputs: [{ name: 'a', width: 1 }], outputs: [{ name: 'out', width: 1 }] }

let registry: ChipRegistry
beforeEach(() => {
  registry = createChipRegistry()
  registerBuiltin(registry, 'Nand',
    [{ name: 'a', width: 1 }, { name: 'b', width: 1 }],
    [{ name: 'out', width: 1 }],
    (i) => ({ out: ~(i.a & i.b) & 1 }))
})

describe('evaluateChip', () => {
  it('dispatches builtin chips directly', () => {
    const chip = registry.get('Nand')!
    expect(evaluateChip(chip, { a: 1, b: 1 }, registry)).toEqual({ out: 0 })
    expect(evaluateChip(chip, { a: 1, b: 0 }, registry)).toEqual({ out: 1 })
  })

  it('compiles + evaluates an hdl chip (And from Nand+Not), with nesting', () => {
    registry.register({ name: 'Not', inputs: [{ name: 'in', width: 1 }], outputs: [{ name: 'out', width: 1 }], implementation: { type: 'hdl', source: 'CHIP Not { IN in; OUT out; PARTS: Nand(a=in, b=in, out=out); }' } })
    registry.register({ name: 'And', inputs: [{ name: 'a', width: 1 }, { name: 'b', width: 1 }], outputs: [{ name: 'out', width: 1 }], implementation: { type: 'hdl', source: 'CHIP And { IN a, b; OUT out; PARTS: Nand(a=a, b=b, out=n); Not(in=n, out=out); }' } })
    const And = registry.get('And')!
    expect(evaluateChip(And, { a: 1, b: 1 }, registry)).toEqual({ out: 1 })
    expect(evaluateChip(And, { a: 1, b: 0 }, registry)).toEqual({ out: 0 })
  })

  it("evaluates a 'circuit' chip through compileSpec, write-back included", () => {
    const parsed = parseSpec('CHIP C { IN a; OUT o, p; PARTS: Nand(a=a, b=a, out=o); wire p = a; }', { chips: registry })
    if (parsed.doc === null) throw new Error(parsed.diagnostics.map((d) => d.message).join('; '))
    const chip = { name: 'C', inputs: [{ name: 'a', width: 1 }], outputs: [{ name: 'o', width: 1 }, { name: 'p', width: 1 }], implementation: { type: 'circuit' as const, spec: parsed.doc } }
    for (const a of [0, 1]) expect(evaluateChip(chip, { a }, registry)).toEqual({ o: 1 - a, p: a })
  })

  it('enforces the recursion depth guard', () => {
    const LAST = 11
    for (let i = 0; i <= LAST; i++) {
      const part = i === LAST ? 'Nand(a=a, b=a, out=out);' : `C${i + 1}(a=a, out=out);`
      registry.register({ name: `C${i}`, ...ONE_IN_ONE_OUT, implementation: { type: 'hdl', source: `CHIP C${i} { IN a; OUT out; PARTS: ${part} }` } })
    }
    expect(evaluateChip(registry.get('C0')!, { a: 1 }, registry, { maxDepth: LAST + 1 })).toEqual({ out: 0 })
    expect(() => evaluateChip(registry.get('C0')!, { a: 1 }, registry, { maxDepth: 10 })).toThrow(/depth/i)
  })

  it('compiles an hdl chip once and reuses the cached evaluator', () => {
    // Use a fresh chip object not seen by any other test so the WeakMap has no entry yet.
    const src = 'CHIP CacheNot { IN in; OUT out; PARTS: Nand(a=in, b=in, out=out); }'
    const chip = { name: 'CacheNot', inputs: [{ name: 'in', width: 1 }], outputs: [{ name: 'out', width: 1 }], implementation: { type: 'hdl' as const, source: src } }
    registry.register(chip)

    const spy = vi.spyOn(compilerModule, 'compileHDL')

    // First eval — cache miss → compileHDL must be called once.
    expect(evaluateChip(chip, { in: 0 }, registry)).toEqual({ out: 1 })
    // Second eval — cache hit → compileHDL must NOT be called again.
    expect(evaluateChip(chip, { in: 1 }, registry)).toEqual({ out: 0 })

    // If the WeakMap cache were bypassed, compileHDL would be called twice.
    expect(spy).toHaveBeenCalledTimes(1)

    spy.mockRestore()
  })

  it('does not reuse a cached evaluator under a registry that resolves one of its parts differently', () => {
    const bar = { name: 'Bar', ...ONE_IN_ONE_OUT, implementation: { type: 'hdl' as const, source: 'CHIP Bar { IN a; OUT out; PARTS: Foo(a=a, out=out); }' } }
    const withFoo = (fooParts: string): ChipRegistry => {
      const r = createChipRegistry()
      for (const def of getBuiltinChipRegistry().list()) r.register(def)
      r.register({ name: 'Foo', ...ONE_IN_ONE_OUT, implementation: { type: 'hdl', source: `CHIP Foo { IN a; OUT out; PARTS: ${fooParts} }` } })
      r.register(bar)
      return r
    }
    expect(evaluateChip(bar, { a: 1 }, withFoo('Not(in=a, out=out);'))).toEqual({ out: 0 })
    expect(evaluateChip(bar, { a: 1 }, withFoo('Or(a=a, b=a, out=out);'))).toEqual({ out: 1 })
  })

  it('does not reuse a cached evaluator after a registry view starts resolving one of its parts differently', () => {
    const bar = { name: 'Bar', ...ONE_IN_ONE_OUT, implementation: { type: 'hdl' as const, source: 'CHIP Bar { IN a; OUT out; PARTS: Foo(a=a, out=out); }' } }
    const shadowing = createChipRegistry()
    const base = createChipRegistry()
    for (const def of getBuiltinChipRegistry().list()) base.register(def)
    base.register({ name: 'Foo', ...ONE_IN_ONE_OUT, implementation: { type: 'hdl', source: 'CHIP Foo { IN a; OUT out; PARTS: Not(in=a, out=out); }' } })
    const view = combineRegistries(shadowing, base)
    expect(evaluateChip(bar, { a: 1 }, view)).toEqual({ out: 0 })
    shadowing.register({ name: 'Foo', ...ONE_IN_ONE_OUT, implementation: { type: 'hdl', source: 'CHIP Foo { IN a; OUT out; PARTS: Or(a=a, b=a, out=out); }' } })
    expect(evaluateChip(bar, { a: 1 }, view)).toEqual({ out: 1 })
  })

  it('reuses a cached evaluator under a fresh registry view that resolves its parts the same', () => {
    const chip = { name: 'ViewNot', ...ONE_IN_ONE_OUT, implementation: { type: 'hdl' as const, source: 'CHIP ViewNot { IN a; OUT out; PARTS: Nand(a=a, b=a, out=out); }' } }
    registry.register(chip)
    const spy = vi.spyOn(compilerModule, 'compileHDL')
    expect(evaluateChip(chip, { a: 0 }, combineRegistries(registry))).toEqual({ out: 1 })
    expect(evaluateChip(chip, { a: 1 }, combineRegistries(registry))).toEqual({ out: 0 })
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it("refuses an evaluated 'circuit' Outer with a fresh compileSpec's chain once a part below its direct parts stops compiling (#821)", () => {
    const spec = (source: string, chips: ChipRegistry) => {
      const result = compileSpec(parseSpec(source, { chips }), chips)
      if (!result.success) throw new Error(result.diagnostics.map((d) => d.message).join('; '))
      return result.chip
    }
    const base = createChipRegistry()
    for (const def of getBuiltinChipRegistry().list()) base.register(def)
    base.register({ name: 'Foo', ...ONE_IN_ONE_OUT, implementation: { type: 'hdl', source: 'CHIP Foo { IN a; OUT out; PARTS: Not(in=a, out=out); }' } })
    base.register(spec('CHIP Inn { IN x; OUT y; PARTS: Foo(a=x, out=y); }', base))
    const outer = spec('CHIP Outer { IN a; OUT o; PARTS: Inn(x=a, y=o); }', base)
    const shadow = createChipRegistry()
    const view = combineRegistries(shadow, base)
    expect(evaluateChip(outer, { a: 1 }, view)).toEqual({ o: 0 })
    shadow.register({ name: 'Foo', inputs: [{ name: 'b', width: 1 }], outputs: [{ name: 'out', width: 1 }], implementation: { type: 'hdl', source: 'CHIP Foo { IN b; OUT out; PARTS: Not(in=b, out=out); }' } })
    if (outer.implementation.type !== 'circuit') throw new Error('Outer is not a circuit chip')
    const fresh = compileSpec({ doc: outer.implementation.spec, diagnostics: [] }, view)
    const messages = fresh.success ? [] : fresh.diagnostics.map((d) => d.message)
    expect(messages).toContain('Outer › Inn: Part "Foo" has no pin "a"')
    expect(() => evaluateChip(outer, { a: 1 }, view)).toThrow(`evaluateChip: chip "Outer" failed to compile: ${messages.join('; ')}`)
  })

  describe('a definition whose pins differ from its source is refused before it evaluates (#903)', () => {
    const FOO_B = 'CHIP Foo { IN b; OUT out; PARTS: Not(in=b, out=out); }'
    const refusal = 'Foo declares IN a, but its source declares IN b'
    const hdlFoo: ChipDefinition = { name: 'Foo', ...ONE_IN_ONE_OUT, implementation: { type: 'hdl', source: FOO_B } }
    const builtins = (): ChipRegistry => {
      const chips = createChipRegistry()
      for (const def of getBuiltinChipRegistry().list()) chips.register(def)
      return chips
    }
    const thrownBy = (run: () => unknown): unknown => {
      try {
        run()
      } catch (error) {
        return error
      }
      return undefined
    }

    it("throws ChipCompileError on the first evaluation of an 'hdl' or a 'circuit' Foo declaring IN a over a source declaring IN b", () => {
      const parsed = parseSpec(FOO_B, { chips: getBuiltinChipRegistry() })
      if (parsed.doc === null) throw new Error(parsed.diagnostics.map((d) => d.message).join('; '))
      const circuitFoo: ChipDefinition = { name: 'Foo', ...ONE_IN_ONE_OUT, implementation: { type: 'circuit', spec: parsed.doc } }
      for (const foo of [hdlFoo, circuitFoo]) {
        const error = thrownBy(() => evaluateChip(foo, { a: 0 }, getBuiltinChipRegistry()))
        expect(error).toBeInstanceOf(ChipCompileError)
        expect(error).toHaveProperty('message', `evaluateChip: chip "Foo" failed to compile: ${refusal}`)
      }
    })

    it("compiles an 'hdl' Outer over that 'hdl' Foo, and its first evaluation throws the refusal chained from Outer", () => {
      const source = 'CHIP Outer { IN a; OUT o; PARTS: Foo(a=a, out=o); }'
      const ast = parseHDL(source)
      if (!ast.success) throw new Error('Outer did not parse')
      const chips = builtins()
      chips.register(hdlFoo)
      expect(compilerModule.compileHDL(ast.chip, chips).success).toBe(true)
      const outer: ChipDefinition = compilerModule.hdlChipDefinition(ast.chip, source)
      const error = thrownBy(() => evaluateChip(outer, { a: 0 }, chips))
      expect(error).toBeInstanceOf(ChipCompileError)
      expect(error).toHaveProperty('message', `evaluateChip: chip "Outer" failed to compile: Outer › Foo: ${refusal}`)
    })

    describe("a BUILTIN body whose pins differ from the builtin's (#919)", () => {
      const builtinFoo: ChipDefinition = { name: 'Foo', ...ONE_IN_ONE_OUT, implementation: { type: 'hdl', source: 'CHIP Foo { IN a; OUT out; BUILTIN Not; }' } }
      const builtinRefusal = 'Foo declares IN a, but builtin Not declares IN in'

      it("throws ChipCompileError on an 'hdl' Foo declaring IN a over BUILTIN Not, whose IN is in", () => {
        const error = thrownBy(() => evaluateChip(builtinFoo, { a: 0 }, builtins()))
        expect(error).toBeInstanceOf(ChipCompileError)
        expect(error).toHaveProperty('message', `evaluateChip: chip "Foo" failed to compile: ${builtinRefusal}`)
      })

      it("compiles an 'hdl' Outer over that Foo, and its first evaluation throws the refusal chained from Outer", () => {
        const source = 'CHIP Outer { IN a; OUT o; PARTS: Foo(a=a, out=o); }'
        const ast = parseHDL(source)
        if (!ast.success) throw new Error('Outer did not parse')
        const chips = builtins()
        chips.register(builtinFoo)
        expect(compilerModule.compileHDL(ast.chip, chips).success).toBe(true)
        const error = thrownBy(() => evaluateChip(compilerModule.hdlChipDefinition(ast.chip, source), { a: 0 }, chips))
        expect(error).toBeInstanceOf(ChipCompileError)
        expect(error).toHaveProperty('message', `evaluateChip: chip "Outer" failed to compile: Outer › Foo: ${builtinRefusal}`)
      })
    })
  })
})
