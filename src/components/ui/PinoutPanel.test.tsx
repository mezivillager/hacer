import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { PinoutPanel } from './PinoutPanel'

vi.mock('antd', () => ({
  Button: ({ children, onClick, ...props }: {
    children: ReactNode
    onClick?: () => void
    [key: string]: unknown
  }) => (
    <button type="button" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Divider: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

function resetCircuitStoreState() {
  useCircuitStore.setState({
    gates: [],
    wires: [],
    selectedGateId: null,
    selectedWireId: null,
    simulationRunning: false,
    simulationSpeed: 100,
    lastSimulationError: null,
    placementMode: null,
    placementPreviewPosition: null,
    wiringFrom: null,
    isDragActive: false,
    hoveredGateId: null,
    showAxes: false,
    inputNodes: [],
    outputNodes: [],
    junctions: [],
    nodePlacementMode: null,
    selectedNodeId: null,
    selectedNodeType: null,
    junctionPlacementMode: null,
    junctionPreviewPosition: null,
    junctionPreviewWireId: null,
    statusMessages: [],
  })
}

beforeEach(() => {
  resetCircuitStoreState()
})

describe('PinoutPanel', () => {
  it('renders nothing when no I/O nodes exist', () => {
    const { container } = render(<PinoutPanel />)
    expect(container.firstChild).toBeNull()
  })

  it('lists input nodes with names and values', () => {
    const store = useCircuitStore.getState()
    store.addInputNode('a', { x: 0, y: 0, z: 0 })
    store.addInputNode('b', { x: 0, y: 1, z: 0 })

    render(<PinoutPanel />)

    expect(screen.getByTestId('pin-input-a')).toBeInTheDocument()
    expect(screen.getByTestId('pin-input-b')).toBeInTheDocument()
  })

  it('lists output nodes with names and values', () => {
    const store = useCircuitStore.getState()
    store.addOutputNode('out', { x: 0, y: 0, z: 0 })

    render(<PinoutPanel />)

    expect(screen.getByTestId('pin-output-out')).toBeInTheDocument()
  })

  it('toggling single-bit input updates store value', () => {
    const store = useCircuitStore.getState()
    const node = store.addInputNode('a', { x: 0, y: 0, z: 0 })
    const before = node.value

    render(<PinoutPanel />)
    fireEvent.click(screen.getByTestId('pin-toggle-a'))

    const updated = useCircuitStore.getState().inputNodes.find((n) => n.id === node.id)
    expect(updated?.value).toBe(before ? 0 : 1)
  })

  it('Eval button triggers simulationTick', () => {
    useCircuitStore.getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const spy = vi.spyOn(circuitActions, 'simulationTick')

    render(<PinoutPanel />)
    fireEvent.click(screen.getByTestId('eval-button'))

    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it('shows bus width annotation for multi-bit nodes', () => {
    const store = useCircuitStore.getState()
    store.addInputNode('in', { x: 0, y: 0, z: 0 }, 16)

    render(<PinoutPanel />)

    expect(screen.getByTestId('pin-input-in').textContent).toContain('[16]')
  })
})
