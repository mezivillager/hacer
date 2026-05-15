import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { PinoutPanel } from './PinoutPanel'

beforeEach(() => {
  circuitActions.clearCircuit()
})

describe('PinoutPanel', () => {
  it('renders nothing when no input or output nodes exist', () => {
    const { container } = render(<PinoutPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('lists input nodes by name with width annotation', () => {
    const s = useCircuitStore.getState()
    s.addInputNode('a', { x: 0, y: 0, z: 0 })
    s.addInputNode('data', { x: 0, y: 1, z: 0 }, 16)
    render(<PinoutPanel />)
    expect(screen.getByTestId('pin-input-a')).toBeTruthy()
    const data = screen.getByTestId('pin-input-data')
    expect(data.textContent).toContain('[16]')
  })

  it('lists output nodes by name', () => {
    const s = useCircuitStore.getState()
    s.addOutputNode('out', { x: 0, y: 0, z: 0 })
    render(<PinoutPanel />)
    expect(screen.getByTestId('pin-output-out')).toBeTruthy()
  })

  it('toggles a single-bit input value via the value cell', () => {
    const s = useCircuitStore.getState()
    const node = s.addInputNode('a', { x: 0, y: 0, z: 0 })
    circuitActions.updateInputNodeValue(node.id, 0)
    render(<PinoutPanel />)
    fireEvent.click(screen.getByTestId('pin-toggle-a'))
    const updated = useCircuitStore.getState().inputNodes.find(n => n.id === node.id)
    expect(Number(updated?.value)).toBe(1)
    fireEvent.click(screen.getByTestId('pin-toggle-a'))
    const toggledBack = useCircuitStore.getState().inputNodes.find(n => n.id === node.id)
    expect(Number(toggledBack?.value)).toBe(0)
  })

  it('Eval button runs simulationTick and propagates through a NOT gate', () => {
    const s = useCircuitStore.getState()
    const input = s.addInputNode('a', { x: 0, y: 0, z: 0 })
    circuitActions.updateInputNodeValue(input.id, 1)
    const gate = s.addGate('NOT', { x: 2, y: 0, z: 0 })
    const output = s.addOutputNode('out', { x: 4, y: 0, z: 0 })
    s.addWire(
      { type: 'input', entityId: input.id },
      { type: 'gate', entityId: gate.id, pinId: `${gate.id}-in-0` },
      [],
    )
    s.addWire(
      { type: 'gate', entityId: gate.id, pinId: `${gate.id}-out-0` },
      { type: 'output', entityId: output.id },
      [],
    )

    render(<PinoutPanel />)
    fireEvent.click(screen.getByTestId('eval-button'))

    const evaluated = useCircuitStore.getState().outputNodes.find(n => n.id === output.id)
    expect(Number(evaluated?.value)).toBe(0)
  })
})
