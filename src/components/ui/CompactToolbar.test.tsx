import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TooltipProvider } from '@/components/ui-kit/tooltip'
import { CompactToolbar } from './CompactToolbar'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn(), resolvedTheme: 'dark' }),
}))

vi.mock('@/hooks/useAppReleaseVersion', () => ({
  useAppReleaseVersion: () => 'v1.10.0',
}))

const wrap = () =>
  render(
    <TooltipProvider delayDuration={0}>
      <CompactToolbar />
    </TooltipProvider>,
  )

function placeGateAt(chipName: 'Nand' | 'And' | 'Or' | 'Not' | 'Xor', x: number, z: number) {
  circuitActions.startPlacement(chipName)
  circuitActions.placeGate({ x, y: 0.2, z })
}

describe('CompactToolbar', () => {
  beforeEach(() => {
    circuitActions.clearCircuit()
    circuitActions.deselectAll()
    if (useCircuitStore.getState().simulationRunning) circuitActions.toggleSimulation()
    circuitActions.cancelPlacement()
    circuitActions.cancelNodePlacement()
    circuitActions.closePropertiesPanel()
    circuitActions.setPerformanceMode('normal')
  })

  describe('Gates popover', () => {
    it('renders the 5 Project 1 elementary gates when popover opens', async () => {
      const user = userEvent.setup()
      wrap()
      await user.click(screen.getByTestId('toolbar-gates-trigger'))
      for (const type of ['Nand', 'And', 'Or', 'Not', 'Xor']) {
        expect(screen.getByTestId(`gate-button-${type}`)).toBeInTheDocument()
      }
    })

    it('clicking a gate sets placementMode and closes popover', async () => {
      const user = userEvent.setup()
      wrap()
      await user.click(screen.getByTestId('toolbar-gates-trigger'))
      await user.click(screen.getByTestId('gate-button-And'))
      expect(useCircuitStore.getState().placementMode).toBe('And')
    })

    it('clicking the same gate again clears placementMode (toggle)', async () => {
      const user = userEvent.setup()
      wrap()
      await user.click(screen.getByTestId('toolbar-gates-trigger'))
      await user.click(screen.getByTestId('gate-button-And'))
      await user.click(screen.getByTestId('toolbar-gates-trigger'))
      await user.click(screen.getByTestId('gate-button-And'))
      expect(useCircuitStore.getState().placementMode).toBeNull()
    })
  })

  describe('I/O popover', () => {
    it('renders Input, Output, Junction', async () => {
      const user = userEvent.setup()
      wrap()
      await user.click(screen.getByTestId('toolbar-io-trigger'))
      expect(screen.getByTestId('io-button-input')).toBeInTheDocument()
      expect(screen.getByTestId('io-button-output')).toBeInTheDocument()
      expect(screen.getByTestId('io-button-junction')).toBeInTheDocument()
    })

    it('clicking Input sets nodePlacementMode to INPUT', async () => {
      const user = userEvent.setup()
      wrap()
      await user.click(screen.getByTestId('toolbar-io-trigger'))
      await user.click(screen.getByTestId('io-button-input'))
      expect(useCircuitStore.getState().nodePlacementMode).toBe('INPUT')
    })

    it('clicking Junction sets junctionPlacementMode', async () => {
      const user = userEvent.setup()
      wrap()
      await user.click(screen.getByTestId('toolbar-io-trigger'))
      await user.click(screen.getByTestId('io-button-junction'))
      expect(useCircuitStore.getState().junctionPlacementMode).toBe(true)
    })
  })

  describe('Simulation toggle', () => {
    it('reflects simulationRunning state and dispatches toggleSimulation', async () => {
      const user = userEvent.setup()
      wrap()
      const btn = screen.getByTestId('toolbar-sim-toggle')
      expect(btn.getAttribute('aria-pressed')).toBe('false')
      await user.click(btn)
      expect(useCircuitStore.getState().simulationRunning).toBe(true)
    })
  })

  describe('Show Axes toggle', () => {
    it('dispatches toggleAxes', async () => {
      const user = userEvent.setup()
      wrap()
      const before = useCircuitStore.getState().showAxes
      await user.click(screen.getByTestId('toolbar-axes-toggle'))
      expect(useCircuitStore.getState().showAxes).toBe(!before)
    })
  })

  describe('Properties toggle', () => {
    it('is disabled when no selection', () => {
      wrap()
      expect(screen.getByTestId('toolbar-properties-toggle')).toBeDisabled()
    })

    it('toggles propertiesPanelOpen state when clicked with selection', async () => {
      const user = userEvent.setup()
      placeGateAt('And', 1, 1)
      const id = useCircuitStore.getState().gates[0].id
      circuitActions.selectGate(id)
      wrap()
      expect(useCircuitStore.getState().propertiesPanelOpen).toBe(false)
      await user.click(screen.getByTestId('toolbar-properties-toggle'))
      expect(useCircuitStore.getState().propertiesPanelOpen).toBe(true)
      await user.click(screen.getByTestId('toolbar-properties-toggle'))
      expect(useCircuitStore.getState().propertiesPanelOpen).toBe(false)
    })

    it('reflects open state via aria-pressed', () => {
      placeGateAt('And', 1, 1)
      const id = useCircuitStore.getState().gates[0].id
      circuitActions.selectGate(id)
      circuitActions.openPropertiesPanel()
      wrap()
      expect(screen.getByTestId('toolbar-properties-toggle').getAttribute('aria-pressed')).toBe(
        'true',
      )
    })
  })

  describe('Delete Selected', () => {
    it('is disabled when no selection', () => {
      wrap()
      expect(screen.getByTestId('toolbar-delete-selected')).toBeDisabled()
    })

    it('removes the selected gate', async () => {
      const user = userEvent.setup()
      placeGateAt('And', 1, 1)
      const id = useCircuitStore.getState().gates[0].id
      circuitActions.selectGate(id)
      wrap()
      await user.click(screen.getByTestId('toolbar-delete-selected'))
      expect(useCircuitStore.getState().gates).toHaveLength(0)
    })
  })

  describe('Clear All', () => {
    it('is disabled when no gates', () => {
      wrap()
      expect(screen.getByTestId('toolbar-clear-all')).toBeDisabled()
    })

    it('clears the circuit when gates exist', async () => {
      const user = userEvent.setup()
      placeGateAt('And', 1, 1)
      wrap()
      await user.click(screen.getByTestId('toolbar-clear-all'))
      expect(useCircuitStore.getState().gates).toHaveLength(0)
    })
  })

  describe('GitHub link and version', () => {
    it('renders the HACER GitHub URL', () => {
      wrap()
      const link = screen.getByTestId('toolbar-github-link')
      // Button asChild renders the inner <a> as the testid carrier
      const anchor = link.tagName === 'A' ? link : link.querySelector('a')
      expect(anchor?.getAttribute('href')).toContain('github.com/mezivillager/hacer')
    })

    it('renders a version string', () => {
      wrap()
      expect(screen.getByTestId('toolbar-version').textContent).toMatch(/v?\d/)
    })
  })

  describe('Settings', () => {
    it('opens performance settings', async () => {
      const user = userEvent.setup()
      wrap()

      await user.click(screen.getByTestId('toolbar-settings'))

      expect(screen.getByTestId('settings-popover')).toBeInTheDocument()
      expect(screen.getByTestId('low-power-mode-switch')).toHaveAttribute(
        'aria-checked',
        'false',
      )
    })

    it('toggles low-power mode from settings', async () => {
      const user = userEvent.setup()
      wrap()

      await user.click(screen.getByTestId('toolbar-settings'))
      await user.click(screen.getByTestId('low-power-mode-switch'))

      expect(useCircuitStore.getState().performanceMode).toBe('low-power')
      expect(screen.getByTestId('low-power-mode-switch')).toHaveAttribute('aria-checked', 'true')
    })
  })
})
