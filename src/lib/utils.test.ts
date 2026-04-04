import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn()', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes via clsx', () => {
    const isHidden = false
    expect(cn('base', isHidden && 'hidden', 'extra')).toBe('base extra')
  })

  it('deduplicates conflicting Tailwind classes via tailwind-merge', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2')
  })

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('')
  })

  it('handles undefined and null inputs', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b')
  })

  it('merges array inputs', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })

  it('handles object syntax from clsx', () => {
    expect(cn({ hidden: true, visible: false }, 'base')).toBe('hidden base')
  })
})
