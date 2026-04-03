import { useEffect, useState, type ReactNode } from 'react'
import { ThemeContext, type Theme } from './ThemeContext'

function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') {
    return typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return theme
}

function applyThemeToDOM(resolved: 'dark' | 'light') {
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    root.classList.toggle('dark', resolved === 'dark')
    root.classList.toggle('light', resolved === 'light')
  }
}

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('dark')
  const resolved = resolveTheme(theme)

  // Sync DOM classes whenever resolved theme changes
  useEffect(() => {
    applyThemeToDOM(resolved)
  }, [resolved])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
