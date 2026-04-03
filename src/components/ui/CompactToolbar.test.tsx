import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CompactToolbar } from './CompactToolbar'
import { useCircuitStore } from '@/store/circuitStore'

// Create a shared mock for setTheme that persists across test calls
const mockSetTheme = vi.fn()

// Mock useThemeMode from @/theme
vi.mock('@/theme', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/theme')>()
  return {
    ...actual,
    useThemeMode: () => ({
      theme: 'dark' as const,
      resolvedTheme: 'dark' as const,
      setTheme: mockSetTheme,
    }),
  }
})

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

  it('opens io dropdown and shows io buttons', () => {
    render(<CompactToolbar />)

    fireEvent.click(screen.getByTestId('io-dropdown-trigger'))

    expect(screen.getByTestId('io-dropdown')).toBeInTheDocument()
    expect(screen.getByTestId('io-button-INPUT')).toBeInTheDocument()
    expect(screen.getByTestId('io-button-OUTPUT')).toBeInTheDocument()
    expect(screen.getByTestId('io-button-JUNCTION')).toBeInTheDocument()
  })

  it('activates INPUT node placement when Input button is clicked', () => {
    render(<CompactToolbar />)

    fireEvent.click(screen.getByTestId('io-dropdown-trigger'))
    fireEvent.click(screen.getByTestId('io-button-INPUT'))

    expect(actualGetState().nodePlacementMode).toBe('INPUT')
  })

  it('activates OUTPUT node placement when Output button is clicked', () => {
    render(<CompactToolbar />)

    fireEvent.click(screen.getByTestId('io-dropdown-trigger'))
    fireEvent.click(screen.getByTestId('io-button-OUTPUT'))

    expect(actualGetState().nodePlacementMode).toBe('OUTPUT')
  })

  it('activates junction placement when Junction button is clicked', () => {
    render(<CompactToolbar />)

    fireEvent.click(screen.getByTestId('io-dropdown-trigger'))
    fireEvent.click(screen.getByTestId('io-button-JUNCTION'))

    expect(actualGetState().junctionPlacementMode).toBe(true)
  })

  it('cancels junction placement when selecting a node type', () => {
    actualSetState({ junctionPlacementMode: true })
    render(<CompactToolbar />)

    fireEvent.click(screen.getByTestId('io-dropdown-trigger'))
    fireEvent.click(screen.getByTestId('io-button-INPUT'))

    expect(actualGetState().junctionPlacementMode).toBe(null)
    expect(actualGetState().nodePlacementMode).toBe('INPUT')
  })

  it('cancels junction placement when selecting a gate', () => {
    actualSetState({ junctionPlacementMode: true })
    render(<CompactToolbar />)

    fireEvent.click(screen.getByTestId('gates-dropdown-trigger'))
    fireEvent.click(screen.getByTestId('gate-button-NAND'))

    expect(actualGetState().junctionPlacementMode).toBe(null)
    expect(actualGetState().placementMode).toBe('NAND')
  })

  it('cancels node placement when selecting a junction', () => {
    actualSetState({ nodePlacementMode: 'INPUT' })
    render(<CompactToolbar />)

    fireEvent.click(screen.getByTestId('io-dropdown-trigger'))
    fireEvent.click(screen.getByTestId('io-button-JUNCTION'))

    expect(actualGetState().nodePlacementMode).toBe(null)
    expect(actualGetState().junctionPlacementMode).toBe(true)
  })

  it('renders version display', () => {
    render(<CompactToolbar />)
    expect(screen.getByTestId('app-version')).toBeInTheDocument()
  })

  it('renders theme toggle button', () => {
    render(<CompactToolbar />)
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('opens theme popover when theme button is clicked', () => {
    render(<CompactToolbar />)

    fireEvent.click(screen.getByTestId('theme-toggle'))

    expect(screen.getByTestId('theme-popover')).toBeInTheDocument()
    expect(screen.getByTestId('theme-option-dark')).toBeInTheDocument()
    expect(screen.getByTestId('theme-option-light')).toBeInTheDocument()
    expect(screen.getByTestId('theme-option-system')).toBeInTheDocument()
  })

  it('calls setTheme with dark when dark theme option is clicked', () => {
    mockSetTheme.mockClear()
    render(<CompactToolbar />)

    fireEvent.click(screen.getByTestId('theme-toggle'))
    fireEvent.click(screen.getByTestId('theme-option-dark'))

    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('calls setTheme with light when light theme option is clicked', () => {
    mockSetTheme.mockClear()
    render(<CompactToolbar />)

    fireEvent.click(screen.getByTestId('theme-toggle'))
    fireEvent.click(screen.getByTestId('theme-option-light'))

    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('calls setTheme with system when system theme option is clicked', () => {
    mockSetTheme.mockClear()
    render(<CompactToolbar />)

    fireEvent.click(screen.getByTestId('theme-toggle'))
    fireEvent.click(screen.getByTestId('theme-option-system'))

    expect(mockSetTheme).toHaveBeenCalledWith('system')
  })
})
