import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TooltipProvider } from '@/components/ui-kit/tooltip'
import { HelpBar } from './index'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'

const wrap = () =>
  render(
    <TooltipProvider delayDuration={0}>
      <HelpBar />
    </TooltipProvider>,
  )

describe('HelpBar', () => {
  beforeEach(() => {
    circuitActions.clearCircuit()
    circuitActions.deselectAll()
    circuitActions.cancelPlacement()
    circuitActions.cancelNodePlacement()
    circuitActions.cancelJunctionPlacement()
    useCircuitStore.setState((s) => {
      s.wiringFrom = null
    })
    window.localStorage.removeItem('helpBarCollapsed')
  })

  it('default mode shows Click/Drag/Scroll hints', () => {
    wrap()
    const bar = screen.getByTestId('help-bar')
    expect(bar.textContent).toContain('Click')
    expect(bar.textContent).toContain('Zoom')
  })

  it('selecting mode shows Delete/arrows/Esc hints when gate selected', () => {
    circuitActions.startPlacement('AND')
    circuitActions.placeGate({ x: 1, y: 0.2, z: 1 })
    const id = useCircuitStore.getState().gates[0].id
    circuitActions.selectGate(id)
    wrap()
    const bar = screen.getByTestId('help-bar')
    expect(bar.textContent).toContain('Remove')
    expect(bar.textContent).toContain('Rotate gate')
  })

  it('moving mode shows Esc/Click hints when placementMode is set', () => {
    circuitActions.startPlacement('AND')
    wrap()
    const bar = screen.getByTestId('help-bar')
    expect(bar.textContent).toContain('Place')
    expect(bar.textContent).toContain('Cancel')
  })

  it('collapse button hides strip and renders floating expand button', async () => {
    const user = userEvent.setup()
    wrap()
    const bar = screen.getByTestId('help-bar')
    const collapseBtn = bar.querySelector('button[aria-label="Hide help bar"], button')
    if (!collapseBtn) throw new Error('collapse button not found')
    await user.click(collapseBtn)
    await waitFor(() => {
      expect(screen.queryByTestId('help-bar')).not.toBeInTheDocument()
      expect(screen.getByTestId('help-bar-expand-button')).toBeInTheDocument()
    })
  })

  it('expand button restores the strip; collapsed state persists across remount', async () => {
    const user = userEvent.setup()
    const { unmount } = wrap()
    const bar = screen.getByTestId('help-bar')
    const collapseBtn = bar.querySelector('button')
    await user.click(collapseBtn!)
    expect(window.localStorage.getItem('helpBarCollapsed')).toBe('true')
    unmount()
    wrap()
    expect(screen.queryByTestId('help-bar')).not.toBeInTheDocument()
    expect(screen.getByTestId('help-bar-expand-button')).toBeInTheDocument()
  })

  it('"All shortcuts" button opens modal', async () => {
    const user = userEvent.setup()
    wrap()
    await user.click(screen.getByTestId('help-bar-all-shortcuts'))
    expect(await screen.findByTestId('shortcuts-modal')).toBeInTheDocument()
  })

  it('? key opens modal', async () => {
    const user = userEvent.setup()
    wrap()
    await user.keyboard('?')
    expect(await screen.findByTestId('shortcuts-modal')).toBeInTheDocument()
  })

  it('? key does NOT open modal when input is focused', async () => {
    const user = userEvent.setup()
    wrap()
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    await user.keyboard('?')
    expect(screen.queryByTestId('shortcuts-modal')).not.toBeInTheDocument()
    document.body.removeChild(input)
  })
})
