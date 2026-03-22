import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { BaseGate } from './BaseGate'
import type { PinConfig } from '../types'
import type { GateType } from '@/store/types'

// Mock dependencies
vi.mock('@/store/circuitStore', () => {
  const mockState = {
    placementMode: null,
    wiringFrom: null,
    wires: [],
    gates: [],
  }
  // Create a function that supports selector pattern and also has getState
  const useCircuitStore = Object.assign(
    <T,>(selector: (state: typeof mockState) => T): T => selector(mockState),
    { getState: () => mockState }
  )
  return {
    useCircuitStore,
    circuitActions: {
      setHoveredGate: vi.fn(),
      updateWirePreviewPosition: vi.fn(),
    },
  }
})

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

vi.mock('./WireStub', () => ({
  WireStub: ({ position }: { position: [number, number, number] }) => (
    <div data-testid={`wire-stub-${position[0]}-${position[1]}-${position[2]}`}>WireStub</div>
  ),
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
    output: 0,
    inputs: [0, 0],
    pinConfigs: [
      {
        pinId: 'gate-1-in-0',
        position: [-0.6, 0.2, 0] as [number, number, number],
        value: 0,
        connected: false,
        pinType: 'input' as const,
        pinName: 'inputA',
      },
      {
        pinId: 'gate-1-out-0',
        position: [0.6, 0, 0] as [number, number, number],
        value: 0,
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

  describe('Wire Stub Visibility', () => {
    it('hides input stub when input pin is connected', () => {
      const props = {
        ...defaultProps,
        pinConfigs: [
          {
            ...defaultProps.pinConfigs[0],
            connected: true, // input connected
          },
          defaultProps.pinConfigs[1], // output not connected
        ],
        wireStubPositions: [[-0.75, 0.2, 0], [0.75, 0, 0]] as [number, number, number][], // input stub, output stub
      }
      const { queryByTestId } = render(<BaseGate {...props} />)
      // Input stub should not be rendered when input is connected
      expect(queryByTestId('wire-stub--0.75-0.2-0')).not.toBeInTheDocument()
      // Output stub should be rendered when output is not connected
      expect(queryByTestId('wire-stub-0.75-0-0')).toBeInTheDocument()
    })

    it('hides output stub when output pin is connected', () => {
      const props = {
        ...defaultProps,
        pinConfigs: [
          defaultProps.pinConfigs[0], // input not connected
          {
            ...defaultProps.pinConfigs[1],
            connected: true, // output connected
          },
        ],
        wireStubPositions: [[-0.75, 0.2, 0], [0.75, 0, 0]] as [number, number, number][], // input stub, output stub
      }
      const { queryByTestId } = render(<BaseGate {...props} />)
      // Input stub should be rendered when input is not connected
      expect(queryByTestId('wire-stub--0.75-0.2-0')).toBeInTheDocument()
      // Output stub should not be rendered when output is connected
      expect(queryByTestId('wire-stub-0.75-0-0')).not.toBeInTheDocument()
    })

    it('shows input stub when input pin is not connected', () => {
      const props = {
        ...defaultProps,
        pinConfigs: [
          {
            ...defaultProps.pinConfigs[0],
            connected: false, // input not connected
          },
          defaultProps.pinConfigs[1],
        ],
        wireStubPositions: [[-0.75, 0.2, 0], [0.75, 0, 0]] as [number, number, number][],
      }
      const { queryByTestId } = render(<BaseGate {...props} />)
      // Input stub should be rendered when input is not connected
      expect(queryByTestId('wire-stub--0.75-0.2-0')).toBeInTheDocument()
    })

    it('shows output stub when output pin is not connected', () => {
      const props = {
        ...defaultProps,
        pinConfigs: [
          defaultProps.pinConfigs[0],
          {
            ...defaultProps.pinConfigs[1],
            connected: false, // output not connected
          },
        ],
        wireStubPositions: [[-0.75, 0.2, 0], [0.75, 0, 0]] as [number, number, number][],
      }
      const { queryByTestId } = render(<BaseGate {...props} />)
      // Output stub should be rendered when output is not connected
      expect(queryByTestId('wire-stub-0.75-0-0')).toBeInTheDocument()
    })

    it('hides all stubs when all pins are connected', () => {
      const props = {
        ...defaultProps,
        pinConfigs: [
          {
            ...defaultProps.pinConfigs[0],
            connected: true, // input connected
          },
          {
            ...defaultProps.pinConfigs[1],
            connected: true, // output connected
          },
        ],
        wireStubPositions: [[-0.75, 0.2, 0], [0.75, 0, 0]] as [number, number, number][],
      }
      const { queryByTestId } = render(<BaseGate {...props} />)
      // All stubs should be hidden when all pins are connected
      expect(queryByTestId('wire-stub--0.75-0.2-0')).not.toBeInTheDocument()
      expect(queryByTestId('wire-stub-0.75-0-0')).not.toBeInTheDocument()
    })

    it('shows all stubs when no pins are connected', () => {
      const props = {
        ...defaultProps,
        pinConfigs: [
          {
            ...defaultProps.pinConfigs[0],
            connected: false, // input not connected
          },
          {
            ...defaultProps.pinConfigs[1],
            connected: false, // output not connected
          },
        ],
        wireStubPositions: [[-0.75, 0.2, 0], [0.75, 0, 0]] as [number, number, number][],
      }
      const { queryByTestId } = render(<BaseGate {...props} />)
      // All stubs should be visible when no pins are connected
      expect(queryByTestId('wire-stub--0.75-0.2-0')).toBeInTheDocument()
      expect(queryByTestId('wire-stub-0.75-0-0')).toBeInTheDocument()
    })

    it('handles two-input gates with multiple stubs correctly', () => {
      // Test for gates with inputA, inputB, and output
      const twoInputProps = {
        ...defaultProps,
        pinConfigs: [
          {
            pinId: 'gate-1-in-0',
            position: [-0.6, 0.2, 0] as [number, number, number],
            value: 0,
            connected: true, // inputA connected
            pinType: 'input' as const,
            pinName: 'inputA',
          },
          {
            pinId: 'gate-1-in-1',
            position: [-0.6, -0.2, 0] as [number, number, number],
            value: 0,
            connected: false, // inputB not connected
            pinType: 'input' as const,
            pinName: 'inputB',
          },
          {
            pinId: 'gate-1-out-0',
            position: [0.6, 0, 0] as [number, number, number],
            value: 0,
            connected: false, // output not connected
            pinType: 'output' as const,
            pinName: 'output',
          },
        ] as PinConfig[],
        wireStubPositions: [
          [-0.75, 0.2, 0], // inputA stub
          [-0.75, -0.2, 0], // inputB stub
          [0.75, 0, 0], // output stub
        ] as [number, number, number][],
      }
      const { queryByTestId } = render(<BaseGate {...twoInputProps} />)
      // inputA stub should be hidden (connected)
      expect(queryByTestId('wire-stub--0.75-0.2-0')).not.toBeInTheDocument()
      // inputB stub should be visible (not connected)
      expect(queryByTestId('wire-stub--0.75--0.2-0')).toBeInTheDocument()
      // output stub should be visible (not connected)
      expect(queryByTestId('wire-stub-0.75-0-0')).toBeInTheDocument()
    })
  })
})
