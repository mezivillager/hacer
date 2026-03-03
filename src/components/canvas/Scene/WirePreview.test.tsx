import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { message } from 'antd'
import { WirePreview } from './WirePreview'
import { useCircuitStore } from '@/store/circuitStore'
import { calculateWirePath } from '@/utils/wiringScheme'

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    message: {
      error: vi.fn(),
    },
  }
})

// Mock wiringScheme/core
vi.mock('@/utils/wiringScheme/core', () => ({
  calculateWirePath: vi.fn(() => ({
    segments: [
      {
        start: { x: 0, y: 0.2, z: 0 },
        end: { x: 2, y: 0.2, z: 2 },
        type: 'horizontal',
      },
    ],
    totalLength: 2.828,
  })),
}))

// Mock Wire3D component
vi.mock('../Wire3D', () => ({
  Wire3D: ({ start, end, isPreview }: { start: unknown; end: unknown; isPreview: boolean }) => (
    <div data-testid="wire-3d" data-start={JSON.stringify(start)} data-end={JSON.stringify(end)} data-preview={isPreview}>
      Wire3D
    </div>
  ),
}))

// Mock pinHelpers
vi.mock('@/store/circuitStore', async () => {
  const actual = await vi.importActual('@/store/circuitStore')
  const mockGetPinOrientation = vi.fn(() => ({ x: 1, y: 0, z: 0 }))
  const mockCancelWiring = vi.fn()
  return {
    ...actual,
    circuitActions: {
      getPinOrientation: mockGetPinOrientation,
      cancelWiring: mockCancelWiring,
    },
  }
})

const setState = useCircuitStore.setState

describe('WirePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setState({
      wiringFrom: null,
    })
    vi.mocked(calculateWirePath).mockReturnValue({
      segments: [
        {
          start: { x: 0, y: 0.2, z: 0 },
          end: { x: 2, y: 0.2, z: 2 },
          type: 'horizontal',
        },
      ],
      totalLength: 2.828,
    })
  })

  it('returns null when wiringFrom is null', () => {
    const { container } = render(<WirePreview />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when wiringFrom exists but previewEndPosition is null', () => {
    setState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0, z: 0 },
        previewEndPosition: null,
        destinationGateId: null,
        destinationPinId: null,
        segments: null,
      },
    })
    const { container } = render(<WirePreview />)
    expect(container.firstChild).toBeNull()
  })

  it('renders Wire3D segments when wiringFrom and previewEndPosition are set', () => {
    setState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0.2, z: 0 },
        previewEndPosition: { x: 2, y: 0.2, z: 2 },
        destinationGateId: null,
        destinationPinId: null,
        segments: null,
      },
      gates: [],
    })
    const { getAllByTestId } = render(<WirePreview />)
    const wires = getAllByTestId('wire-3d')
    expect(wires.length).toBeGreaterThan(0)
    expect(wires[0].getAttribute('data-preview')).toBe('true')
  })

    it('renders segments from calculateWirePath', () => {
    const fromPosition = { x: 1, y: 0.2, z: 1 }
    const previewEndPosition = { x: 3, y: 0.2, z: 3 }
    setState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition,
        previewEndPosition,
        destinationGateId: null,
        destinationPinId: null,
        segments: null,
      },
      gates: [],
    })
    const { getAllByTestId } = render(<WirePreview />)
    const wires = getAllByTestId('wire-3d')
    // Should render at least one segment from the mocked calculateWirePath
    expect(wires.length).toBeGreaterThan(0)
    // All segments should be marked as preview
    wires.forEach(wire => {
      expect(wire.getAttribute('data-preview')).toBe('true')
    })
  })

  it('handles pathfinding errors gracefully', async () => {
    // Import circuitActions to access the mocked cancelWiring
    const { circuitActions } = await import('@/store/circuitStore')

    // Mock calculateWirePath to throw an error
    const pathfindingError = new Error('Pathfinding failed: no progress possible')
    vi.mocked(calculateWirePath).mockImplementation(() => {
      throw pathfindingError
    })

    // Mock console.error to verify it's called
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    setState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0.2, z: 0 },
        previewEndPosition: { x: 2, y: 0.2, z: 2 },
        destinationGateId: null,
        destinationPinId: null,
        segments: null,
      },
      gates: [],
    })

    const { container } = render(<WirePreview />)

    // Should return null (no rendering)
    expect(container.firstChild).toBeNull()

    // Should log error to console (from useWirePreviewPath hook)
    expect(consoleErrorSpy).toHaveBeenCalledWith('[WirePreview] Pathfinding error:', pathfindingError)

    // Should show error notification
    expect(message.error).toHaveBeenCalledWith('Unable to create wire path. Please try a different connection.')

    // Should cancel wiring
    expect(vi.mocked(circuitActions.cancelWiring)).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
