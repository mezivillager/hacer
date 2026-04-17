import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TooltipProvider } from '@/components/ui-kit/tooltip'
import { PropertiesPanel } from './index'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'

const wrap = () =>
  render(
    <TooltipProvider delayDuration={0}>
      <PropertiesPanel />
    </TooltipProvider>,
  )

function placeGate(type: 'AND' | 'OR' | 'NAND'): string {
  circuitActions.startPlacement(type)
  circuitActions.placeGate({ x: 1, y: 0.2, z: 1 })
  return useCircuitStore.getState().gates[0].id
}

describe('PropertiesPanel', () => {
  beforeEach(() => {
    circuitActions.clearCircuit()
    circuitActions.deselectAll()
  })

  it('renders nothing when no selection', () => {
    wrap()
    expect(screen.queryByTestId('properties-panel')).not.toBeInTheDocument()
  })

  it('renders gate properties when a gate is selected', () => {
    const id = placeGate('AND')
    circuitActions.selectGate(id)
    wrap()
    expect(screen.getByTestId('properties-panel')).toBeInTheDocument()
    expect(screen.getByTestId('properties-type-label').textContent).toContain('AND')
  })

  it('gate name is read-only with Coming soon stub', () => {
    const id = placeGate('AND')
    circuitActions.selectGate(id)
    wrap()
    const nameField = screen.getByTestId('properties-name-field')
    // Read-only render: should be a non-editable text element, not an input
    expect(nameField.tagName).not.toBe('INPUT')
  })

  it('input node name field is editable; Enter dispatches renameInputNode', async () => {
    const user = userEvent.setup()
    circuitActions.addInputNode('a', { x: 0, y: 0.2, z: 0 })
    const id = useCircuitStore.getState().inputNodes[0].id
    circuitActions.selectNode(id, 'input')
    wrap()
    const field = screen.getByTestId('properties-name-field')
    expect(field.tagName).toBe('INPUT')
    await user.clear(field)
    await user.type(field, 'CLK{Enter}')
    expect(useCircuitStore.getState().inputNodes[0].name).toBe('CLK')
  })

  it('output node rename works the same way', async () => {
    const user = userEvent.setup()
    circuitActions.addOutputNode('out', { x: 0, y: 0.2, z: 0 })
    const id = useCircuitStore.getState().outputNodes[0].id
    circuitActions.selectNode(id, 'output')
    wrap()
    const field = screen.getByTestId('properties-name-field')
    await user.clear(field)
    await user.type(field, 'OUT{Enter}')
    expect(useCircuitStore.getState().outputNodes[0].name).toBe('OUT')
  })

  it('Delete button removes the selected gate', async () => {
    const user = userEvent.setup()
    const id = placeGate('AND')
    circuitActions.selectGate(id)
    wrap()
    await user.click(screen.getByTestId('properties-delete'))
    expect(useCircuitStore.getState().gates).toHaveLength(0)
  })

  it('Close (X) button clears selection', async () => {
    const user = userEvent.setup()
    const id = placeGate('AND')
    circuitActions.selectGate(id)
    wrap()
    await user.click(screen.getByTestId('properties-close'))
    await waitFor(() =>
      expect(useCircuitStore.getState().selectedGateId).toBeNull(),
    )
  })

  it('renders wire connection info pills when a wire is selected', () => {
    useCircuitStore.setState((s) => {
      s.wires = [
        {
          id: 'wire-1',
          from: { type: 'gate', entityId: 'g1', pinId: 'out' },
          to: { type: 'output', entityId: 'out1' },
          segments: [],
          crossesWireIds: [],
        },
      ]
      s.selectedWireId = 'wire-1'
    })
    wrap()
    expect(screen.getByTestId('properties-panel')).toBeInTheDocument()
    expect(screen.getByTestId('properties-type-label').textContent?.toLowerCase()).toContain('wire')
  })
})
