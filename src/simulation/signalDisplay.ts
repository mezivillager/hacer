import { formatValue } from '@/components/ui/multiBitFormat'

/**
 * Whether a numeric signal should be treated as logically high for visuals.
 * Bitwise gate logic may propagate values other than 0/1; any non-zero reads as high.
 */
export function isSignalHigh(value: number): boolean {
  return value !== 0
}

/** Label text for I/O nodes: 0/1 for single-bit, hex for multi-bit values. */
export function formatSignalLabel(value: number, width: number = 1): string {
  if (width <= 1) return String(value)
  return formatValue(value, width, 'X')
}
