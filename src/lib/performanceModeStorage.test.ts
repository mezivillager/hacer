import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PERFORMANCE_MODE_STORAGE_KEY,
  isPerformanceMode,
  readPerformanceMode,
  writePerformanceMode,
} from './performanceModeStorage'

describe('performanceModeStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('accepts only known performance modes', () => {
    expect(isPerformanceMode('normal')).toBe(true)
    expect(isPerformanceMode('low-power')).toBe(true)
    expect(isPerformanceMode('fast')).toBe(false)
    expect(isPerformanceMode(null)).toBe(false)
  })

  it('defaults to normal when no value is stored', () => {
    expect(readPerformanceMode()).toBe('normal')
  })

  it('reads a stored low-power value', () => {
    localStorage.setItem(PERFORMANCE_MODE_STORAGE_KEY, 'low-power')

    expect(readPerformanceMode()).toBe('low-power')
  })

  it('falls back to normal for invalid stored values', () => {
    localStorage.setItem(PERFORMANCE_MODE_STORAGE_KEY, 'turbo')

    expect(readPerformanceMode()).toBe('normal')
  })

  it('writes selected mode to localStorage', () => {
    writePerformanceMode('low-power')

    expect(localStorage.getItem(PERFORMANCE_MODE_STORAGE_KEY)).toBe('low-power')
  })

  it('does not throw if localStorage rejects writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })

    expect(() => writePerformanceMode('low-power')).not.toThrow()
  })
})
