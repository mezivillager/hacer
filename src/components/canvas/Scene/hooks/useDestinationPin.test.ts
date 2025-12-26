import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDestinationPin } from './useDestinationPin'
import { circuitActions } from '@/store/circuitStore'

// Mock circuitActions
vi.mock('@/store/circuitStore', async () => {
  const actual = await vi.importActual<typeof import('@/store/circuitStore')>('@/store/circuitStore')
  return {
    ...actual,
    circuitActions: {
      getPinWorldPosition: vi.fn(),
      getPinOrientation: vi.fn(),
    },
  }
})

describe('useDestinationPin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when wiringFrom is null', () => {
    const { result } = renderHook(() => useDestinationPin(null))

    expect(result.current).toBeNull()
  })

  it('returns cursor destination when no destination pin is set', () => {
    const wiringFrom = {
      destinationGateId: null,
      destinationPinId: null,
      previewEndPosition: { x: 10, y: 0.2, z: 20 },
    }

    const { result } = renderHook(() => useDestinationPin(wiringFrom as Parameters<typeof useDestinationPin>[0]))

    expect(result.current).toEqual({
      destination: {
        type: 'cursor',
        pos: { x: 10, y: 0.2, z: 20 },
      },
      destinationGateId: undefined,
    })
  })

  it('returns pin destination when destination pin is set', () => {
    const pinCenter = { x: 5, y: 0.2, z: 10 }
    const pinOrientation = { x: 1, y: 0, z: 0 }

    vi.mocked(circuitActions.getPinWorldPosition).mockReturnValue(pinCenter)
    vi.mocked(circuitActions.getPinOrientation).mockReturnValue(pinOrientation)

    const wiringFrom = {
      destinationGateId: 'gate-1',
      destinationPinId: 'pin-1',
      previewEndPosition: { x: 10, y: 0.2, z: 20 },
    }

    const { result } = renderHook(() => useDestinationPin(wiringFrom as Parameters<typeof useDestinationPin>[0]))

    expect(result.current).toEqual({
      destination: {
        type: 'pin',
        pin: pinCenter,
        orientation: { direction: pinOrientation },
      },
      destinationGateId: 'gate-1',
    })
  })

  it('returns cursor destination when pin position or orientation is not available', () => {
    vi.mocked(circuitActions.getPinWorldPosition).mockReturnValue(null)
    vi.mocked(circuitActions.getPinOrientation).mockReturnValue(null)

    const wiringFrom = {
      destinationGateId: 'gate-1',
      destinationPinId: 'pin-1',
      previewEndPosition: { x: 10, y: 0.2, z: 20 },
    }

    const { result } = renderHook(() => useDestinationPin(wiringFrom as Parameters<typeof useDestinationPin>[0]))

    expect(result.current).toEqual({
      destination: {
        type: 'cursor',
        pos: { x: 10, y: 0.2, z: 20 },
      },
      destinationGateId: undefined,
    })
  })
})

