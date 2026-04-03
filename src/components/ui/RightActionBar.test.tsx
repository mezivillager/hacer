import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RightActionBar } from './RightActionBar'
import { useCircuitStore } from '@/store/circuitStore'

const actualSetState = useCircuitStore.setState

describe('RightActionBar', () => {
  beforeEach(() => {
    actualSetState({
      gates: [],
      wires: [],
      inputNodes: [],
      outputNodes: [],
      simulationRunning: false,
    })
  })

  it('renders without crashing', () => {
    render(<RightActionBar />)
    expect(screen.getByRole('button', { name: /Circuit Info/i })).toBeInTheDocument()
  })

  it('shows circuit info panel when info button is clicked', () => {
    render(<RightActionBar />)

    const infoButton = screen.getByRole('button', { name: /Circuit Info/i })
    fireEvent.click(infoButton)

    expect(screen.getByText('Circuit Info')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('shows layers panel when layers button is clicked', () => {
    render(<RightActionBar />)

    const layersButton = screen.getByRole('button', { name: /Layers/i })
    fireEvent.click(layersButton)

    expect(screen.getByText('Layers')).toBeInTheDocument()
    expect(screen.getByText('Gates')).toBeInTheDocument()
    expect(screen.getByText('Wires')).toBeInTheDocument()
  })

  it('shows history panel when history button is clicked', () => {
    render(<RightActionBar />)

    const historyButton = screen.getByRole('button', { name: /History/i })
    fireEvent.click(historyButton)

    expect(screen.getByText('History')).toBeInTheDocument()
    expect(screen.getByText('No history yet')).toBeInTheDocument()
  })

  it('closes panel when X button is clicked', () => {
    render(<RightActionBar />)

    const infoButton = screen.getByRole('button', { name: /Circuit Info/i })
    fireEvent.click(infoButton)

    expect(screen.getByText('Circuit Info')).toBeInTheDocument()

    const closeButton = screen.getByRole('button', { name: '' })
    fireEvent.click(closeButton)

    expect(screen.queryByText('Circuit Info')).not.toBeInTheDocument()
  })

  it('displays correct circuit stats', () => {
    actualSetState({
      gates: [
        {
          id: 'g1',
          type: 'NAND',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          pins: [],
        },
        {
          id: 'g2',
          type: 'AND',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          pins: [],
        },
      ],
      wires: [
        {
          id: 'w1',
          from: { type: 'input', entityId: 'in-1' },
          to: { type: 'gate', entityId: 'g1', pinId: 'pin-a' },
          segments: [],
          crossesWireIds: [],
        },
      ],
      inputNodes: [
        {
          id: 'in-1',
          name: 'a',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          value: 0,
          width: 1,
        },
      ],
      outputNodes: [
        {
          id: 'out-1',
          name: 'out',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          value: 0,
          width: 1,
        },
      ],
    })

    render(<RightActionBar />)

    const infoButton = screen.getByRole('button', { name: /Circuit Info/i })
    fireEvent.click(infoButton)

    expect(screen.getByText('2')).toBeInTheDocument() // Gates
    expect(screen.getByText('1')).toBeInTheDocument() // Wires, Inputs, and Outputs all show 1
  })

  it('shows Running status when simulation is active', () => {
    actualSetState({
      simulationRunning: true,
    })

    render(<RightActionBar />)

    const infoButton = screen.getByRole('button', { name: /Circuit Info/i })
    fireEvent.click(infoButton)

    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('shows Paused status when simulation is inactive', () => {
    actualSetState({
      simulationRunning: false,
    })

    render(<RightActionBar />)

    const infoButton = screen.getByRole('button', { name: /Circuit Info/i })
    fireEvent.click(infoButton)

    expect(screen.getByText('Paused')).toBeInTheDocument()
  })
})
