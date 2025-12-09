import { createContext, useContext, ReactNode } from 'react'
import { ConfigProvider, theme as antdTheme } from 'antd'
import { colors, materials, semanticColors } from './tokens'

// Theme context for accessing tokens in components
interface ThemeContextValue {
  colors: typeof colors
  materials: typeof materials
  semanticColors: typeof semanticColors
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeValue: ThemeContextValue = {
    colors,
    materials,
    semanticColors,
    isDark: true, // For future light/dark mode support
  }

  return (
    <ThemeContext.Provider value={themeValue}>
      <ConfigProvider
        theme={{
          algorithm: antdTheme.darkAlgorithm,
          token: {
            colorPrimary: colors.primary,
            borderRadius: 6,
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}

// Hook to access theme tokens
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Direct access to colors for non-React contexts (e.g., CSS-in-JS)
export { colors, materials, semanticColors }
