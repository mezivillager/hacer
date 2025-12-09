import { ReactNode } from 'react'
import { ConfigProvider, theme as antdTheme } from 'antd'
import { colors, materials, semanticColors } from './tokens'
import { ThemeContext, type ThemeContextValue } from './ThemeContext'

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
