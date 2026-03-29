import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { useCircuitStore } from '@/store/circuitStore'
import { StatusBar } from './StatusBar'

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

describe('StatusBar', () => {
  it('renders nothing with no status messages', () => {
    const { container } = render(<StatusBar />)
    expect(container.firstChild).toBeNull()
  })

  it('renders latest status message only', () => {
    useCircuitStore.getState().addStatus('info', 'First')
    useCircuitStore.getState().addStatus('error', 'Latest')

    render(<StatusBar />)

    expect(screen.getByTestId('status-text')).toHaveTextContent('Latest')
  })

  it('exposes severity through data attribute', () => {
    useCircuitStore.getState().addStatus('warning', 'Careful')

    render(<StatusBar />)

    expect(screen.getByTestId('status-bar')).toHaveAttribute('data-severity', 'warning')
  })

  it('dismisses latest message on click', () => {
    useCircuitStore.getState().addStatus('error', 'Dismiss me')

    render(<StatusBar />)
    fireEvent.click(screen.getByTestId('status-bar'))

    expect(useCircuitStore.getState().statusMessages).toHaveLength(0)
  })
})
