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

  it('leaves multi-bit input values read-only', () => {
    const s = useCircuitStore.getState()
    const node = s.addInputNode('data', { x: 0, y: 0, z: 0 }, 16)
    circuitActions.updateInputNodeValue(node.id, 12)
    render(<PinoutPanel />)

    const valueCell = screen.getByTestId('pin-toggle-data')
    expect(valueCell).toBeDisabled()
    fireEvent.click(valueCell)

    const updated = useCircuitStore.getState().inputNodes.find(n => n.id === node.id)
    expect(Number(updated?.value)).toBe(12)
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

  it('Eval button is enabled initially and disabled after one eval', () => {
    const s = useCircuitStore.getState()
    s.addInputNode('a', { x: 0, y: 0, z: 0 })
    render(<PinoutPanel />)
    const button = screen.getByTestId('eval-button')
    // First mount: never evaluated yet — button is actionable.
    expect((button as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(button)
    // After eval: nothing has changed since last run — disabled to prevent dup-clicks.
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })

  it('Eval button re-enables after toggling an input, then disables after another eval', () => {
    const s = useCircuitStore.getState()
    const node = s.addInputNode('a', { x: 0, y: 0, z: 0 })
    circuitActions.updateInputNodeValue(node.id, 0)
    render(<PinoutPanel />)
    const button = screen.getByTestId('eval-button')

    fireEvent.click(button) // first eval -> disabled
    expect((button as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByTestId('pin-toggle-a')) // input changed -> re-enabled
    expect((button as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(button) // second eval -> disabled again
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })

  it('Eval button only shows a pointer cursor while enabled', () => {
    const s = useCircuitStore.getState()
    s.addInputNode('a', { x: 0, y: 0, z: 0 })
    render(<PinoutPanel />)
    const button = screen.getByTestId('eval-button')
    expect(button.className).toContain('cursor-pointer')
    fireEvent.click(button)
    expect(button.className).toContain('disabled:cursor-not-allowed')
  })
})
