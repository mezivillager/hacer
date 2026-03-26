import { describe, expect, it } from 'vitest'

import type { CmpParseResult } from './cmpParser'
import { compareCmpRow, parseCmp } from './cmpParser'
import { project1CmpFixtures } from './project1CmpFixtures'

function expectSuccess(result: CmpParseResult) {
  expect(result.success).toBe(true)
  if (!result.success) throw new Error('Expected success')
  return result.file
}

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
      const cmp = expectSuccess(parseCmp(NAND_CMP))

      expect(cmp.columns.map((column) => column.name)).toEqual(['a', 'b', 'out'])
      expect(cmp.rows).toHaveLength(4)
      expect(cmp.rows[0]?.values).toEqual([0, 0, 1])
      expect(cmp.rows[3]?.values).toEqual([1, 1, 0])
    })

    it('parses Not.cmp', () => {
      const cmp = expectSuccess(parseCmp(NOT_CMP))

      expect(cmp.columns.map((column) => column.name)).toEqual(['in', 'out'])
      expect(cmp.rows).toHaveLength(2)
      expect(cmp.rows[0]?.values).toEqual([0, 1])
      expect(cmp.rows[1]?.values).toEqual([1, 0])
    })

    it('parses multi-bit binary values (Mux4Way16.cmp)', () => {
      const cmp = expectSuccess(parseCmp(MUX4WAY16_CMP))

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
      const cmp = expectSuccess(
        parseCmp(`|    val     |
| 0001001000110100 |`),
      )

      expect(cmp.rows[0]?.values[0]).toBe(0b0001001000110100)
    })

    it('handles empty lines gracefully', () => {
      const cmp = expectSuccess(
        parseCmp(`| a |
| 0 |

| 1 |`),
      )

      expect(cmp.rows).toHaveLength(2)
    })

    it('returns Empty input error for empty string', () => {
      const result = parseCmp('')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0]?.message).toBe('Empty input')
      }
    })

    it('returns Empty input error for whitespace-only string', () => {
      const result = parseCmp('   \n  \n  ')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0]?.message).toBe('Empty input')
      }
    })

    it('reports accurate line numbers when blank lines are present', () => {
      const result = parseCmp(`| a | b |

| 0 |`)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0]?.line).toBe(3)
        expect(result.errors[0]?.message).toMatch(/column count/i)
      }
    })

    it('returns errors on row with mismatched column count', () => {
      const result = parseCmp(`| a | b |
| 0 |`)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0]?.message).toMatch(/column count/i)
      }
    })

    it('returns errors on malformed row without pipe boundaries', () => {
      const result = parseCmp(`| a |
0`)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0]?.message).toMatch(/pipe-delimited/i)
      }
    })

    it('returns errors on partial numeric values like 12abc', () => {
      const result = parseCmp(`| a |
| 12abc |`)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors[0]?.message).toMatch(/non-numeric/i)
      }
    })
  })

  describe('comparison', () => {
    it('returns null for matching row', () => {
      const cmp = expectSuccess(parseCmp(NAND_CMP))
      const result = compareCmpRow([0, 0, 1], cmp.rows[0], cmp.columns)

      expect(result).toBeNull()
    })

    it('returns mismatch detail for wrong value', () => {
      const cmp = expectSuccess(parseCmp(NAND_CMP))
      const result = compareCmpRow([0, 0, 0], cmp.rows[0], cmp.columns)

      expect(result).toEqual({
        row: 0,
        column: 'out',
        expected: 1,
        actual: 0,
      })
    })

    it('returns first mismatch when multiple columns differ', () => {
      const cmp = expectSuccess(parseCmp(NAND_CMP))
      const result = compareCmpRow([1, 1, 1], cmp.rows[0], cmp.columns)

      expect(result?.column).toBe('a')
    })

    it('reports row index provided by caller', () => {
      const cmp = expectSuccess(parseCmp(NAND_CMP))
      const result = compareCmpRow([0, 1, 1], cmp.rows[0], cmp.columns, 3)

      expect(result?.row).toBe(3)
    })

    it('reports first missing value as mismatch when actual row is shorter', () => {
      const cmp = expectSuccess(
        parseCmp(`| a | b | c |
| 1 | 0 | 1 |`),
      )
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
      expect(Object.keys(project1CmpFixtures)).toHaveLength(16)
    })

    for (const [name, cmpStr] of Object.entries(project1CmpFixtures)) {
      it(`parses ${name}.cmp without errors`, () => {
        const result = parseCmp(cmpStr)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.file.columns.length).toBeGreaterThan(0)
          expect(result.file.rows.length).toBeGreaterThan(0)
        }
      })
    }
  })
})
