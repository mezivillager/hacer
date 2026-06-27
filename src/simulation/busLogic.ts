import { readSubBus, writeSubBus } from './busOps'

/**
 * Split an N-bit value into N single-bit outputs, LSB first.
 * `out[i]` is bit `i` of `inValue`. `evaluateSplitter(0b1011, 4) => [1,1,0,1]`.
 */
export function evaluateSplitter(inValue: number, width: number): number[] {
  const bits: number[] = []
  for (let i = 0; i < width; i++) {
    bits.push(readSubBus(inValue, i, 1))
  }
  return bits
}

/**
 * Join single-bit inputs into one value: `Σ (in_i << i)`.
 * Only the low bit of each input is used. `evaluateJoiner([1,1,0,1]) => 0b1011`.
 */
export function evaluateJoiner(inValues: number[]): number {
  return inValues.reduce((acc, value, i) => writeSubBus(acc, value, i, 1), 0)
}
