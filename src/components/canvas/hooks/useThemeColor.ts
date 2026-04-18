import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Color } from 'three'

const FALLBACK = '#888888'

/**
 * Read a CSS custom property off documentElement and return it as a
 * THREE.Color. Re-reads when the resolved theme changes (next-themes
 * flips the `.dark` class on <html>, causing the same CSS variable to
 * resolve to a different color).
 *
 * Requires THREE \u2265 0.170 for OKLch parsing via Color.setStyle. HACER
 * uses 0.183.
 */
export function useThemeColor(cssVar: string): Color {
  const { resolvedTheme } = useTheme()
  const [color, setColor] = useState(() => readCssColor(cssVar))

  useEffect(() => {
    // We intentionally call setState synchronously here to sync the
    // THREE.Color whenever the resolved theme (or cssVar) changes \u2014
    // the CSS variable resolves to a different value once the .dark
    // class flips. This is the documented Radix/React-Compiler pattern
    // for syncing external mutable state into React state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColor(readCssColor(cssVar))
  }, [resolvedTheme, cssVar])

  return color
}

function readCssColor(cssVar: string): Color {
  if (typeof window === 'undefined') return new Color(FALLBACK)
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim()
  const c = new Color()
  try {
    if (!value) {
      c.set(FALLBACK)
    } else {
      c.setStyle(value)
    }
  } catch {
    c.set(FALLBACK)
  }
  return c
}
