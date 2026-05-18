import { describe, it, expect } from 'vitest'
import { maskForWidth, readSubBus, writeSubBus, clampToWidth } from './busOps'

describe('maskForWidth', () => {
  it('returns 0 for non-positive widths', () => {
    expect(maskForWidth(0)).toBe(0)
    expect(maskForWidth(-1)).toBe(0)
  })

  it('returns masks for Project 1 widths', () => {
    expect(maskForWidth(1)).toBe(0x1)
    expect(maskForWidth(8)).toBe(0xFF)
    expect(maskForWidth(16)).toBe(0xFFFF)
  })

  it('caps widths of 32 or more at an unsigned 32-bit mask', () => {
    expect(maskForWidth(32)).toBe(0xFFFFFFFF >>> 0)
    expect(maskForWidth(64)).toBe(0xFFFFFFFF >>> 0)
  })
})

describe('readSubBus', () => {
  it('reads lower and upper bytes', () => {
    expect(readSubBus(0xFF00, 0, 8)).toBe(0)
    expect(readSubBus(0xFF00, 8, 8)).toBe(0xFF)
  })

  it('reads single bits and full 16-bit values', () => {
    expect(readSubBus(0b1010, 1, 1)).toBe(1)
    expect(readSubBus(0b1010, 0, 1)).toBe(0)
    expect(readSubBus(0x1234, 0, 16)).toBe(0x1234)
  })
})

describe('writeSubBus', () => {
  it('writes byte ranges while preserving unrelated bits', () => {
    expect(writeSubBus(0, 0xFF, 8, 8)).toBe(0xFF00)
    expect(writeSubBus(0xFF00, 0xAB, 0, 8)).toBe(0xFFAB)
  })

  it('round-trips with readSubBus', () => {
    const value = writeSubBus(0, 0x42, 4, 8)
    expect(readSubBus(value, 4, 8)).toBe(0x42)
  })
})

describe('clampToWidth', () => {
  it('clamps oversized values to the requested width', () => {
    expect(clampToWidth(0x1FFFF, 16)).toBe(0xFFFF)
  })

  it('leaves values unchanged when they fit', () => {
    expect(clampToWidth(0xFF, 16)).toBe(0xFF)
  })
})
