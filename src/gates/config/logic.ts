// Gate logic for 3D display preview — matches simulation/gateLogic (0/1 single-bit; raw |/& for wider ints).

/**
 * Computes the AND logic operation (bitwise for single-bit).
 */
export function andLogic(a: number, b: number): number {
  return a & b
}

/**
 * Computes the NAND logic operation.
 */
export function nandLogic(a: number, b: number): number {
  return (a & b) ^ 1
}

/**
 * Computes the OR logic operation (bitwise for single-bit).
 */
export function orLogic(a: number, b: number): number {
  return a | b
}

/**
 * Computes the XOR logic operation.
 */
export function xorLogic(a: number, b: number): number {
  return a ^ b
}

/**
 * Computes the NOT (inverter) logic operation.
 */
export function notLogic(a: number): number {
  return a ^ 1
}
