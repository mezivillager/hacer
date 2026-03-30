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
  Drawer: ({ open, children, onClose, ...props }: {
    open?: boolean
    children: ReactNode
    onClose?: () => void
    [key: string]: unknown
  }) => (open
    ? (
      <div data-testid="pinout-drawer" {...props}>
        <button type="button" data-testid="pinout-close-button" onClick={onClose}>Close</button>
        {children}
      </div>
    )
    : null),
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

  it('renders compact summary and open button when nodes exist', () => {
    const store = useCircuitStore.getState()
    store.addInputNode('a', { x: 0, y: 0, z: 0 })
    store.addOutputNode('out', { x: 2, y: 0, z: 0 })

    render(<PinoutPanel />)

    expect(screen.getByTestId('pinout-panel')).toBeInTheDocument()
    expect(screen.getByTestId('pinout-open-button')).toBeInTheDocument()
    expect(screen.queryByTestId('pin-input-a')).not.toBeInTheDocument()
  })

  it('opens drawer and renders full pin list', () => {
    const store = useCircuitStore.getState()
    store.addInputNode('a', { x: 0, y: 0, z: 0 })
    store.addOutputNode('out', { x: 0, y: 0, z: 0 })

    render(<PinoutPanel />)
    fireEvent.click(screen.getByTestId('pinout-open-button'))

    expect(screen.getByTestId('pinout-drawer')).toBeInTheDocument()
    expect(screen.getByTestId('pin-input-a')).toBeInTheDocument()
    expect(screen.getByTestId('pin-output-out')).toBeInTheDocument()
  })

  it('closes drawer from close action', () => {
    const store = useCircuitStore.getState()
    store.addInputNode('a', { x: 0, y: 0, z: 0 })

    render(<PinoutPanel />)
    fireEvent.click(screen.getByTestId('pinout-open-button'))
    expect(screen.getByTestId('pinout-drawer')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('pinout-close-button'))
    expect(screen.queryByTestId('pinout-drawer')).not.toBeInTheDocument()
  })

  it('toggles single-bit input value from drawer content', () => {
    const store = useCircuitStore.getState()
    const node = store.addInputNode('a', { x: 0, y: 0, z: 0 })
    const before = node.value

    render(<PinoutPanel />)

    fireEvent.click(screen.getByTestId('pinout-open-button'))
    fireEvent.click(screen.getByTestId('pin-toggle-a'))

    const after = useCircuitStore.getState().inputNodes.find((n) => n.id === node.id)?.value
    expect(after).toBe(before ? 0 : 1)
  })

  it('Eval button in drawer calls simulationTick once', () => {
    useCircuitStore.getState().addInputNode('a', { x: 0, y: 0, z: 0 })
    const tickSpy = vi.spyOn(circuitActions, 'simulationTick')

    render(<PinoutPanel />)

    fireEvent.click(screen.getByTestId('pinout-open-button'))
    fireEvent.click(screen.getByTestId('eval-button'))

    expect(tickSpy).toHaveBeenCalledTimes(1)
    tickSpy.mockRestore()
  })
})
