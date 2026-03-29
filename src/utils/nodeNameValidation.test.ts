import { describe, expect, it } from 'vitest'
import { validateNodeName } from './nodeNameValidation'

describe('validateNodeName', () => {
  it('returns normalized trimmed name for valid input', () => {
    const result = validateNodeName('  sel  ', ['a', 'b'])

    expect(result).toEqual({ ok: true, normalizedName: 'sel' })
  })

  it('rejects empty names', () => {
    const result = validateNodeName('   ', ['a'])

    expect(result).toEqual({ ok: false, reason: 'empty' })
  })

  it('rejects invalid identifier format', () => {
    const invalidNames = ['1abc', 'a-b', 'a b', 'a.b']

    for (const name of invalidNames) {
      const result = validateNodeName(name, ['x'])
      expect(result).toEqual({ ok: false, reason: 'invalid-format' })
    }
  })

  it('rejects case-insensitive duplicates in same bucket', () => {
    const result = validateNodeName('Sel', ['a', 'sEl', 'out'])

    expect(result).toEqual({ ok: false, reason: 'duplicate' })
  })

  it('allows same logical name when renaming the current node', () => {
    const result = validateNodeName('Sel', ['a', 'sel', 'out'], 'SEL')

    expect(result).toEqual({ ok: true, normalizedName: 'Sel' })
  })

  it('allows valid names with underscore and digits after first character', () => {
    const result = validateNodeName('_bus16', ['a'])

    expect(result).toEqual({ ok: true, normalizedName: '_bus16' })
  })
})
