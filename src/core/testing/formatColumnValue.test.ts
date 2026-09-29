import { describe, it, expect } from 'vitest'
import { formatColumnValue } from './formatColumnValue'
import type { TSTOutputColumn } from './types'

function col(format: TSTOutputColumn['format'], width: number): TSTOutputColumn {
  return { name: 'x', format, padLeft: 1, width, padRight: 1 }
}

/** A row's cells with the padding spaces dropped, as `formatColumnValue` returns them. */
const cells = (row: string): string[] => row.split('|').slice(1, -1).map((cell) => cell.trim())

describe('formatColumnValue', () => {
  // Rows the nand2tetris tools wrote, checked by hand against the format each column declares.
  describe('matches reference .out rows', () => {
    it('Register.cmp at time 5: S, signed D, B (conformance/vectors/03/Register.cmp:11)', () => {
      // output-list time%S1.3.1 in%D1.6.1 load%B2.1.1 out%D1.6.1; in = out = -32123 as a 16-bit word
      const row = '| 5   | -32123 |  1 | -32123 |'
      const word = -32123 & 0xffff
      expect([
        formatColumnValue(5, col('S', 3)),
        formatColumnValue(word, col('D', 6)),
        formatColumnValue(1, col('B', 1)),
        formatColumnValue(word, col('D', 6)),
      ]).toEqual(cells(row))
    })

    it('Memory.cmp row 1: D, B, and a 15-bit B column (conformance/vectors/05/Memory.cmp:2)', () => {
      // output-list in%D1.6.1 load%B2.1.2 address%B1.15.1 out%D1.6.1; address = 0x2000
      const row = '|  12345 |  1  | 010000000000000 |      0 |'
      expect([
        formatColumnValue(12345, col('D', 6)),
        formatColumnValue(1, col('B', 1)),
        formatColumnValue(0x2000, col('B', 15)),
        formatColumnValue(0, col('D', 6)),
      ]).toEqual(cells(row))
    })

    it('the nand2tetris web IDE\'s own Output test row: D, X with its 0x, B cut from the right', () => {
      // a%D2.1.2 b%X1.6.1 in%B2.2.2 out%B2.4.2 with a = 1, b = 20, in = 0, out = -1
      const row = '|  1  | 0x0014 |  00  |  1111  |'
      expect([
        formatColumnValue(1, col('D', 1)),
        formatColumnValue(20, col('X', 6)),
        formatColumnValue(0, col('B', 2)),
        formatColumnValue(-1, col('B', 4)),
      ]).toEqual(cells(row))
    })
  })

  describe('binary (B)', () => {
    it('shows the low `width` bits of the 16-bit word', () => {
      expect(formatColumnValue(0b10110, col('B', 4))).toBe('0110')
      expect(formatColumnValue(0x1ff, col('B', 8))).toBe('11111111')
    })

    it('shows a full word, zero-padded', () => {
      expect(formatColumnValue(0, col('B', 16))).toBe('0000000000000000')
      expect(formatColumnValue(0xffff, col('B', 16))).toBe('1111111111111111')
    })
  })

  describe('decimal (D)', () => {
    it('reads the 16-bit word as two\'s complement', () => {
      expect(formatColumnValue(0x7fff, col('D', 6))).toBe('32767')
      expect(formatColumnValue(0x8000, col('D', 6))).toBe('-32768')
      expect(formatColumnValue(0xffff, col('D', 6))).toBe('-1')
      expect(formatColumnValue(-1, col('D', 6))).toBe('-1')
    })

    it('does not mask to the column width: width counts characters, not bits', () => {
      expect(formatColumnValue(256, col('D', 8))).toBe('256')
    })

    it('keeps the leftmost `width` characters of a value too wide for its column', () => {
      expect(formatColumnValue(-32123 & 0xffff, col('D', 3))).toBe('-32')
    })
  })

  describe('hexadecimal (X)', () => {
    it('shows 0x and four uppercase digits, cut to `width` from the left', () => {
      expect(formatColumnValue(0xbeef, col('X', 6))).toBe('0xBEEF')
      expect(formatColumnValue(0xbeef, col('X', 4))).toBe('BEEF')
      expect(formatColumnValue(0x1ff, col('X', 2))).toBe('FF')
    })
  })

  describe('string (S)', () => {
    it('shows the value as it is, cut to `width`', () => {
      expect(formatColumnValue(42, col('S', 8))).toBe('42')
      expect(formatColumnValue(12345, col('S', 3))).toBe('123')
    })
  })
})
