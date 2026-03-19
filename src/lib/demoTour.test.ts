import { describe, expect, it } from 'vitest'
import { shouldSuppressDemoTourFromSearchParams } from './demoTour'

describe('shouldSuppressDemoTourFromSearchParams', () => {
  it('is false for empty search', () => {
    expect(shouldSuppressDemoTourFromSearchParams('')).toBe(false)
  })

  it('respects notour=1', () => {
    expect(shouldSuppressDemoTourFromSearchParams('?notour=1')).toBe(true)
    expect(shouldSuppressDemoTourFromSearchParams('notour=1')).toBe(true)
  })

  it('respects noTour=1', () => {
    expect(shouldSuppressDemoTourFromSearchParams('?noTour=1')).toBe(true)
  })

  it('ignores other values', () => {
    expect(shouldSuppressDemoTourFromSearchParams('?notour=0')).toBe(false)
    expect(shouldSuppressDemoTourFromSearchParams('?foo=1')).toBe(false)
  })
})
