import { createContext } from 'react'
import { colors, materials, semanticColors } from './tokens'

// Theme context for accessing tokens in components
export interface ThemeContextValue {
  colors: typeof colors
  materials: typeof materials
  semanticColors: typeof semanticColors
  isDark: boolean
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
