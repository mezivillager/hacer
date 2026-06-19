// src/core/chips/evaluateChip.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createChipRegistry, registerBuiltin } from './registry'
import type { ChipRegistry } from './registry'
import { evaluateChip } from './evaluateChip'

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

  it('throws a clear error for circuit implementation (not yet supported)', () => {
    const chip = { name: 'C', inputs: [{ name: 'a', width: 1 }], outputs: [{ name: 'o', width: 1 }], implementation: { type: 'circuit' as const, circuitData: null } }
    expect(() => evaluateChip(chip, { a: 1 }, registry)).toThrow(/circuit|not.*support/i)
  })

  it('enforces the recursion depth guard', () => {
    // self-referential hdl chip → exceeds depth
    registry.register({ name: 'Loop', inputs: [{ name: 'a', width: 1 }], outputs: [{ name: 'out', width: 1 }], implementation: { type: 'hdl', source: 'CHIP Loop { IN a; OUT out; PARTS: Loop(a=a, out=out); }' } })
    const Loop = registry.get('Loop')!
    expect(() => evaluateChip(Loop, { a: 1 }, registry, { maxDepth: 10 })).toThrow(/depth/i)
  })
})
