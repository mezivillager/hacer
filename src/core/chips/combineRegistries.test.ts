// src/core/chips/combineRegistries.test.ts
import { describe, it, expect } from 'vitest'
import { createChipRegistry, registerBuiltin } from './registry'
import { combineRegistries } from './combineRegistries'

describe('combineRegistries', () => {
  it('resolves get/has across registries in order', () => {
    const a = createChipRegistry()
    const b = createChipRegistry()
    registerBuiltin(a, 'Nand', [{ name: 'a', width: 1 }, { name: 'b', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: ~(i.a & i.b) & 1 }))
    registerBuiltin(b, 'Foo', [{ name: 'x', width: 1 }], [{ name: 'out', width: 1 }], (i) => ({ out: i.x }))
    const c = combineRegistries(a, b)
    expect(c.has('Nand')).toBe(true)
    expect(c.has('Foo')).toBe(true)
    expect(c.has('Missing')).toBe(false)
    expect(c.get('Nand')?.name).toBe('Nand')
    expect(c.get('Foo')?.name).toBe('Foo')
    expect(c.list().map((d) => d.name).sort()).toEqual(['Foo', 'Nand'])
  })

  it('is read-only (register throws)', () => {
    const c = combineRegistries(createChipRegistry())
    expect(() => c.register({ name: 'X', inputs: [{ name: 'a', width: 1 }], outputs: [{ name: 'o', width: 1 }], implementation: { type: 'circuit', circuitData: null } })).toThrow()
  })
})
