import { describe, it, expect } from 'vitest'
import { formatColumnValue } from './formatColumnValue'
import type { TSTOutputColumn } from './types'

function col(overrides: Partial<TSTOutputColumn>): TSTOutputColumn {
  return { name: 'x', format: 'B', padLeft: 1, width: 1, padRight: 1, ...overrides }
}

describe('formatColumnValue', () => {
  describe('binary (B)', () => {
    it('formats 1-bit 0 as "0"', () => {
      expect(formatColumnValue(0, col({ format: 'B', width: 1 }))).toBe('0')
    })

    it('formats 1-bit 1 as "1"', () => {
      expect(formatColumnValue(1, col({ format: 'B', width: 1 }))).toBe('1')
    })

    it('formats a 16-bit all-ones value as 16 binary digits', () => {
      expect(formatColumnValue(65535, col({ format: 'B', width: 16 }))).toBe('1111111111111111')
    })

    it('pads a 16-bit zero to 16 binary digits', () => {
      expect(formatColumnValue(0, col({ format: 'B', width: 16 }))).toBe('0000000000000000')
    })

    it('masks bits above the column width', () => {
      // 0x1FF = 511; masked to 8 bits = 255 = 11111111
      expect(formatColumnValue(0x1FF, col({ format: 'B', width: 8 }))).toBe('11111111')
    })

    it('matches Not16 .cmp fixture format for a sample row', () => {
      // Not16 cmp: in=0b1010101010101010 → out=0b0101010101010101
      const out = 0b0101010101010101
      expect(formatColumnValue(out, col({ format: 'B', width: 16 }))).toBe('0101010101010101')
    })
  })

  describe('decimal (D)', () => {
    it('formats 0 as "0"', () => {
      expect(formatColumnValue(0, col({ format: 'D', width: 1 }))).toBe('0')
    })

    it('formats 255 as "255" for 8-bit', () => {
      expect(formatColumnValue(255, col({ format: 'D', width: 8 }))).toBe('255')
    })

    it('masks bits above the column width', () => {
      expect(formatColumnValue(256, col({ format: 'D', width: 8 }))).toBe('0')
    })
  })

  describe('hex (X)', () => {
    it('formats 255 for 8-bit as two uppercase hex digits without 0x prefix', () => {
      expect(formatColumnValue(255, col({ format: 'X', width: 8 }))).toBe('FF')
    })

    it('pads to ceil(width/4) hex digits', () => {
      expect(formatColumnValue(1, col({ format: 'X', width: 16 }))).toBe('0001')
    })

    it('masks bits above the column width', () => {
      expect(formatColumnValue(0x1FF, col({ format: 'X', width: 8 }))).toBe('FF')
    })
  })

  describe('string (S)', () => {
    it('returns the decimal string representation', () => {
      expect(formatColumnValue(42, col({ format: 'S', width: 8 }))).toBe('42')
    })

    it('returns "0" for zero', () => {
      expect(formatColumnValue(0, col({ format: 'S', width: 1 }))).toBe('0')
    })
  })
})
