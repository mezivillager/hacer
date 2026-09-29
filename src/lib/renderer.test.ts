import { describe, expect, it } from 'vitest'
import { resolveRendererFromSearchParams } from './renderer'

describe('resolveRendererFromSearchParams', () => {
  it('defaults to the 3D renderer for an empty search', () => {
    expect(resolveRendererFromSearchParams('')).toBe('r3f')
  })

  it('selects no renderer for renderer=none, with or without the leading ?', () => {
    expect(resolveRendererFromSearchParams('?renderer=none')).toBe('none')
    expect(resolveRendererFromSearchParams('renderer=none')).toBe('none')
  })

  it('reads renderer=none alongside other params', () => {
    expect(resolveRendererFromSearchParams('?notour=1&renderer=none')).toBe('none')
  })

  it('selects the 3D renderer for renderer=r3f', () => {
    expect(resolveRendererFromSearchParams('?renderer=r3f')).toBe('r3f')
  })

  it('falls back to the 3D renderer for unknown or empty values', () => {
    expect(resolveRendererFromSearchParams('?renderer=2d')).toBe('r3f')
    expect(resolveRendererFromSearchParams('?renderer=NONE')).toBe('r3f')
    expect(resolveRendererFromSearchParams('?renderer=')).toBe('r3f')
    expect(resolveRendererFromSearchParams('?notour=1')).toBe('r3f')
  })
})
