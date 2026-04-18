import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ThemeProvider } from './theme-provider'

vi.mock('next-themes', () => ({
  ThemeProvider: ({ children, ...props }: { children: ReactNode } & Record<string, unknown>) => (
    <div data-testid="next-themes-provider" data-props={JSON.stringify(props)}>
      {children}
    </div>
  ),
}))

describe('ThemeProvider', () => {
  it('wraps next-themes ThemeProvider with HACER defaults', () => {
    render(
      <ThemeProvider>
        <span data-testid="child">child</span>
      </ThemeProvider>,
    )
    const provider = screen.getByTestId('next-themes-provider')
    const props = JSON.parse(provider.dataset.props ?? '{}') as Record<string, unknown>
    expect(props.attribute).toBe('class')
    expect(props.defaultTheme).toBe('system')
    expect(props.enableSystem).toBe(true)
    expect(props.disableTransitionOnChange).toBe(true)
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('allows callers to override defaults', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <span>x</span>
      </ThemeProvider>,
    )
    const provider = screen.getByTestId('next-themes-provider')
    const props = JSON.parse(provider.dataset.props ?? '{}') as Record<string, unknown>
    expect(props.defaultTheme).toBe('dark')
  })
})
