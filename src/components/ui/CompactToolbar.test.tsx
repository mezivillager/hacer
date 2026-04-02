import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CompactToolbar } from './CompactToolbar'
import { useCircuitStore } from '@/store/circuitStore'

const actualSetState = useCircuitStore.setState
const actualGetState = useCircuitStore.getState

describe('CompactToolbar', () => {
  beforeEach(() => {
    actualSetState({
      gates: [],
      wires: [],
      selectedGateId: null,
      selectedWireId: null,
      simulationRunning: false,
      simulationSpeed: 100,
      placementMode: null,
      wiringFrom: null,
      inputNodes: [],
      outputNodes: [],
      junctions: [],
      nodePlacementMode: null,
      junctionPlacementMode: null,
      selectedNodeId: null,
      selectedNodeType: null,
      showAxes: false,
    })
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<CompactToolbar />)
    expect(screen.getByTestId('compact-toolbar')).toBeInTheDocument()
  })

  it('renders gates dropdown trigger', () => {
    render(<CompactToolbar />)
    expect(screen.getByTestId('gates-dropdown-trigger')).toBeInTheDocument()
  })

  it('opens gates dropdown and shows gate buttons', () => {
    render(<CompactToolbar />)

    fireEvent.click(screen.getByTestId('gates-dropdown-trigger'))

    expect(screen.getByTestId('gates-dropdown')).toBeInTheDocument()
    expect(screen.getByTestId('gate-button-NAND')).toBeInTheDocument()
    expect(screen.getByTestId('gate-button-AND')).toBeInTheDocument()
    expect(screen.getByTestId('gate-button-OR')).toBeInTheDocument()
    expect(screen.getByTestId('gate-button-NOT')).toBeInTheDocument()
    expect(screen.getByTestId('gate-button-XOR')).toBeInTheDocument()
  })

  it('triggers placement mode when a gate button is clicked', () => {
    render(<CompactToolbar />)

    fireEvent.click(screen.getByTestId('gates-dropdown-trigger'))
    fireEvent.click(screen.getByTestId('gate-button-NAND'))

    expect(actualGetState().placementMode).toBe('NAND')
  })

  it('toggles simulation when simulation button is clicked', () => {
    render(<CompactToolbar />)
    expect(actualGetState().simulationRunning).toBe(false)

    fireEvent.click(screen.getByTestId('simulation-toggle'))

    expect(actualGetState().simulationRunning).toBe(true)
  })

  it('toggles axes when axes button is clicked', () => {
    render(<CompactToolbar />)
    expect(actualGetState().showAxes).toBe(false)

    fireEvent.click(screen.getByTestId('axes-toggle'))

    expect(actualGetState().showAxes).toBe(true)
  })

  it('disables delete button when nothing is selected', () => {
    render(<CompactToolbar />)

    const deleteButton = screen.getByTestId('delete-selected')
    expect(deleteButton).toBeDisabled()
  })

  it('enables delete button when a gate is selected', () => {
    actualSetState({ selectedGateId: 'gate-1' })
    render(<CompactToolbar />)

    const deleteButton = screen.getByTestId('delete-selected')
    expect(deleteButton).not.toBeDisabled()
  })

  it('calls removeGate when delete is clicked with selected gate', () => {
    actualSetState({
      selectedGateId: 'gate-1',
      gates: [{
        id: 'gate-1',
        type: 'NAND',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        inputs: [],
        outputs: [],
        selected: true,
      }],
    })
    render(<CompactToolbar />)

    fireEvent.click(screen.getByTestId('delete-selected'))

    expect(actualGetState().gates).toHaveLength(0)
  })

  it('disables clear all button when no gates exist', () => {
    render(<CompactToolbar />)

    const clearButton = screen.getByTestId('clear-all')
    expect(clearButton).toBeDisabled()
  })

  it('enables clear all button when gates exist', () => {
    actualSetState({
      gates: [{
        id: 'gate-1',
        type: 'NAND',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        inputs: [],
        outputs: [],
        selected: false,
      }],
    })
    render(<CompactToolbar />)

    const clearButton = screen.getByTestId('clear-all')
    expect(clearButton).not.toBeDisabled()
  })

  it('shows node rename trigger when a node is selected', () => {
    actualSetState({
      inputNodes: [{
        id: 'input-1',
        name: 'in0',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        value: 1,
        width: 1,
      }],
      selectedNodeId: 'input-1',
      selectedNodeType: 'input',
    })
    render(<CompactToolbar />)

    expect(screen.getByTestId('node-rename-trigger')).toBeInTheDocument()
  })

  it('does not show node rename trigger when no node is selected', () => {
    render(<CompactToolbar />)

    expect(screen.queryByTestId('node-rename-trigger')).not.toBeInTheDocument()
  })

  it('renders io dropdown trigger', () => {
    render(<CompactToolbar />)
    expect(screen.getByTestId('io-dropdown-trigger')).toBeInTheDocument()
  })

  it('renders version display', () => {
    render(<CompactToolbar />)
    expect(screen.getByTestId('app-version')).toBeInTheDocument()
  })
})
