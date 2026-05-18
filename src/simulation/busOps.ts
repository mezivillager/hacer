/**
 * Create a bitmask with `numBits` ones starting at bit 0.
 * maskForWidth(8) => 0xFF, maskForWidth(16) => 0xFFFF
 */
export function maskForWidth(numBits: number): number {
  if (numBits <= 0) return 0
  if (numBits >= 32) return 0xFFFFFFFF >>> 0
  return ((1 << numBits) - 1) >>> 0
}

/**
 * Read `numBits` bits starting at `startBit` from `value`.
 * readSubBus(0xFF00, 8, 8) => 0xFF
 */
export function readSubBus(value: number, startBit: number, numBits: number): number {
  return ((value >>> startBit) & maskForWidth(numBits)) >>> 0
}

/**
 * Write `numBits` bits of `subValue` into `target` starting at `startBit`.
 * writeSubBus(0, 0xFF, 8, 8) => 0xFF00
 */
export function writeSubBus(
  target: number,
  subValue: number,
  startBit: number,
  numBits: number
): number {
  const mask = maskForWidth(numBits) << startBit
  return ((target & ~mask) | ((subValue << startBit) & mask)) >>> 0
}

/**
 * Clamp a value to the given bit width.
 * clampToWidth(0x1FFFF, 16) => 0xFFFF
 */
export function clampToWidth(value: number, width: number): number {
  return (value & maskForWidth(width)) >>> 0
}
