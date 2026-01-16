import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import { useCircuitStore } from '@/store/circuitStore'

// Get a reference to the actual store's setState and getState for resetting and checking
const actualSetState = useCircuitStore.setState
const actualGetState = useCircuitStore.getState

describe('Sidebar', () => {
  beforeEach(() => {
    // Reset store state using the actual setState
    actualSetState({
      gates: [],
      wires: [],
      selectedGateId: null,
      selectedWireId: null,
      simulationRunning: false,
      simulationSpeed: 100,
      placementMode: null,
      wiringFrom: null,
      // Node state fields
      inputNodes: [],
      outputNodes: [],
      constantNodes: [],
      junctions: [],
      signalWires: [],
      nodePlacementMode: null,
      selectedNodeId: null,
      selectedNodeType: null,
    })
    vi.clearAllMocks()
  })

  it('renders sidebar with title', () => {
    render(<Sidebar />)
    expect(screen.getByText('🔌 HACER')).toBeInTheDocument()
    expect(screen.getByText('Hardware Architecture & Constraints Explorer/Researcher')).toBeInTheDocument()
  })

  it('renders Elementary Gates section with gate icons', () => {
    render(<Sidebar />)
    expect(screen.getByText('Elementary Gates')).toBeInTheDocument()
    // Check for gate labels in the selector grid
    expect(screen.getByText('NAND')).toBeInTheDocument()
    expect(screen.getByText('AND')).toBeInTheDocument()
    expect(screen.getByText('OR')).toBeInTheDocument()
    expect(screen.getByText('NOT')).toBeInTheDocument()
  })

  it('calls startPlacement when a gate icon is clicked', () => {
    render(<Sidebar />)

    const nandIcon = screen.getByText('NAND').closest('.gate-icon')
    fireEvent.click(nandIcon!)

    // Verify state change instead of spy
    expect(actualGetState().placementMode).toBe('NAND')
  })

  it('shows active state on gate icon when in placement mode', () => {
    actualSetState({ placementMode: 'NAND' })
    render(<Sidebar />)

    const nandIcon = screen.getByText('NAND').closest('.gate-icon')
    expect(nandIcon).toHaveClass('active')
  })

  it('calls cancelPlacement when active gate icon is clicked again', () => {
    actualSetState({ placementMode: 'NAND' })
    render(<Sidebar />)

    const nandIcon = screen.getByText('NAND').closest('.gate-icon')
    fireEvent.click(nandIcon!)

    // Verify state change instead of spy
    expect(actualGetState().placementMode).toBe(null)
  })

  it('renders simulation controls', () => {
    render(<Sidebar />)
    expect(screen.getByText('Run Simulation')).toBeInTheDocument()
    expect(screen.getByText('Delete Selected')).toBeInTheDocument()
    expect(screen.getByText('Clear All')).toBeInTheDocument()
  })

  it('calls toggleSimulation when Run Simulation button is clicked', () => {
    render(<Sidebar />)
    expect(actualGetState().simulationRunning).toBe(false)

    const button = screen.getByText('Run Simulation')
    fireEvent.click(button)

    // Verify state change instead of spy
    expect(actualGetState().simulationRunning).toBe(true)
  })

  it('shows Pause Simulation when simulation is running', () => {
    actualSetState({ simulationRunning: true })
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
    actualSetState({ selectedGateId: 'gate-1' })
    render(<Sidebar />)

    const button = screen.getByText('Delete Selected').closest('button')
    expect(button).not.toHaveAttribute('disabled')
  })

  it('calls removeGate when Delete Selected is clicked', () => {
    // Add a gate to the store first
    actualSetState({
      selectedGateId: 'gate-1',
      gates: [{ id: 'gate-1', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: true }]
    })
    render(<Sidebar />)

    const button = screen.getByText('Delete Selected')
    fireEvent.click(button)

    // Verify state change - gate should be removed
    expect(actualGetState().gates).toHaveLength(0)
  })

  it('disables Clear All when no gates exist', () => {
    render(<Sidebar />)

    const button = screen.getByText('Clear All').closest('button')
    expect(button).toHaveAttribute('disabled')
  })

  it('enables Clear All when gates exist', () => {
    actualSetState({
      gates: [{ id: 'gate-1', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: false }]
    })
    render(<Sidebar />)

    const button = screen.getByText('Clear All').closest('button')
    expect(button).not.toHaveAttribute('disabled')
  })

  it('calls clearCircuit when Clear All is clicked', () => {
    actualSetState({
      gates: [{ id: 'gate-1', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: false }],
      wires: [{ id: 'wire-1', fromGateId: 'gate-1', fromPinId: 'pin-1', toGateId: 'gate-2', toPinId: 'pin-2' }]
    })
    render(<Sidebar />)

    const button = screen.getByText('Clear All')
    fireEvent.click(button)

    // Verify state change
    expect(actualGetState().gates).toHaveLength(0)
    expect(actualGetState().wires).toHaveLength(0)
  })

  it('displays circuit info', () => {
    actualSetState({
      gates: [
        { id: 'gate-1', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: false },
        { id: 'gate-2', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: false },
      ],
      wires: [{ id: 'wire-1', fromGateId: 'gate-1', fromPinId: 'pin-1', toGateId: 'gate-2', toPinId: 'pin-2' }]
    })
    render(<Sidebar />)

    expect(screen.getByText(/Gates: 2/)).toBeInTheDocument()
    expect(screen.getByText(/Wires: 1/)).toBeInTheDocument()
  })

  it('can switch between different gate types for placement', () => {
    render(<Sidebar />)

    // Click AND gate
    const andIcon = screen.getByText('AND').closest('.gate-icon')
    fireEvent.click(andIcon!)
    expect(actualGetState().placementMode).toBe('AND')

    // Click OR gate
    const orIcon = screen.getByText('OR').closest('.gate-icon')
    fireEvent.click(orIcon!)
    expect(actualGetState().placementMode).toBe('OR')

    // Click NOT gate
    const notIcon = screen.getByText('NOT').closest('.gate-icon')
    fireEvent.click(notIcon!)
    expect(actualGetState().placementMode).toBe('NOT')
  })
})
