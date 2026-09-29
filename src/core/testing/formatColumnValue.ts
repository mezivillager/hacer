// src/core/testing/formatColumnValue.ts
import type { TSTOutputColumn } from './types'

/**
 * The last `width` characters, cut with the reference IDE's arithmetic — kept even for a column
 * wider than `digits`, where the negative start counts from the end, so no `.out` line differs.
 */
const fromRight = (digits: string, width: number): string => digits.slice(digits.length - width)

/**
 * One `.out` cell's text, without its padding — what the nand2tetris web IDE's `Output` prints for
 * a `.tst` column, so it matches the book's `.cmp` files. A Hack word is 16 bits:
 *   B → the word's 16 binary digits, the last `width` kept
 *   D → the word read as two's complement (`0xFFFF` is `-1`), the first `width` characters kept
 *   X → `0x` and four uppercase hex digits, the last `width` kept (`%X1.4.1` drops the `0x`)
 *   S → the value as it is, the first `width` characters kept
 * `width` counts characters, not bits.
 */
export function formatColumnValue(value: number, { format, width }: Pick<TSTOutputColumn, 'format' | 'width'>): string {
  const word = value & 0xffff
  switch (format) {
    case 'B':
      return fromRight(word.toString(2).padStart(16, '0'), width)
    case 'X':
      return fromRight(`0x${word.toString(16).toUpperCase().padStart(4, '0')}`, width)
    case 'D':
      return String(word >= 0x8000 ? word - 0x10000 : word).slice(0, width)
    case 'S':
      return String(value).slice(0, width)
  }
}
