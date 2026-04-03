import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RightActionBar } from './RightActionBar'
import { useCircuitStore } from '@/store/circuitStore'

const setState = useCircuitStore.setState

describe('RightActionBar', () => {
  beforeEach(() => {
    setState({
      gates: [],
      wires: [],
      inputNodes: [],
      outputNodes: [],
      simulationRunning: false,
    })
  })

  it('renders the action bar', () => {
    render(<RightActionBar />)
    expect(screen.getByTestId('right-action-bar')).toBeInTheDocument()
  })

  it('renders info, layers, and history toggles', () => {
    render(<RightActionBar />)
    expect(screen.getByTestId('right-panel-info-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('right-panel-layers-toggle')).toBeInTheDocument()
    expect(screen.getByTestId('right-panel-history-toggle')).toBeInTheDocument()
  })

  it('opens info panel when info button is clicked', () => {
    render(<RightActionBar />)
    fireEvent.click(screen.getByTestId('right-panel-info-toggle'))

    expect(screen.getByTestId('right-panel-title')).toHaveTextContent('Circuit Info')
  })

  it('shows correct circuit counts in info panel', () => {
    setState({
      gates: [
        {
          id: 'g1',
          type: 'NAND',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          inputs: [],
          outputs: [],
          selected: false,
        },
        {
          id: 'g2',
          type: 'AND',
          position: { x: 1, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          inputs: [],
          outputs: [],
          selected: false,
        },
      ],
      wires: [
        {
          id: 'w1',
          from: { type: 'gate', entityId: 'g1', pinId: 'out0' },
          to: { type: 'gate', entityId: 'g2', pinId: 'in0' },
          segments: [],
          crossesWireIds: [],
        },
      ],
      inputNodes: [
        {
          id: 'i1',
          name: 'A',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          value: 0,
          width: 1,
        },
      ],
      outputNodes: [],
    })

    render(<RightActionBar />)
    fireEvent.click(screen.getByTestId('right-panel-info-toggle'))

    expect(screen.getByTestId('circuit-info-gates')).toHaveTextContent('2')
    expect(screen.getByTestId('circuit-info-wires')).toHaveTextContent('1')
    expect(screen.getByTestId('circuit-info-inputs')).toHaveTextContent('1')
    expect(screen.getByTestId('circuit-info-outputs')).toHaveTextContent('0')
  })

  it('shows "Running" status when simulation is running', () => {
    setState({ simulationRunning: true })
    render(<RightActionBar />)
    fireEvent.click(screen.getByTestId('right-panel-info-toggle'))

    expect(screen.getByTestId('circuit-info-status')).toHaveTextContent('Running')
  })

  it('shows "Paused" status when simulation is paused', () => {
    setState({ simulationRunning: false })
    render(<RightActionBar />)
    fireEvent.click(screen.getByTestId('right-panel-info-toggle'))

    expect(screen.getByTestId('circuit-info-status')).toHaveTextContent('Paused')
  })

  it('closes panel when close button is clicked', () => {
    render(<RightActionBar />)
    fireEvent.click(screen.getByTestId('right-panel-info-toggle'))

    expect(screen.getByTestId('right-panel-title')).toHaveTextContent('Circuit Info')

    fireEvent.click(screen.getByTestId('right-panel-close'))

    // Drawer width should be 0 (panel closed)
    expect(screen.getByTestId('right-panel-drawer')).toHaveStyle({ width: '0px' })
  })

  it('toggles between panels', () => {
    render(<RightActionBar />)

    fireEvent.click(screen.getByTestId('right-panel-info-toggle'))
    expect(screen.getByTestId('right-panel-title')).toHaveTextContent('Circuit Info')

    fireEvent.click(screen.getByTestId('right-panel-layers-toggle'))
    expect(screen.getByTestId('right-panel-title')).toHaveTextContent('Layers')
  })

  it('closes panel when same toggle is clicked again', () => {
    render(<RightActionBar />)

    fireEvent.click(screen.getByTestId('right-panel-info-toggle'))
    expect(screen.getByTestId('right-panel-drawer')).toHaveStyle({ width: '280px' })

    fireEvent.click(screen.getByTestId('right-panel-info-toggle'))
    expect(screen.getByTestId('right-panel-drawer')).toHaveStyle({ width: '0px' })
  })

  it('shows history panel with empty state', () => {
    render(<RightActionBar />)
    fireEvent.click(screen.getByTestId('right-panel-history-toggle'))

    expect(screen.getByText('No history yet')).toBeInTheDocument()
  })
})
