import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TooltipProvider } from '@/components/ui-kit/tooltip'
import { RightActionBar } from './RightActionBar'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'

const wrap = () =>
  render(
    <TooltipProvider delayDuration={0}>
      <RightActionBar />
    </TooltipProvider>,
  )

function placeGate(type: 'AND' | 'OR' | 'NAND', x: number, z: number) {
  circuitActions.startPlacement(type)
  circuitActions.placeGate({ x, y: 0.2, z })
}

describe('RightActionBar', () => {
  beforeEach(() => {
    circuitActions.clearCircuit()
    if (useCircuitStore.getState().simulationRunning) circuitActions.toggleSimulation()
  })

  it('drawer is collapsed by default (info panel not visible)', () => {
    wrap()
    expect(screen.queryByTestId('info-panel')).not.toBeInTheDocument()
  })

  it('clicking Info trigger opens drawer with Info panel', async () => {
    const user = userEvent.setup()
    wrap()
    await user.click(screen.getByTestId('right-bar-info-trigger'))
    expect(await screen.findByTestId('info-panel')).toBeInTheDocument()
  })

  it('Info panel shows correct counts from store', async () => {
    const user = userEvent.setup()
    placeGate('AND', 1, 1)
    placeGate('OR', 5, 1)
    wrap()
    await user.click(screen.getByTestId('right-bar-info-trigger'))
    expect((await screen.findByTestId('info-stat-gates')).textContent).toContain('2')
  })

  it('Info status pill reflects simulationRunning', async () => {
    const user = userEvent.setup()
    circuitActions.toggleSimulation()
    wrap()
    await user.click(screen.getByTestId('right-bar-info-trigger'))
    expect((await screen.findByTestId('info-status-pill')).textContent).toMatch(/running/i)
  })

  it('clicking Layers shows empty state copy', async () => {
    const user = userEvent.setup()
    wrap()
    await user.click(screen.getByTestId('right-bar-layers-trigger'))
    const layersPanel = await screen.findByTestId('layers-panel')
    expect(layersPanel.textContent?.toLowerCase()).toContain('coming soon')
  })

  it('clicking History shows empty state copy', async () => {
    const user = userEvent.setup()
    wrap()
    await user.click(screen.getByTestId('right-bar-history-trigger'))
    const historyPanel = await screen.findByTestId('history-panel')
    expect(historyPanel.textContent?.toLowerCase()).toMatch(/no history|coming soon/)
  })

  it('Undo, Redo, Find, Maximize render as disabled stub buttons', () => {
    // Note: disabled buttons can't receive focus in jsdom (or browsers), so
    // Radix tooltip doesn't open on focus. The ComingSoon wrapper is itself
    // tested in coming-soon.test.tsx; here we just verify the stub intent.
    wrap()
    for (const tid of ['right-bar-undo', 'right-bar-redo', 'right-bar-find', 'right-bar-maximize']) {
      expect(screen.getByTestId(tid)).toBeDisabled()
    }
  })

  it('clicking the active tab again collapses the drawer', async () => {
    const user = userEvent.setup()
    wrap()
    const trigger = screen.getByTestId('right-bar-info-trigger')
    await user.click(trigger)
    expect(await screen.findByTestId('info-panel')).toBeInTheDocument()
    await user.click(trigger)
    await waitFor(() => expect(screen.queryByTestId('info-panel')).not.toBeInTheDocument())
  })

  it('X button in drawer header closes the drawer', async () => {
    const user = userEvent.setup()
    wrap()
    await user.click(screen.getByTestId('right-bar-info-trigger'))
    await user.click(screen.getByTestId('right-bar-drawer-close'))
    await waitFor(() => expect(screen.queryByTestId('info-panel')).not.toBeInTheDocument())
  })
})
