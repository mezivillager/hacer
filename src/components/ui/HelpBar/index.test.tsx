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

  it('renders the default help text when no interactive mode is active', () => {
    wrap()
    const text = screen.getByTestId('help-bar-text').textContent ?? ''
    expect(text).toContain('Click pin: Wire')
    expect(text).toContain('Drag body: Move')
    expect(text).toContain('Delete: Remove selected')
  })

  it('shows placement help text when placementMode is set', () => {
    circuitActions.startPlacement('AND')
    wrap()
    const text = screen.getByTestId('help-bar-text').textContent ?? ''
    expect(text).toContain('place the AND gate')
    expect(text).toContain('Esc to cancel')
  })

  it('shows node placement help text when nodePlacementMode is set', () => {
    circuitActions.startNodePlacement('INPUT')
    wrap()
    const text = screen.getByTestId('help-bar-text').textContent ?? ''
    expect(text).toContain('place the node')
  })

  it('shows wiring help text when wiringFrom is set', () => {
    useCircuitStore.setState((s) => {
      s.wiringFrom = {
        fromGateId: 'g1',
        fromPinId: 'p1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0, z: 0 },
        previewEndPosition: null,
        destinationGateId: null,
        destinationPinId: null,
        destinationNodeId: null,
        destinationNodeType: null,
        segments: null,
      }
    })
    wrap()
    const text = screen.getByTestId('help-bar-text').textContent ?? ''
    expect(text).toContain('Click on another pin to connect')
  })

  it('collapse button hides strip and renders floating expand button', async () => {
    const user = userEvent.setup()
    wrap()
    const bar = screen.getByTestId('help-bar')
    const collapseBtn = bar.querySelector('button')
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
