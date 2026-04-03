import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { CanvasArea } from './CanvasArea'
import { useCircuitStore } from '@/store/circuitStore'

// Mock 3D components
vi.mock('./Scene', () => ({
  Scene: ({ children }: { children: React.ReactNode }) => <div data-testid="scene">{children}</div>,
}))

vi.mock('@/gates', () => ({
  GateRenderer: () => <div data-testid="gate-renderer">GateRenderer</div>,
}))

vi.mock('./Wire3D', () => ({
  Wire3D: () => <div data-testid="wire-3d">Wire3D</div>,
}))

// Get a reference to the actual store's setState for resetting
const actualSetState = useCircuitStore.setState

describe('CanvasArea', () => {
  beforeEach(() => {
    // Reset store using the actual setState
    actualSetState({
      gates: [],
      wires: [],
      selectedGateId: null,
      simulationRunning: false,
      simulationSpeed: 100,
      placementMode: null,
      wiringFrom: null,
    })
  })

  it('renders Scene component', () => {
    const { getByTestId } = render(<CanvasArea />)
    expect(getByTestId('scene')).toBeInTheDocument()
  })

  it('renders help overlay with default text', () => {
    const { getByTestId } = render(<CanvasArea />)
    const helpText = getByTestId('help-overlay')
    expect(helpText).toBeInTheDocument()
    expect(helpText.textContent).toContain('Click pin: Wire')
  })

  it('shows placement help text when in placement mode', () => {
    actualSetState({ placementMode: 'NAND' })
    const { getByTestId } = render(<CanvasArea />)
    const helpText = getByTestId('help-overlay')
    expect(helpText.textContent).toContain('Click anywhere on the grid')
  })

  it('shows wiring help text when in wiring mode', () => {
    actualSetState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0, z: 0 },
        previewEndPosition: null,
        destinationGateId: null,
        destinationPinId: null,
        destinationNodeId: null,
        destinationNodeType: null,
        segments: null,
      }
    })
    const { getByTestId } = render(<CanvasArea />)
    const helpText = getByTestId('help-overlay')
    expect(helpText.textContent).toContain('Click on another pin to connect')
  })

  it('applies placing class when in placement mode', () => {
    actualSetState({ placementMode: 'NAND' })
    const { container } = render(<CanvasArea />)
    const content = container.querySelector('.canvas-area')
    expect(content?.className).toContain('placing')
  })

  it('applies wiring class when in wiring mode', () => {
    actualSetState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0, z: 0 },
        previewEndPosition: null,
        destinationGateId: null,
        destinationPinId: null,
        destinationNodeId: null,
        destinationNodeType: null,
        segments: null,
      }
    })
    const { container } = render(<CanvasArea />)
    const content = container.querySelector('.canvas-area')
    expect(content?.className).toContain('wiring')
  })
})
