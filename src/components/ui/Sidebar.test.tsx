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
      junctions: [],
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

  it('calls startPlacement when a gate option is clicked', () => {
    render(<Sidebar />)

    fireEvent.click(screen.getByRole('radio', { name: 'NAND' }))

    // Verify state change instead of spy
    expect(actualGetState().placementMode).toBe('NAND')
  })

  it('shows active state on gate option when in placement mode', () => {
    actualSetState({ placementMode: 'NAND' })
    render(<Sidebar />)

    expect(screen.getByRole('radio', { name: 'NAND' })).toBeChecked()
  })

  it('keeps selected gate when clicking active gate option again', () => {
    actualSetState({ placementMode: 'NAND' })
    render(<Sidebar />)

    fireEvent.click(screen.getByRole('radio', { name: 'NAND' }))

    expect(actualGetState().placementMode).toBe('NAND')
  })

  it('renders simulation controls', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('quick-action-run-pause')).toHaveTextContent(/^Run$/)
    expect(screen.getByTestId('quick-action-delete')).toHaveTextContent(/^Delete$/)
    expect(screen.getByTestId('quick-action-clear')).toHaveTextContent(/^Clear$/)
  })

  it('calls toggleSimulation when Run Simulation button is clicked', () => {
    render(<Sidebar />)
    expect(actualGetState().simulationRunning).toBe(false)

    const button = screen.getByTestId('quick-action-run-pause')
    fireEvent.click(button)

    // Verify state change instead of spy
    expect(actualGetState().simulationRunning).toBe(true)
  })

  it('shows Pause Simulation when simulation is running', () => {
    actualSetState({ simulationRunning: true })
    render(<Sidebar />)

    expect(screen.getByTestId('quick-action-run-pause')).toHaveTextContent(/^Pause$/)
  })

  it('disables Delete Selected when no gate is selected', () => {
    render(<Sidebar />)

    const button = screen.getByTestId('quick-action-delete').closest('button')
    expect(button).toHaveAttribute('disabled')
  })

  it('enables Delete Selected when gate is selected', () => {
    actualSetState({ selectedGateId: 'gate-1' })
    render(<Sidebar />)

    const button = screen.getByTestId('quick-action-delete').closest('button')
    expect(button).not.toHaveAttribute('disabled')
  })

  it('calls removeGate when Delete Selected is clicked', () => {
    // Add a gate to the store first
    actualSetState({
      selectedGateId: 'gate-1',
      gates: [{ id: 'gate-1', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: true }]
    })
    render(<Sidebar />)

    const button = screen.getByTestId('quick-action-delete')
    fireEvent.click(button)

    // Verify state change - gate should be removed
    expect(actualGetState().gates).toHaveLength(0)
  })

  it('disables Clear All when no gates exist', () => {
    render(<Sidebar />)

    const button = screen.getByTestId('quick-action-clear').closest('button')
    expect(button).toHaveAttribute('disabled')
  })

  it('enables Clear All when gates exist', () => {
    actualSetState({
      gates: [{ id: 'gate-1', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: false }]
    })
    render(<Sidebar />)

    const button = screen.getByTestId('quick-action-clear').closest('button')
    expect(button).not.toHaveAttribute('disabled')
  })

  it('calls clearCircuit when Clear All is clicked', () => {
    actualSetState({
      gates: [{ id: 'gate-1', type: 'NAND', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: false }],
      wires: [{ id: 'wire-1', from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' }, to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' }, segments: [], crossesWireIds: [] }]
    })
    render(<Sidebar />)

    const button = screen.getByTestId('quick-action-clear')
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
      wires: [{ id: 'wire-1', from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' }, to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' }, segments: [], crossesWireIds: [] }]
    })
    render(<Sidebar />)

    fireEvent.click(screen.getByTestId('sidebar-section-header-info'))

    expect(screen.getByText(/Gates: 2/)).toBeInTheDocument()
    expect(screen.getByText(/Wires: 1/)).toBeInTheDocument()
  })

  it('renders pinout summary trigger when nodes exist', () => {
    const store = useCircuitStore.getState()
    store.addInputNode('a', { x: 0, y: 0, z: 0 })
    store.addOutputNode('out', { x: 2, y: 0, z: 0 })

    render(<Sidebar />)

  fireEvent.click(screen.getByTestId('quick-action-io'))

    expect(screen.getByTestId('pinout-panel')).toBeInTheDocument()
    expect(screen.getByTestId('pinout-open-button')).toBeInTheDocument()
    expect(screen.getByText(/In 1 \| Out 1/i)).toBeInTheDocument()
  })

  it('can switch between different gate types for placement', () => {
    render(<Sidebar />)

    // Click AND gate
    fireEvent.click(screen.getByRole('radio', { name: 'AND' }))
    expect(actualGetState().placementMode).toBe('AND')

    // Click OR gate
    fireEvent.click(screen.getByRole('radio', { name: 'OR' }))
    expect(actualGetState().placementMode).toBe('OR')

    // Click NOT gate
    fireEvent.click(screen.getByRole('radio', { name: 'NOT' }))
    expect(actualGetState().placementMode).toBe('NOT')
  })

  it('shows node rename controls when a node is selected', () => {
    actualSetState({
      inputNodes: [
        {
          id: 'input-1',
          name: 'in0',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          value: 1,
          width: 1,
        },
      ],
      selectedNodeId: 'input-1',
      selectedNodeType: 'input',
    })

    render(<Sidebar />)

    expect(screen.getByTestId('node-rename-input')).toBeInTheDocument()
    expect(screen.getByTestId('node-rename-apply')).toBeInTheDocument()
  })

  it('renders sticky quick actions strip', () => {
    render(<Sidebar />)

    expect(screen.getByTestId('sidebar-quick-actions')).toBeInTheDocument()
    expect(screen.getByTestId('quick-action-run-pause')).toBeInTheDocument()
    expect(screen.getByTestId('quick-action-eval')).toBeInTheDocument()
    expect(screen.getByTestId('quick-action-io')).toBeInTheDocument()
  })

  it('defaults to one expanded accordion section', () => {
    render(<Sidebar />)

    expect(screen.getByTestId('sidebar-section-build')).toBeInTheDocument()
    expect(screen.queryByTestId('sidebar-section-controls')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sidebar-section-info')).not.toBeInTheDocument()
  })

  it('quick Chip I/O action expands io section', () => {
    const store = useCircuitStore.getState()
    store.addInputNode('a', { x: 0, y: 0, z: 0 })
    store.addOutputNode('out', { x: 2, y: 0, z: 0 })

    render(<Sidebar />)

    fireEvent.click(screen.getByTestId('quick-action-io'))

    expect(screen.getByTestId('sidebar-section-io')).toBeInTheDocument()
    expect(screen.getByTestId('pinout-open-button')).toBeInTheDocument()
  })
})
