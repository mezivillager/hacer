import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { CanvasArea } from './CanvasArea'
import { useCircuitStore } from '@/store/circuitStore'
import type { Wire } from '@/store/types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { resetCircuitStore } from '@/test/r3f/seedCircuit'

vi.mock('./Scene', () => ({
  Scene: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/gates', () => ({ GateRenderer: () => null }))

vi.mock('@/nodes', () => ({ NodeRenderer: () => null, BusComponentRenderer: () => null }))

vi.mock('@react-three/drei', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@react-three/drei')>()),
  Line: ({ points, lineWidth }: { points: unknown[]; lineWidth: number }) => (
    <div data-testid="wire-line" data-points={points.length} data-line-width={lineWidth} />
  ),
}))

const SEGMENTS: WireSegment[] = [
  { type: 'horizontal', start: { x: 2.6, y: 0.2, z: 2 }, end: { x: 5, y: 0.2, z: 2 } },
  {
    type: 'arc',
    start: { x: 5, y: 0.2, z: 2 },
    end: { x: 6, y: 0.2, z: 2 },
    arcCenter: { x: 5.5, y: 0.2, z: 2 },
    arcRadius: 0.5,
  },
  { type: 'horizontal', start: { x: 6, y: 0.2, z: 2 }, end: { x: 9.4, y: 0.2, z: 2 } },
]

function seedWire(): Wire {
  const state = useCircuitStore.getState()
  const input = state.addInputNode('a', { x: 2, y: 0.2, z: 2 })
  const output = state.addOutputNode('out', { x: 10, y: 0.2, z: 2 })
  return state.addWire({ type: 'input', entityId: input.id }, { type: 'output', entityId: output.id }, SEGMENTS)
}

const drawn = () =>
  screen.getAllByTestId('wire-line').map((line) => [Number(line.dataset.points), Number(line.dataset.lineWidth)])

beforeEach(() => {
  resetCircuitStore()
  useCircuitStore.setState({ performanceMode: 'normal', placementMode: null, nodePlacementMode: null, selectedBusId: null })
})

describe('CanvasArea passes the performance mode through to every Wire3D', () => {
  it('draws a selected wire 3 wide with a 31-point hop, and redraws it 2 wide with a 13-point hop in low-power mode', () => {
    const wire = seedWire()
    useCircuitStore.setState({ selectedWireId: wire.id })
    render(<CanvasArea />)

    expect(drawn()).toEqual([[2, 3], [31, 3], [2, 3]])

    act(() => useCircuitStore.setState({ performanceMode: 'low-power' }))
    expect(drawn()).toEqual([[2, 2], [13, 2], [2, 2]])
  })

  it('draws an unselected wire 1 wide in either mode', () => {
    seedWire()
    useCircuitStore.setState({ performanceMode: 'low-power' })
    render(<CanvasArea />)

    expect(drawn()).toEqual([[2, 1], [13, 1], [2, 1]])
  })
})
