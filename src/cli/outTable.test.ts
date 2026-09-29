import { describe, expect, it } from 'vitest'
import type { TSTOutputColumn } from '@/core'
import { outHeader, outRow } from './outTable'

const column = (
  name: string,
  format: TSTOutputColumn['format'],
  padLeft: number,
  width: number,
  padRight: number,
): TSTOutputColumn => ({ name, format, padLeft, width, padRight })

describe('outHeader', () => {
  it('centres each name in its cell, one space more on the right when the spare space is odd', () => {
    expect(outHeader([column('a', 'B', 1, 16, 1), column('sel', 'B', 2, 2, 2)])).toBe('|        a         | sel  |')
  })

  it('cuts a name longer than its cell', () => {
    expect(outHeader([column('address', 'D', 1, 3, 1)])).toBe('|addre|')
  })
})

describe('outRow', () => {
  it.each<[string, TSTOutputColumn, number, string]>([
    ['B shows the low `width` bits', column('x', 'B', 1, 4, 1), 0b10110, ' 0110 '],
    ['D reads a 16-bit word as signed and aligns right', column('x', 'D', 1, 6, 1), 0xffff, '     -1 '],
    ['X shows 0x and four hex digits, cut to `width` from the left', column('x', 'X', 1, 4, 1), 0xbeef, ' BEEF '],
    ['S shows the value and aligns left', column('x', 'S', 1, 4, 1), 12, ' 12   '],
  ])('%s', (_, col, value, cell) => {
    expect(outRow([col], [value])).toBe(`|${cell}|`)
  })
})
