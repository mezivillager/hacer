// Gate logic functions - pure number logic implementations (0 = false, 1 = true)

/**
 * Computes the AND logic operation.
 * Returns 1 only when both inputs are 1.
 *
 * @param a - First number input value (0 or 1)
 * @param b - Second number input value (0 or 1)
 * @returns 1 if both a AND b are 1, 0 otherwise
 *
 * @example
 * andLogic(1, 1)   // 1
 * andLogic(1, 0)   // 0
 * andLogic(0, 0)   // 0
 */
export function andLogic(a: number, b: number): number {
  return a & b
}

/**
 * Computes the NAND (NOT-AND) logic operation.
 * Returns 1 unless both inputs are 1.
 *
 * @param a - First number input value (0 or 1)
 * @param b - Second number input value (0 or 1)
 * @returns 0 if both a AND b are 1, 1 otherwise
 *
 * @example
 * nandLogic(1, 1)   // 0
 * nandLogic(1, 0)   // 1
 * nandLogic(0, 0)   // 1
 */
export function nandLogic(a: number, b: number): number {
  return (a & b) ^ 1
}

/**
 * Computes the OR logic operation.
 * Returns 1 if at least one input is 1.
 *
 * @param a - First number input value (0 or 1)
 * @param b - Second number input value (0 or 1)
 * @returns 1 if a OR b (or both) are 1, 0 otherwise
 *
 * @example
 * orLogic(1, 0)   // 1
 * orLogic(0, 1)   // 1
 * orLogic(0, 0)   // 0
 */
export function orLogic(a: number, b: number): number {
  return a | b
}

/**
 * Computes the XOR (exclusive OR) logic operation.
 * Returns 1 if exactly one input is 1 (inputs differ).
 *
 * @param a - First number input value (0 or 1)
 * @param b - Second number input value (0 or 1)
 * @returns 1 if a and b have different values, 0 if they are the same
 *
 * @example
 * xorLogic(1, 0)   // 1
 * xorLogic(0, 1)   // 1
 * xorLogic(1, 1)   // 0
 * xorLogic(0, 0)   // 0
 */
export function xorLogic(a: number, b: number): number {
  return a ^ b
}

/**
 * Computes the NOT (inverter) logic operation.
 * Returns the opposite of the input value.
 *
 * @param a - Number input value to invert (0 or 1)
 * @returns 1 if input is 0, 0 if input is 1
 *
 * @example
 * notLogic(1)   // 0
 * notLogic(0)   // 1
 */
export function notLogic(a: number): number {
  return a ^ 1
}
