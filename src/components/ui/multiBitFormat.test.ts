import { describe, it, expect } from 'vitest'
import { formatValue, parseValue } from './multiBitFormat'

describe('formatValue', () => {
  it('binary format pads to width (4-bit)', () => {
    expect(formatValue(0b1010, 4, 'B')).toBe('1010')
  })
  it('binary pads zeros on the left', () => {
    expect(formatValue(0b11, 8, 'B')).toBe('00000011')
  })
  it('decimal format', () => {
    expect(formatValue(255, 8, 'D')).toBe('255')
  })
  it('hex format with 0x prefix and width-rounded padding', () => {
    expect(formatValue(0xFF, 16, 'X')).toBe('0x00FF')
  })
  it('hex format for non-multiple-of-4 width pads to ceil(width/4)', () => {
    expect(formatValue(0x5, 5, 'X')).toBe('0x05')
  })
  it('masks bits above the width', () => {
    expect(formatValue(0x1FF, 8, 'D')).toBe('255')
  })
  it('handles width=32 without overflow', () => {
    expect(formatValue(0xFFFFFFFF, 32, 'X')).toBe('0xFFFFFFFF')
  })
})

describe('parseValue', () => {
  it('parses decimal', () => expect(parseValue('42', 8)).toBe(42))
  it('parses hex with 0x prefix', () => expect(parseValue('0xFF', 8)).toBe(255))
  it('parses hex with 0X prefix', () => expect(parseValue('0XFF', 8)).toBe(255))
  it('parses binary with 0b prefix', () => expect(parseValue('0b1010', 4)).toBe(10))
  it('parses binary with 0B prefix', () => expect(parseValue('0B1010', 4)).toBe(10))
  it('clamps to width', () => expect(parseValue('256', 8)).toBe(0))
  it('clamps wider hex to width', () => expect(parseValue('0x1FF', 8)).toBe(255))
  it('returns null for non-numeric text', () => expect(parseValue('abc', 8)).toBeNull())
  it('returns null for empty string', () => expect(parseValue('', 8)).toBeNull())
  it('returns null for whitespace only', () => expect(parseValue('   ', 8)).toBeNull())
  it('returns null for negative numbers', () => expect(parseValue('-1', 8)).toBeNull())
  it('trims whitespace', () => expect(parseValue('  42  ', 8)).toBe(42))
})
