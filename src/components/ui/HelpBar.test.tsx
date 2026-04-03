import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HelpBar } from './HelpBar'
import { useCircuitStore } from '@/store/circuitStore'

const setState = useCircuitStore.setState

describe('HelpBar', () => {
  beforeEach(() => {
    setState({
      placementMode: null,
      nodePlacementMode: null,
      junctionPlacementMode: null,
      wiringFrom: null,
      selectedGateId: null,
      selectedWireId: null,
      selectedNodeId: null,
      selectedNodeType: null,
    })
  })

  it('renders expanded by default', () => {
    render(<HelpBar />)
    expect(screen.getByTestId('helpbar')).toBeInTheDocument()
  })

  it('shows default shortcuts when nothing is active', () => {
    render(<HelpBar />)
    const shortcuts = screen.getByTestId('helpbar-shortcuts')
    expect(shortcuts).toHaveTextContent('Select')
    expect(shortcuts).toHaveTextContent('Move')
    expect(shortcuts).toHaveTextContent('Zoom')
  })

  it('shows placing shortcuts when placement mode is active', () => {
    setState({ placementMode: 'NAND' })
    render(<HelpBar />)
    const shortcuts = screen.getByTestId('helpbar-shortcuts')
    expect(shortcuts).toHaveTextContent('Place')
    expect(shortcuts).toHaveTextContent('Cancel')
  })

  it('shows wiring shortcuts when wiring is active', () => {
    setState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'out0',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0, z: 0 },
        previewEndPosition: null,
        destinationGateId: null,
        destinationPinId: null,
        destinationNodeId: null,
        destinationNodeType: null,
        segments: null,
      },
    })
    render(<HelpBar />)
    const shortcuts = screen.getByTestId('helpbar-shortcuts')
    expect(shortcuts).toHaveTextContent('Connect')
    expect(shortcuts).toHaveTextContent('Cancel')
  })

  it('shows selecting shortcuts when a gate is selected', () => {
    setState({ selectedGateId: 'gate-1' })
    render(<HelpBar />)
    const shortcuts = screen.getByTestId('helpbar-shortcuts')
    expect(shortcuts).toHaveTextContent('Remove')
    expect(shortcuts).toHaveTextContent('Rotate')
    expect(shortcuts).toHaveTextContent('Deselect')
  })

  it('collapses when collapse button is clicked', () => {
    render(<HelpBar />)
    fireEvent.click(screen.getByTestId('helpbar-collapse'))

    expect(screen.queryByTestId('helpbar')).not.toBeInTheDocument()
    expect(screen.getByTestId('helpbar-expand')).toBeInTheDocument()
  })

  it('expands when expand button is clicked after collapse', () => {
    render(<HelpBar />)
    fireEvent.click(screen.getByTestId('helpbar-collapse'))
    fireEvent.click(screen.getByTestId('helpbar-expand'))

    expect(screen.getByTestId('helpbar')).toBeInTheDocument()
  })

  it('renders all-shortcuts button', () => {
    render(<HelpBar />)
    expect(screen.getByTestId('helpbar-all-shortcuts')).toBeInTheDocument()
  })
})

describe('KeyboardShortcutsModal', () => {
  beforeEach(() => {
    setState({
      placementMode: null,
      nodePlacementMode: null,
      junctionPlacementMode: null,
      wiringFrom: null,
      selectedGateId: null,
      selectedWireId: null,
      selectedNodeId: null,
      selectedNodeType: null,
    })
  })

  it('opens keyboard shortcuts modal when all shortcuts button is clicked', () => {
    render(<HelpBar />)
    fireEvent.click(screen.getByTestId('helpbar-all-shortcuts'))

    expect(screen.getByTestId('keyboard-shortcuts-modal')).toBeInTheDocument()
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
  })

  it('shows shortcut categories in modal', () => {
    render(<HelpBar />)
    fireEvent.click(screen.getByTestId('helpbar-all-shortcuts'))

    // Categories appear both as tab triggers and section headings; use getAllByText
    expect(screen.getAllByText('Navigation').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Selection').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Editing').length).toBeGreaterThanOrEqual(1)
  })
})
