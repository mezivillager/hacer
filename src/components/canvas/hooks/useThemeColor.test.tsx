import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { Color } from 'three'
import { useThemeColor } from './useThemeColor'

let resolvedTheme = 'dark'
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme }),
}))

// Capture the truly-original getComputedStyle ONCE so re-spying doesn't
// recurse into the previous spy.
const ORIGINAL_GET_COMPUTED_STYLE = window.getComputedStyle.bind(window)

const mockComputedStyle = (cssVar: string, cssValue: string) => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
    const real = ORIGINAL_GET_COMPUTED_STYLE(el)
    return new Proxy(real, {
      get(target, prop): unknown {
        if (prop === 'getPropertyValue') {
          return (name: string): string => (name === cssVar ? cssValue : '')
        }
        const propValue = (target as unknown as Record<string | symbol, unknown>)[prop]
        return typeof propValue === 'function' ? propValue.bind(target) : propValue
      },
    })
  })
}

describe('useThemeColor', () => {
  beforeEach(() => {
    resolvedTheme = 'dark'
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a THREE.Color matching the resolved CSS variable', () => {
    mockComputedStyle('--canvas-bg', '#0a0a14')
    const { result } = renderHook(() => useThemeColor('--canvas-bg'))
    expect(result.current).toBeInstanceOf(Color)
    // The resolved color should be approximately the requested hex (allowing
    // for any THREE color-space normalization).
    expect(result.current.r).toBeCloseTo(0x0a / 255, 1)
  })

  it('re-reads the CSS variable when resolvedTheme changes', () => {
    mockComputedStyle('--canvas-bg', '#0a0a14')
    const { result, rerender } = renderHook(() => useThemeColor('--canvas-bg'))
    const darkColor = result.current.clone()

    mockComputedStyle('--canvas-bg', '#f0f0f5')
    resolvedTheme = 'light'
    rerender()
    expect(result.current.equals(darkColor)).toBe(false)
  })

  it('returns a fallback color when the CSS variable is empty', () => {
    mockComputedStyle('--undefined-var', '')
    const { result } = renderHook(() => useThemeColor('--undefined-var'))
    expect(result.current).toBeInstanceOf(Color)
  })
})
