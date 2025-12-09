import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import { circuitActions, circuitStore } from '@/store/circuitStore'

// Mock useCircuitStore to return store snapshot
vi.mock('@/store/circuitStore', async () => {
  const actual = await vi.importActual('@/store/circuitStore')
  return {
    ...actual,
    useCircuitStore: () => circuitStore,
  }
})

describe('Sidebar', () => {
  beforeEach(() => {
    // Reset store state
    circuitStore.gates = []
    circuitStore.wires = []
    circuitStore.selectedGateId = null
    circuitStore.simulationRunning = false
    circuitStore.placementMode = null
    vi.clearAllMocks()
  })

  it('renders sidebar with title', () => {
    render(<Sidebar />)
    expect(screen.getByText('🔌 Nand2Fun')).toBeInTheDocument()
    expect(screen.getByText('Logic Gate Simulator')).toBeInTheDocument()
  })

  it('renders Add NAND Gate button', () => {
    render(<Sidebar />)
    expect(screen.getByText('Add NAND Gate')).toBeInTheDocument()
  })

  it('calls startPlacement when Add NAND Gate button is clicked', () => {
    const startPlacementSpy = vi.spyOn(circuitActions, 'startPlacement')
    render(<Sidebar />)

    const button = screen.getByText('Add NAND Gate')
    fireEvent.click(button)

    expect(startPlacementSpy).toHaveBeenCalledWith('NAND')
  })

  it('shows Cancel Placement button when in placement mode', () => {
    circuitStore.placementMode = 'NAND'
    render(<Sidebar />)

    expect(screen.getByText('Cancel Placement')).toBeInTheDocument()
    expect(screen.queryByText('Add NAND Gate')).not.toBeInTheDocument()
  })

  it('calls cancelPlacement when Cancel Placement button is clicked', () => {
    const cancelPlacementSpy = vi.spyOn(circuitActions, 'cancelPlacement')
    circuitStore.placementMode = 'NAND'
    render(<Sidebar />)

    const button = screen.getByText('Cancel Placement')
    fireEvent.click(button)

    expect(cancelPlacementSpy).toHaveBeenCalled()
  })

  it('renders simulation controls', () => {
    render(<Sidebar />)
    expect(screen.getByText('Run Simulation')).toBeInTheDocument()
    expect(screen.getByText('Delete Selected')).toBeInTheDocument()
    expect(screen.getByText('Clear All')).toBeInTheDocument()
  })

  it('calls toggleSimulation when Run Simulation button is clicked', () => {
    const toggleSimulationSpy = vi.spyOn(circuitActions, 'toggleSimulation')
    render(<Sidebar />)

    const button = screen.getByText('Run Simulation')
    fireEvent.click(button)

    expect(toggleSimulationSpy).toHaveBeenCalled()
  })

  it('shows Pause Simulation when simulation is running', () => {
    circuitStore.simulationRunning = true
    render(<Sidebar />)

    expect(screen.getByText('Pause Simulation')).toBeInTheDocument()
    expect(screen.queryByText('Run Simulation')).not.toBeInTheDocument()
  })

  it('disables Delete Selected when no gate is selected', () => {
    render(<Sidebar />)

    const button = screen.getByText('Delete Selected').closest('button')
    expect(button).toHaveAttribute('disabled')
  })

  it('enables Delete Selected when gate is selected', () => {
    circuitStore.selectedGateId = 'gate-1'
    render(<Sidebar />)

    const button = screen.getByText('Delete Selected').closest('button')
    expect(button).not.toHaveAttribute('disabled')
  })

  it('calls removeGate when Delete Selected is clicked', () => {
    const removeGateSpy = vi.spyOn(circuitActions, 'removeGate')
    circuitStore.selectedGateId = 'gate-1'
    render(<Sidebar />)

    const button = screen.getByText('Delete Selected')
    fireEvent.click(button)

    expect(removeGateSpy).toHaveBeenCalledWith('gate-1')
  })

  it('disables Clear All when no gates exist', () => {
    render(<Sidebar />)

    const button = screen.getByText('Clear All').closest('button')
    expect(button).toHaveAttribute('disabled')
  })

  it('enables Clear All when gates exist', () => {
    circuitStore.gates = [{ id: 'gate-1', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: false }]
    render(<Sidebar />)

    const button = screen.getByText('Clear All').closest('button')
    expect(button).not.toHaveAttribute('disabled')
  })

  it('calls clearCircuit when Clear All is clicked', () => {
    const clearCircuitSpy = vi.spyOn(circuitActions, 'clearCircuit')
    circuitStore.gates = [{ id: 'gate-1', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: false }]
    render(<Sidebar />)

    const button = screen.getByText('Clear All')
    fireEvent.click(button)

    expect(clearCircuitSpy).toHaveBeenCalled()
  })

  it('displays circuit info', () => {
    circuitStore.gates = [
      { id: 'gate-1', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: false },
      { id: 'gate-2', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: false },
    ]
    circuitStore.wires = [{ id: 'wire-1', fromGateId: 'gate-1', fromPinId: 'pin-1', toGateId: 'gate-2', toPinId: 'pin-2' }]
    render(<Sidebar />)

    expect(screen.getByText(/Gates: 2/)).toBeInTheDocument()
    expect(screen.getByText(/Wires: 1/)).toBeInTheDocument()
  })
})
