import { describe, it, expect } from 'vitest'
import { formatSignalLabel, isSignalHigh } from './signalDisplay'

describe('isSignalHigh', () => {
  it('treats zero as low', () => {
    expect(isSignalHigh(0)).toBe(false)
  })

  it('treats one as high', () => {
    expect(isSignalHigh(1)).toBe(true)
  })

  it('treats other non-zero bitmask values as high', () => {
    expect(isSignalHigh(2)).toBe(true)
    expect(isSignalHigh(3)).toBe(true)
    expect(isSignalHigh(16)).toBe(true)
  })
})

describe('formatSignalLabel', () => {
  it('formats 0 and 1', () => {
    expect(formatSignalLabel(0)).toBe('0')
    expect(formatSignalLabel(1)).toBe('1')
  })

  it('uses decimal string for multi-bit values', () => {
    expect(formatSignalLabel(3)).toBe('3')
    expect(formatSignalLabel(16)).toBe('16')
  })
})

describe('formatSignalLabel — multi-bit (P05-13)', () => {
  it('single-bit unchanged', () => {
    expect(formatSignalLabel(0, 1)).toBe('0')
    expect(formatSignalLabel(1, 1)).toBe('1')
  })
  it('multi-bit renders as hex with 0x prefix', () => {
    expect(formatSignalLabel(0xFF, 8)).toBe('0xFF')
  })
  it('multi-bit pads hex to ceil(width/4)', () => {
    expect(formatSignalLabel(0x5, 16)).toBe('0x0005')
  })
  it('falls back to single-bit behavior when width is omitted', () => {
    expect(formatSignalLabel(1)).toBe('1')
  })
})
