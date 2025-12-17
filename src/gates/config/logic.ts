// Gate logic functions - pure boolean logic implementations

/**
 * Computes the AND logic operation.
 * Returns true only when both inputs are true.
 *
 * @param a - First boolean input value
 * @param b - Second boolean input value
 * @returns true if both a AND b are true, false otherwise
 *
 * @example
 * andLogic(true, true)   // true
 * andLogic(true, false)  // false
 * andLogic(false, false) // false
 */
export function andLogic(a: boolean, b: boolean): boolean {
  return a && b
}

/**
 * Computes the NAND (NOT-AND) logic operation.
 * Returns true unless both inputs are true.
 *
 * @param a - First boolean input value
 * @param b - Second boolean input value
 * @returns false if both a AND b are true, true otherwise
 *
 * @example
 * nandLogic(true, true)   // false
 * nandLogic(true, false)  // true
 * nandLogic(false, false) // true
 */
export function nandLogic(a: boolean, b: boolean): boolean {
  return !(a && b)
}

/**
 * Computes the OR logic operation.
 * Returns true if at least one input is true.
 *
 * @param a - First boolean input value
 * @param b - Second boolean input value
 * @returns true if a OR b (or both) are true, false otherwise
 *
 * @example
 * orLogic(true, false)  // true
 * orLogic(false, true)  // true
 * orLogic(false, false) // false
 */
export function orLogic(a: boolean, b: boolean): boolean {
  return a || b
}

/**
 * Computes the XOR (exclusive OR) logic operation.
 * Returns true if exactly one input is true (inputs differ).
 *
 * @param a - First boolean input value
 * @param b - Second boolean input value
 * @returns true if a and b have different values, false if they are the same
 *
 * @example
 * xorLogic(true, false)  // true
 * xorLogic(false, true)  // true
 * xorLogic(true, true)   // false
 * xorLogic(false, false) // false
 */
export function xorLogic(a: boolean, b: boolean): boolean {
  return a !== b
}

/**
 * Computes the NOT (inverter) logic operation.
 * Returns the opposite of the input value.
 *
 * @param a - Boolean input value to invert
 * @returns true if input is false, false if input is true
 *
 * @example
 * notLogic(true)  // false
 * notLogic(false) // true
 */
export function notLogic(a: boolean): boolean {
  return !a
}
