import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { BaseGate } from './BaseGate'
import type { PinConfig } from '../types'
import type { GateType } from '@/store/types'

// Mock dependencies
vi.mock('@/store/circuitStore', () => ({
  useCircuitStore: {
    getState: vi.fn(() => ({
      placementMode: null,
      wiringFrom: null,
    })),
  },
  circuitActions: {
    setHoveredGate: vi.fn(),
    updateWirePreviewPosition: vi.fn(),
  },
}))

vi.mock('@/hooks/useGateDrag', () => ({
  useGateDrag: vi.fn(() => ({
    isDragging: false,
    shouldAllowClick: vi.fn(() => true),
    onPointerDown: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerUp: vi.fn(),
    onPointerLeave: vi.fn(),
  })),
}))

vi.mock('@react-three/drei', () => ({
  Text: ({ children }: { children: string }) => <div data-testid="gate-text">{children}</div>,
}))

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: {},
    gl: { domElement: {} },
  })),
}))

describe('BaseGate', () => {
  const defaultProps = {
    id: 'gate-1',
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0] as [number, number, number],
    selected: false,
    isWiring: false,
    gateType: 'AND' as GateType,
    bodyColor: '#2d5a3d',
    bodyHoverColor: '#3d7a4d',
    bodySelectedColor: '#4a9eff',
    output: false,
    inputs: [false, false],
    pinConfigs: [
      {
        pinId: 'gate-1-in-0',
        position: [-0.6, 0.2, 0] as [number, number, number],
        value: false,
        connected: false,
        pinType: 'input' as const,
        pinName: 'inputA',
      },
      {
        pinId: 'gate-1-out-0',
        position: [0.6, 0, 0] as [number, number, number],
        value: false,
        connected: false,
        pinType: 'output' as const,
        pinName: 'output',
      },
    ] as PinConfig[],
    wireStubPositions: [[-0.75, 0.2, 0], [0.75, 0, 0]] as [number, number, number][],
    bodyGeometry: <boxGeometry args={[1, 0.8, 0.4]} />,
    textLabel: 'AND',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders gate with provided geometry', () => {
    const { container } = render(<BaseGate {...defaultProps} />)
    expect(container).toBeTruthy()
  })

  it('renders text label when provided', () => {
    const { getByTestId } = render(<BaseGate {...defaultProps} textLabel="AND" />)
    expect(getByTestId('gate-text')).toHaveTextContent('AND')
  })

  it('renders additional elements when provided', () => {
    const additionalElement = <div data-testid="additional-element">Bubble</div>
    const { getByTestId } = render(<BaseGate {...defaultProps} additionalElements={additionalElement} />)
    expect(getByTestId('additional-element')).toBeTruthy()
  })

  it('handles Three.js geometry objects', () => {
    // This test verifies the component accepts BufferGeometry objects
    // Actual geometry object testing would require Three.js setup
    const props = {
      ...defaultProps,
      bodyGeometry: undefined,
      bodyGeometryObject: {} as unknown as import('three').BufferGeometry, // Mock geometry object
    }
    const { container } = render(<BaseGate {...props} />)
    expect(container).toBeTruthy()
  })
})
