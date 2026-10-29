import type { TSTOutputColumn } from './types'

/** A column's `.out` header cell, as the reference IDE's `Output` writes it: the name centred in `padLeft + width + padRight`, cut to fit. */
export function headerCell({ name, padLeft, width, padRight }: TSTOutputColumn): string {
  const space = padLeft + width + padRight
  const left = Math.max(0, Math.floor((space - name.length) / 2))
  return (' '.repeat(left) + name).padEnd(space).slice(0, space)
}
