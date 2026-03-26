import { describe, expect, it } from 'vitest'

import { compareCmpRow, parseCmp } from './cmpParser'
import { PROJECT1_CMP_FIXTURES } from './project1CmpFixtures'

const NAND_CMP = `| a | b |out|
| 0 | 0 | 1 |
| 0 | 1 | 1 |
| 1 | 0 | 1 |
| 1 | 1 | 0 |`

const NOT_CMP = `|in |out|
| 0 | 1 |
| 1 | 0 |`

const MUX4WAY16_CMP = `|        a         |        b         |        c         |        d         | sel  |       out        |
| 0000000000000000 | 0000000000000000 | 0000000000000000 | 0000000000000000 |  00  | 0000000000000000 |
| 0000000000000000 | 0000000000000000 | 0000000000000000 | 0000000000000000 |  01  | 0000000000000000 |`

describe('CMP Parser', () => {
  describe('parsing', () => {
    it('parses Nand.cmp header and rows', () => {
      const cmp = parseCmp(NAND_CMP)

      expect(cmp.columns.map((column) => column.name)).toEqual(['a', 'b', 'out'])
      expect(cmp.rows).toHaveLength(4)
      expect(cmp.rows[0]?.values).toEqual([0, 0, 1])
      expect(cmp.rows[3]?.values).toEqual([1, 1, 0])
    })

    it('parses Not.cmp', () => {
      const cmp = parseCmp(NOT_CMP)

      expect(cmp.columns.map((column) => column.name)).toEqual(['in', 'out'])
      expect(cmp.rows).toHaveLength(2)
      expect(cmp.rows[0]?.values).toEqual([0, 1])
      expect(cmp.rows[1]?.values).toEqual([1, 0])
    })

    it('parses multi-bit binary values (Mux4Way16.cmp)', () => {
      const cmp = parseCmp(MUX4WAY16_CMP)

      expect(cmp.columns.map((column) => column.name)).toEqual([
        'a',
        'b',
        'c',
        'd',
        'sel',
        'out',
      ])
      expect(cmp.rows).toHaveLength(2)
      expect(cmp.rows[0]?.values).toEqual([0, 0, 0, 0, 0, 0])
      expect(cmp.rows[1]?.values[4]).toBe(1)
    })

    it('parses binary values like 0001001000110100 as integers', () => {
      const cmp = parseCmp(`|    val     |
| 0001001000110100 |`)

      expect(cmp.rows[0]?.values[0]).toBe(0b0001001000110100)
    })

    it('handles empty lines gracefully', () => {
      const cmp = parseCmp(`| a |
| 0 |

| 1 |`)

      expect(cmp.rows).toHaveLength(2)
    })

    it('throws on row with mismatched column count', () => {
      expect(() => parseCmp(`| a | b |
| 0 |`)).toThrowError(/column count/i)
    })

    it('throws on malformed row without pipe boundaries', () => {
      expect(() => parseCmp(`| a |
0`)).toThrowError(/pipe-delimited/i)
    })
  })

  describe('comparison', () => {
    it('returns null for matching row', () => {
      const cmp = parseCmp(NAND_CMP)
      const result = compareCmpRow([0, 0, 1], cmp.rows[0], cmp.columns)

      expect(result).toBeNull()
    })

    it('returns mismatch detail for wrong value', () => {
      const cmp = parseCmp(NAND_CMP)
      const result = compareCmpRow([0, 0, 0], cmp.rows[0], cmp.columns)

      expect(result).toEqual({
        row: 0,
        column: 'out',
        expected: 1,
        actual: 0,
      })
    })

    it('returns first mismatch when multiple columns differ', () => {
      const cmp = parseCmp(NAND_CMP)
      const result = compareCmpRow([1, 1, 1], cmp.rows[0], cmp.columns)

      expect(result?.column).toBe('a')
    })

    it('reports row index provided by caller', () => {
      const cmp = parseCmp(NAND_CMP)
      const result = compareCmpRow([0, 1, 1], cmp.rows[0], cmp.columns, 3)

      expect(result?.row).toBe(3)
    })

    it('reports first missing value as mismatch when actual row is shorter', () => {
      const cmp = parseCmp(`| a | b | c |
| 1 | 0 | 1 |`)
      const result = compareCmpRow([1, 0], cmp.rows[0], cmp.columns)

      expect(result).toEqual({
        row: 0,
        column: 'c',
        expected: 1,
        actual: NaN,
      })
    })
  })

  describe('all Project 1 CMP files parse', () => {
    it('contains exactly 16 fixture entries', () => {
      expect(Object.keys(PROJECT1_CMP_FIXTURES)).toHaveLength(16)
    })

    for (const [name, cmpStr] of Object.entries(PROJECT1_CMP_FIXTURES)) {
      it(`parses ${name}.cmp without errors`, () => {
        const cmp = parseCmp(cmpStr)

        expect(cmp.columns.length).toBeGreaterThan(0)
        expect(cmp.rows.length).toBeGreaterThan(0)
      })
    }
  })
})
