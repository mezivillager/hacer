/**
 * Shell RTL Integration Tests
 *
 * Tests the full non-3D shell via `renderShell()` (ThemeProvider + TooltipProvider
 * + real store — no mocks). Migrated from the former skipped `render-sanity.ui.spec.ts`
 * (P05-32): covers the "app DOM shell mounts" scenario that was implicit in that spec.
 *
 * The simulation-toggle interaction is tested here through the full shell context
 * (ThemeProvider included, unlike CompactToolbar.test.tsx which mocks next-themes),
 * verifying the integration between Shell → CompactToolbar → real store.
 */

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderShell } from '@/test/renderShell'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import { beforeEach, describe, it, expect } from 'vitest'

beforeEach(() => {
  circuitActions.clearCircuit()
  if (useCircuitStore.getState().simulationRunning) circuitActions.toggleSimulation()
})

describe('Shell integration (renderShell harness)', () => {
  it('renders compact toolbar and right action bar together', () => {
    renderShell()
    expect(screen.getByTestId('compact-toolbar')).toBeInTheDocument()
    expect(screen.getByTestId('right-action-bar')).toBeInTheDocument()
  })

  it('simulation toggle starts in stopped state', () => {
    renderShell()
    const btn = screen.getByTestId('toolbar-sim-toggle')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking simulation toggle starts simulation and updates store', async () => {
    const user = userEvent.setup()
    renderShell()
    const btn = screen.getByTestId('toolbar-sim-toggle')

    await user.click(btn)

    expect(useCircuitStore.getState().simulationRunning).toBe(true)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking simulation toggle twice leaves simulation stopped', async () => {
    const user = userEvent.setup()
    renderShell()
    const btn = screen.getByTestId('toolbar-sim-toggle')

    await user.click(btn)
    await user.click(btn)

    expect(useCircuitStore.getState().simulationRunning).toBe(false)
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })
})
