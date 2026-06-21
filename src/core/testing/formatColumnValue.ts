// src/core/testing/formatColumnValue.ts
import type { TSTOutputColumn } from './types'

function widthMask(width: number): number {
  return width >= 32 ? 0xFFFFFFFF : (1 << width) - 1
}

/**
 * Format a numeric column value according to the nand2tetris `.tst` output-list column spec.
 * Matches what nand2tetris displays in `.cmp` / `.out` files:
 *   B → binary, padded with leading zeros to `column.width` digits
 *   D → unsigned decimal
 *   X → uppercase hex, padded to ceil(width/4) digits (no "0x" prefix)
 *   S → decimal string (same as D; used for named string fields in some .tst files)
 */
export function formatColumnValue(value: number, column: TSTOutputColumn): string {
  const masked = (value & widthMask(column.width)) >>> 0
  switch (column.format) {
    case 'B':
      return masked.toString(2).padStart(column.width, '0')
    case 'D':
      return String(masked)
    case 'X':
      return masked.toString(16).toUpperCase().padStart(Math.ceil(column.width / 4), '0')
    case 'S':
      return String(masked)
  }
}
