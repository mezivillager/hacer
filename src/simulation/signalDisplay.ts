/**
 * Whether a numeric signal should be treated as logically high for visuals.
 * Bitwise gate logic may propagate values other than 0/1; any non-zero reads as high.
 */
export function isSignalHigh(value: number): boolean {
  return value !== 0
}

/** Label text for I/O nodes: 0/1 for single-bit, decimal string for wider values. */
export function formatSignalLabel(value: number): string {
  if (value === 0) return '0'
  if (value === 1) return '1'
  return String(value)
}
