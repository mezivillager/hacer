import { describe, it, expect, beforeEach } from 'vitest'
import {
  getImplementationSources,
  getImplementationSource,
  registerImplementationSource,
  resetImplementationSourcesForTests,
} from './implementationSources'
import { isHDLChip, isBuiltinChip } from '../chips/types'

beforeEach(() => resetImplementationSourcesForTests())

describe('implementationSources', () => {
  it('ships builtin and hdl-from-nand sources', () => {
    expect(getImplementationSources().map((s) => s.id)).toEqual(['builtin', 'hdl-from-nand'])
    expect(getImplementationSource('builtin')).toBeDefined()
    expect(getImplementationSource('nope')).toBeUndefined()
  })

  it('builtin source resolves builtin chips', () => {
    const r = getImplementationSource('builtin')!.resolve('Mux16')
    expect(r).not.toBeNull()
    expect(isBuiltinChip(r!.chip)).toBe(true)
    expect(getImplementationSource('builtin')!.resolve('Nope')).toBeNull()
  })

  it('hdl-from-nand resolves composites as HDL chips built from a single NAND', () => {
    const src = getImplementationSource('hdl-from-nand')!
    const mux = src.resolve('Mux')
    expect(mux).not.toBeNull()
    expect(isHDLChip(mux!.chip)).toBe(true)
    // The registry it returns must also contain Nand (the base) so the chip can evaluate.
    expect(mux!.registry.get('Nand')).toBeDefined()
    expect(src.resolve('Nope')).toBeNull()
  })

  it('supports registering and resetting sources', () => {
    registerImplementationSource({ id: 'x', label: 'X', resolve: () => null })
    expect(getImplementationSource('x')).toBeDefined()
    resetImplementationSourcesForTests()
    expect(getImplementationSource('x')).toBeUndefined()
  })
})
