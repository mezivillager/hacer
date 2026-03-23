import { describe, it, expect } from 'vitest'
import { createChipRegistry, registerBuiltin } from './registry'
import { validateChipDefinition, isBuiltinChip, isHDLChip, isCircuitChip } from './types'
import type { ChipDefinition } from './types'

describe('ChipRegistry', () => {
  function makeNandChip(): ChipDefinition {
    return {
      name: 'Nand',
      inputs: [{ name: 'a', width: 1 }, { name: 'b', width: 1 }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: {
        type: 'builtin',
        evaluate: (inputs) => ({
          // Single-bit NAND: out = ~(a & b); for a,b ∈ {0,1} this equals (a & b) === 0 ? 1 : 0
          out: (inputs.a & inputs.b) === 0 ? 1 : 0,
        }),
      },
    }
  }

  // --- Registration ---

  it('registers a chip and retrieves it by name', () => {
    const reg = createChipRegistry()
    const nand = makeNandChip()
    reg.register(nand)
    expect(reg.get('Nand')).toBe(nand)
  })

  it('has() returns true for registered chips', () => {
    const reg = createChipRegistry()
    reg.register(makeNandChip())
    expect(reg.has('Nand')).toBe(true)
    expect(reg.has('Unknown')).toBe(false)
  })

  it('list() returns all registered chips', () => {
    const reg = createChipRegistry()
    reg.register(makeNandChip())
    expect(reg.list()).toHaveLength(1)
    expect(reg.list()[0].name).toBe('Nand')
  })

  it('get() returns undefined for unregistered chips', () => {
    const reg = createChipRegistry()
    expect(reg.get('Nand')).toBeUndefined()
  })

  it('throws on duplicate registration', () => {
    const reg = createChipRegistry()
    reg.register(makeNandChip())
    expect(() => reg.register(makeNandChip())).toThrow('already registered')
  })

  // --- Nand evaluation ---

  it('Nand builtin evaluates all 4 input combinations correctly', () => {
    const reg = createChipRegistry()
    reg.register(makeNandChip())
    const nand = reg.get('Nand')!
    expect(isBuiltinChip(nand)).toBe(true)
    if (!isBuiltinChip(nand)) throw new Error('expected builtin')

    const evaluate = nand.implementation.evaluate
    expect(evaluate({ a: 0, b: 0 })).toEqual({ out: 1 })
    expect(evaluate({ a: 0, b: 1 })).toEqual({ out: 1 })
    expect(evaluate({ a: 1, b: 0 })).toEqual({ out: 1 })
    expect(evaluate({ a: 1, b: 1 })).toEqual({ out: 0 })
  })

  // --- registerBuiltin convenience ---

  it('registerBuiltin registers a chip via the convenience function', () => {
    const reg = createChipRegistry()
    registerBuiltin(
      reg, 'Not',
      [{ name: 'in', width: 1 }],
      [{ name: 'out', width: 1 }],
      (inputs) => ({ out: inputs.in === 0 ? 1 : 0 })
    )
    expect(reg.has('Not')).toBe(true)
    const not = reg.get('Not')!
    if (!isBuiltinChip(not)) throw new Error('expected builtin')
    expect(not.implementation.evaluate({ in: 0 })).toEqual({ out: 1 })
    expect(not.implementation.evaluate({ in: 1 })).toEqual({ out: 0 })
  })

  // --- Validation ---

  it('rejects chip with empty name', () => {
    const reg = createChipRegistry()
    expect(() => reg.register({
      name: '',
      inputs: [{ name: 'a', width: 1 }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: { type: 'builtin', evaluate: () => ({ out: 0 }) },
    })).toThrow('name must not be empty')
  })

  it('rejects chip with zero-width pin', () => {
    const reg = createChipRegistry()
    expect(() => reg.register({
      name: 'Bad',
      inputs: [{ name: 'a', width: 0 }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: { type: 'builtin', evaluate: () => ({ out: 0 }) },
    })).toThrow('width must be a finite integer >= 1')
  })

  it('rejects chip with non-integer pin width', () => {
    const reg = createChipRegistry()
    expect(() => reg.register({
      name: 'Bad',
      inputs: [{ name: 'a', width: 1.5 }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: { type: 'builtin', evaluate: () => ({ out: 0 }) },
    })).toThrow('width must be a finite integer >= 1')
  })

  it('rejects chip with NaN pin width', () => {
    const reg = createChipRegistry()
    expect(() => reg.register({
      name: 'Bad',
      inputs: [{ name: 'a', width: NaN }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: { type: 'builtin', evaluate: () => ({ out: 0 }) },
    })).toThrow('width must be a finite integer >= 1')
  })

  it('rejects chip with Infinity pin width', () => {
    const reg = createChipRegistry()
    expect(() => reg.register({
      name: 'Bad',
      inputs: [{ name: 'a', width: Infinity }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: { type: 'builtin', evaluate: () => ({ out: 0 }) },
    })).toThrow('width must be a finite integer >= 1')
  })

  it('rejects chip with whitespace-padded name', () => {
    const reg = createChipRegistry()
    expect(() => reg.register({
      name: ' Nand ',
      inputs: [{ name: 'a', width: 1 }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: { type: 'builtin', evaluate: () => ({ out: 0 }) },
    })).toThrow('must not have leading or trailing whitespace')
  })

  it('rejects chip with whitespace-padded pin name', () => {
    const reg = createChipRegistry()
    expect(() => reg.register({
      name: 'Bad',
      inputs: [{ name: ' a', width: 1 }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: { type: 'builtin', evaluate: () => ({ out: 0 }) },
    })).toThrow('must not have leading or trailing whitespace')
  })

  it('rejects chip with duplicate pin names', () => {
    const reg = createChipRegistry()
    expect(() => reg.register({
      name: 'Bad',
      inputs: [{ name: 'a', width: 1 }, { name: 'a', width: 1 }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: { type: 'builtin', evaluate: () => ({ out: 0 }) },
    })).toThrow('Duplicate pin name')
  })

  it('rejects chip with whitespace-only pin name', () => {
    const reg = createChipRegistry()
    expect(() => reg.register({
      name: 'Bad',
      inputs: [{ name: '  ', width: 1 }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: { type: 'builtin', evaluate: () => ({ out: 0 }) },
    })).toThrow('Pin name must not be empty')
  })
})

describe('validateChipDefinition', () => {
  it('returns empty array for valid chip', () => {
    expect(validateChipDefinition({
      name: 'Nand',
      inputs: [{ name: 'a', width: 1 }, { name: 'b', width: 1 }],
      outputs: [{ name: 'out', width: 1 }],
      implementation: { type: 'builtin', evaluate: () => ({ out: 0 }) },
    })).toEqual([])
  })

  it('catches multiple errors at once', () => {
    const errors = validateChipDefinition({
      name: '',
      inputs: [],
      outputs: [],
      implementation: { type: 'builtin', evaluate: () => ({}) },
    })
    expect(errors.length).toBeGreaterThanOrEqual(3) // empty name + no inputs + no outputs
  })
})

describe('type guards', () => {
  it('isBuiltinChip returns true for builtin', () => {
    expect(isBuiltinChip({
      name: 'Nand', inputs: [], outputs: [],
      implementation: { type: 'builtin', evaluate: () => ({}) },
    } as ChipDefinition)).toBe(true)
  })

  it('isHDLChip returns true for hdl', () => {
    expect(isHDLChip({
      name: 'Not', inputs: [], outputs: [],
      implementation: { type: 'hdl', source: 'CHIP Not {}' },
    } as ChipDefinition)).toBe(true)
  })

  it('isCircuitChip returns true for circuit', () => {
    expect(isCircuitChip({
      name: 'And', inputs: [], outputs: [],
      implementation: { type: 'circuit', circuitData: {} },
    } as ChipDefinition)).toBe(true)
  })
})
