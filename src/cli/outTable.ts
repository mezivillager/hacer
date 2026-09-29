/**
 * The `.out` table the reference IDE writes, after its `Output` class: `|`-separated cells of
 * `padLeft + width + padRight` characters, names centred, B/X/S values left and D values right.
 * For a correct chip it is the chip's `.cmp`, byte for byte.
 */
import type { OutputRow, TSTOutputColumn, TSTScript } from '@/core'

const line = (cells: readonly string[]): string => `|${cells.join('|')}|`

function headerCell({ name, padLeft, width, padRight }: TSTOutputColumn): string {
  const space = padLeft + width + padRight
  const left = Math.max(0, Math.floor((space - name.length) / 2))
  return (' '.repeat(left) + name).padEnd(space).slice(0, space)
}

/** A Hack word is 16 bits: B and X show its low digits, D reads it as two's complement. */
function digits(value: number, { format, width }: TSTOutputColumn): string {
  const word = value & 0xffff
  if (format === 'B') return word.toString(2).padStart(16, '0').slice(-width)
  if (format === 'X') return `0x${word.toString(16).toUpperCase().padStart(4, '0')}`.slice(-width)
  if (format === 'D') return String(word >= 0x8000 ? word - 0x10000 : word)
  return String(value)
}

function valueCell(column: TSTOutputColumn, value: number): string {
  const { format, padLeft, width, padRight } = column
  const text = digits(value, column).slice(0, width)
  return ' '.repeat(padLeft) + (format === 'D' ? text.padStart(width) : text.padEnd(width)) + ' '.repeat(padRight)
}

export const outHeader = (columns: readonly TSTOutputColumn[]): string => line(columns.map(headerCell))

/** One `output` line; `values` follow `columns`. */
export const outRow = (columns: readonly TSTOutputColumn[], values: readonly number[]): string =>
  line(columns.map((column, index) => valueCell(column, values[index] ?? 0)))

/** A run's `.out`: a header at each `output-list`, a line per row, up to where a failed run stopped. */
export function outTable(script: TSTScript, rows: readonly OutputRow[]): string {
  const lines: string[] = []
  let columns: TSTOutputColumn[] = []
  let next = 0
  for (const cmd of script.commands) {
    if (cmd.type === 'output-list') {
      columns = cmd.columns
      lines.push(outHeader(columns))
    } else if (cmd.type === 'output') {
      const row = rows[next++]
      if (!row) break
      lines.push(outRow(columns, columns.map((column) => row.values[column.name] ?? 0)))
    }
  }
  return lines.map((text) => `${text}\n`).join('')
}
