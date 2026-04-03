import { useContext } from 'react'
import { ThemeContext } from './ThemeContext'

/** Hook to access theme mode (dark/light/system) and setTheme */
export function useThemeMode() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeMode must be used within a ThemeProvider')
  }
  return context
}

/** @deprecated Use useThemeMode instead */
export const useTheme = useThemeMode
