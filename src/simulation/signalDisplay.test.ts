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
