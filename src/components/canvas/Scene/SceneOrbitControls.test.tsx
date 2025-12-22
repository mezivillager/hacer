import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { SceneOrbitControls } from './SceneOrbitControls'
import { useCircuitStore } from '@/store/circuitStore'

// Mock OrbitControls
vi.mock('@react-three/drei', () => ({
  OrbitControls: (props: Record<string, unknown>) => (
    <div
      data-testid="orbit-controls"
      data-enablerotate={String(props.enableRotate)}
      data-enablepan={String(props.enablePan)}
      data-enablezoom={String(props.enableZoom)}
    >
      OrbitControls
    </div>
  ),
}))

const setState = useCircuitStore.setState

describe('SceneOrbitControls', () => {
  beforeEach(() => {
    setState({
      isDragActive: false,
      placementMode: null,
      wiringFrom: null,
      hoveredGateId: null,
    })
  })

  it('renders OrbitControls', () => {
    const { getByTestId } = render(<SceneOrbitControls />)
    expect(getByTestId('orbit-controls')).toBeInTheDocument()
  })

  it('enables rotation and pan when no interactions active', () => {
    const { getByTestId } = render(<SceneOrbitControls />)
    const controls = getByTestId('orbit-controls')
    expect(controls.getAttribute('data-enablerotate')).toBe('true')
    expect(controls.getAttribute('data-enablepan')).toBe('true')
  })

  it('always enables zoom', () => {
    const { getByTestId } = render(<SceneOrbitControls />)
    const controls = getByTestId('orbit-controls')
    expect(controls.getAttribute('data-enablezoom')).toBe('true')
  })

  it('disables rotation and pan when dragging', () => {
    setState({ isDragActive: true })
    const { getByTestId } = render(<SceneOrbitControls />)
    const controls = getByTestId('orbit-controls')
    expect(controls.getAttribute('data-enablerotate')).toBe('false')
    expect(controls.getAttribute('data-enablepan')).toBe('false')
  })

  it('disables rotation and pan when in placement mode', () => {
    setState({ placementMode: 'NAND' })
    const { getByTestId } = render(<SceneOrbitControls />)
    const controls = getByTestId('orbit-controls')
    expect(controls.getAttribute('data-enablerotate')).toBe('false')
    expect(controls.getAttribute('data-enablepan')).toBe('false')
  })

  it('disables rotation and pan when wiring', () => {
    setState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0, z: 0 },
        previewEndPosition: null,
        destinationGateId: null,
        destinationPinId: null,
      },
    })
    const { getByTestId } = render(<SceneOrbitControls />)
    const controls = getByTestId('orbit-controls')
    expect(controls.getAttribute('data-enablerotate')).toBe('false')
    expect(controls.getAttribute('data-enablepan')).toBe('false')
  })

  it('disables rotation and pan when hovering over a gate', () => {
    setState({ hoveredGateId: 'gate-1' })
    const { getByTestId } = render(<SceneOrbitControls />)
    const controls = getByTestId('orbit-controls')
    expect(controls.getAttribute('data-enablerotate')).toBe('false')
    expect(controls.getAttribute('data-enablepan')).toBe('false')
  })

  it('keeps zoom enabled during interactions', () => {
    setState({ isDragActive: true, placementMode: 'AND' })
    const { getByTestId } = render(<SceneOrbitControls />)
    const controls = getByTestId('orbit-controls')
    expect(controls.getAttribute('data-enablezoom')).toBe('true')
  })
})
