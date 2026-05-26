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

  // Regression guard for the 2026-05-26 report. The shadcn `<Button>`
  // primitive sets `disabled:pointer-events-none disabled:opacity-50`, so
  // a `disabled` <button> can't receive hover or be tabbed to. When
  // <ComingSoon> wrapped the disabled button directly with
  // <TooltipTrigger asChild>, the trigger was effectively dead — no
  // tooltip ever appeared on the stub Quick Actions / Undo / Redo / etc.
  // ComingSoon must wrap a focusable host element around the disabled
  // control so hover and tab both reach a live tooltip trigger.
  it('shows tooltip on focus even when the wrapped control is disabled', async () => {
    const user = userEvent.setup()
    wrap(
      <ComingSoon>
        <button disabled>noop</button>
      </ComingSoon>,
    )
    await user.tab()
    const matches = await screen.findAllByText(/coming soon/i)
    expect(matches.length).toBeGreaterThan(0)
  })

  // Visual cue: the wrapper carries `cursor-not-allowed` so the pointer
  // signals "disabled" even on a `variant="ghost"` button where the
  // 50% opacity cue alone is subtle on a transparent background.
  it('applies a not-allowed cursor on the focusable wrapper', () => {
    wrap(
      <ComingSoon>
        <button disabled>noop</button>
      </ComingSoon>,
    )
    const trigger = screen.getByTestId('coming-soon-trigger')
    expect(trigger.className).toMatch(/cursor-not-allowed/)
  })

  // w-full consumers (PropertiesPanel "Color", RightActionBar
  // "Generate Truth Table") need the focusable wrapper to fill its
  // parent. Surface a `triggerClassName` escape hatch so they can
  // pass `block w-full` without bespoke wrappers per call site.
  it('forwards triggerClassName to the focusable wrapper', () => {
    wrap(
      <ComingSoon triggerClassName="block w-full">
        <button disabled>noop</button>
      </ComingSoon>,
    )
    const trigger = screen.getByTestId('coming-soon-trigger')
    expect(trigger.className).toMatch(/block/)
    expect(trigger.className).toMatch(/w-full/)
  })
})
