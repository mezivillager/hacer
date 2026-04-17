import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui-kit/tooltip'
import { ComingSoon } from './coming-soon'

const wrap = (ui: ReactNode) =>
  render(<TooltipProvider delayDuration={0}>{ui}</TooltipProvider>)

describe('ComingSoon', () => {
  it('renders children', () => {
    wrap(<ComingSoon><button>foo</button></ComingSoon>)
    expect(screen.getByRole('button', { name: /foo/i })).toBeInTheDocument()
  })

  it('shows "Coming soon" tooltip on focus by default', async () => {
    // Radix Tooltip opens on focus or pointer events; userEvent.hover fires
    // mouseenter which Radix doesn't handle in jsdom. Focus is more reliable.
    // Radix renders tooltip content twice (visible + a11y duplicate); use
    // findAllByText and assert at least one match.
    const user = userEvent.setup()
    wrap(<ComingSoon><button>foo</button></ComingSoon>)
    await user.tab()
    const matches = await screen.findAllByText(/coming soon/i)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('honors a custom label', async () => {
    const user = userEvent.setup()
    wrap(<ComingSoon label="Not yet"><button>foo</button></ComingSoon>)
    await user.tab()
    const matches = await screen.findAllByText(/not yet/i)
    expect(matches.length).toBeGreaterThan(0)
  })
})
