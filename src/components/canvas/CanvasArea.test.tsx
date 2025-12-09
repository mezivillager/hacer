import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { CanvasArea } from './CanvasArea'
import { circuitStore } from '@/store/circuitStore'

// Mock 3D components
vi.mock('./Scene', () => ({
  Scene: ({ children }: { children: React.ReactNode }) => <div data-testid="scene">{children}</div>,
}))

vi.mock('@/gates/NandGate', () => ({
  NandGate: () => <div data-testid="nand-gate">NandGate</div>,
}))

vi.mock('./Wire3D', () => ({
  Wire3D: () => <div data-testid="wire-3d">Wire3D</div>,
}))

// Mock useCircuitStore
vi.mock('@/store/circuitStore', async () => {
  const actual = await vi.importActual('@/store/circuitStore')
  return {
    ...actual,
    useCircuitStore: () => circuitStore,
  }
})

describe('CanvasArea', () => {
  beforeEach(() => {
    // Reset store
    circuitStore.gates = []
    circuitStore.wires = []
    circuitStore.placementMode = null
    circuitStore.wiringFrom = null
  })

  it('renders Scene component', () => {
    const { getByTestId } = render(<CanvasArea />)
    expect(getByTestId('scene')).toBeInTheDocument()
  })

  it('renders help overlay with default text', () => {
    const { container } = render(<CanvasArea />)
    const helpText = container.querySelector('.help-overlay')
    expect(helpText).toBeInTheDocument()
    expect(helpText?.textContent).toContain('Click pin: Wire')
  })

  it('shows placement help text when in placement mode', () => {
    circuitStore.placementMode = 'NAND'
    const { container } = render(<CanvasArea />)
    const helpText = container.querySelector('.help-overlay')
    expect(helpText?.textContent).toContain('Click anywhere on the grid')
  })

  it('shows wiring help text when in wiring mode', () => {
    circuitStore.wiringFrom = {
      fromGateId: 'gate-1',
      fromPinId: 'pin-1',
      fromPinType: 'output',
      fromPosition: { x: 0, y: 0, z: 0 },
      previewEndPosition: null,
    }
    const { container } = render(<CanvasArea />)
    const helpText = container.querySelector('.help-overlay')
    expect(helpText?.textContent).toContain('Click on another pin to connect')
  })

  it('applies placing class when in placement mode', () => {
    circuitStore.placementMode = 'NAND'
    const { container } = render(<CanvasArea />)
    const content = container.querySelector('.app-content')
    expect(content?.className).toContain('placing')
  })

  it('applies wiring class when in wiring mode', () => {
    circuitStore.wiringFrom = {
      fromGateId: 'gate-1',
      fromPinId: 'pin-1',
      fromPinType: 'output',
      fromPosition: { x: 0, y: 0, z: 0 },
      previewEndPosition: null,
    }
    const { container } = render(<CanvasArea />)
    const content = container.querySelector('.app-content')
    expect(content?.className).toContain('wiring')
  })
})
