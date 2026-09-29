import type { OutputRow, TSTOutputColumn, TSTScript } from '@/core'

export function outHeader(_columns: readonly TSTOutputColumn[]): string {
  throw new Error('not implemented')
}

export function outRow(_columns: readonly TSTOutputColumn[], _values: readonly number[]): string {
  throw new Error('not implemented')
}

export function outTable(_script: TSTScript, _rows: readonly OutputRow[]): string {
  throw new Error('not implemented')
}
