// src/core/chips/evaluateChip.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createChipRegistry, registerBuiltin } from './registry'
import type { ChipRegistry } from './registry'
import { evaluateChip } from './evaluateChip'
import { getBuiltinChipRegistry } from './appRegistry'
import { combineRegistries } from './combineRegistries'
import * as compilerModule from '../hdl/compiler'
import { parseSpec } from '../spec/parseSpec'

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
    registry.register({ name: 'A', ...ONE_IN_ONE_OUT, implementation: { type: 'hdl', source: 'CHIP A { IN a; OUT out; PARTS: B(a=a, out=out); }' } })
    registry.register({ name: 'B', ...ONE_IN_ONE_OUT, implementation: { type: 'hdl', source: 'CHIP B { IN a; OUT out; PARTS: A(a=a, out=out); }' } })
    expect(() => evaluateChip(registry.get('A')!, { a: 1 }, registry, { maxDepth: 10 })).toThrow(/depth/i)
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
})
