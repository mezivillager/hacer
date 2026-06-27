import { describe, it, expect } from 'vitest'
import { evaluateSplitter, evaluateJoiner } from './busLogic'

describe('evaluateSplitter', () => {
  it('splits each bit of the input into a 1-bit output (LSB first)', () => {
    expect(evaluateSplitter(0b1011, 4)).toEqual([1, 1, 0, 1])
  })

  it('returns one entry per bit of width', () => {
    expect(evaluateSplitter(0, 8)).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
  })

  it('ignores bits above the requested width', () => {
    expect(evaluateSplitter(0xFF, 4)).toEqual([1, 1, 1, 1])
  })
})

describe('evaluateJoiner', () => {
  it('packs 1-bit inputs into an N-bit value (in_i << i)', () => {
    expect(evaluateJoiner([1, 1, 0, 1])).toBe(0b1011)
  })

  it('round-trips with evaluateSplitter', () => {
    expect(evaluateJoiner(evaluateSplitter(0b1011, 4))).toBe(0b1011)
  })

  it('uses only the low bit of each input', () => {
    expect(evaluateJoiner([3, 0, 2])).toBe(0b001)
  })
})
