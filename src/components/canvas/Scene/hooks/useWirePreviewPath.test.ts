import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useWirePreviewPath } from './useWirePreviewPath'
import { calculateWirePath, canExtendPath, extendPathFromEnd } from '@/utils/wiringScheme'
import type { WirePath, WireSegment, DestinationType } from '@/utils/wiringScheme/types'
import type { WiringState } from '@/store/types'

// Mock the wiring scheme functions
vi.mock('@/utils/wiringScheme', async () => {
  const actual = await vi.importActual<typeof import('@/utils/wiringScheme')>('@/utils/wiringScheme')
  return {
    ...actual,
    calculateWirePath: vi.fn(),
    canExtendPath: vi.fn(),
    extendPathFromEnd: vi.fn(),
  }
})

describe('useWirePreviewPath', () => {
  const createWirePath = (segments: WireSegment[]): WirePath => ({
    segments,
    totalLength: segments.reduce((sum, seg) => {
      const dx = seg.end.x - seg.start.x
      const dy = seg.end.y - seg.start.y
      const dz = seg.end.z - seg.start.z
      return sum + Math.sqrt(dx * dx + dy * dy + dz * dz)
    }, 0),
  })

  const createWiringState = (): WiringState => ({
    fromGateId: 'gate-1',
    fromPinId: 'pin-1',
    fromPinType: 'output',
    fromPosition: { x: 0, y: 0, z: 0 },
    previewEndPosition: { x: 4, y: 0.2, z: 0 },
    destinationGateId: null,
    destinationPinId: null,
    segments: null,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null path when wiringFrom is null', () => {
    const destination: DestinationType = {
      type: 'cursor',
      pos: { x: 4, y: 0.2, z: 0 },
    }

    const { result } = renderHook(() =>
      useWirePreviewPath({
        wiringFrom: null,
        destination,
        destinationGateId: undefined,
        existingSegments: [],
        startOrientation: { x: 1, y: 0, z: 0 },
        allGates: [],
        fromPosition: { x: 0, y: 0, z: 0 },
      })
    )

    expect(result.current.path).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('returns null path when destination is null', () => {
    const wiringFrom = createWiringState()

    const { result } = renderHook(() =>
      useWirePreviewPath({
        wiringFrom,
        destination: null,
        destinationGateId: undefined,
        existingSegments: [],
        startOrientation: { x: 1, y: 0, z: 0 },
        allGates: [],
        fromPosition: wiringFrom.fromPosition,
      })
    )

    expect(result.current.path).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('returns null path when startOrientation is null', () => {
    const wiringFrom = createWiringState()
    const destination: DestinationType = {
      type: 'cursor',
      pos: { x: 4, y: 0.2, z: 0 },
    }

    const { result } = renderHook(() =>
      useWirePreviewPath({
        wiringFrom,
        destination,
        destinationGateId: undefined,
        existingSegments: [],
        startOrientation: null,
        allGates: [],
        fromPosition: wiringFrom.fromPosition,
      })
    )

    expect(result.current.path).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('calculates path from scratch when no previous path exists', () => {
    const wiringFrom = createWiringState()
    const destination: DestinationType = {
      type: 'cursor',
      pos: { x: 4, y: 0.2, z: 0 },
    }

    const mockPath: WirePath = createWirePath([
      {
        start: { x: 0, y: 0.2, z: 0 },
        end: { x: 4, y: 0.2, z: 0 },
        type: 'horizontal',
      },
    ])

    vi.mocked(calculateWirePath).mockReturnValue(mockPath)

    const { result } = renderHook(() =>
      useWirePreviewPath({
        wiringFrom,
        destination,
        destinationGateId: undefined,
        existingSegments: [],
        startOrientation: { x: 1, y: 0, z: 0 },
        allGates: [],
        fromPosition: wiringFrom.fromPosition,
      })
    )

    expect(result.current.path).toEqual(mockPath)
    expect(result.current.error).toBeNull()
    expect(calculateWirePath).toHaveBeenCalledTimes(1)
  })

  it('reuses previous path when already reached pin destination', () => {
    const wiringFrom: WiringState = {
      ...createWiringState(),
      destinationGateId: 'gate-2',
      destinationPinId: 'pin-2',
    }

    const destination: DestinationType = {
      type: 'pin',
      pin: { x: 8, y: 0.2, z: 0 },
      orientation: { direction: { x: -1, y: 0, z: 0 } },
    }

    const previousPath: WirePath = createWirePath([
      {
        start: { x: 0, y: 0.2, z: 0 },
        end: { x: 4, y: 0.2, z: 0 },
        type: 'horizontal',
      },
      {
        start: { x: 8, y: 0.2, z: 0 },
        end: { x: 8, y: 0.2, z: 0 },
        type: 'entry',
      },
    ])

    vi.mocked(calculateWirePath).mockReturnValue(previousPath)

    // First render to establish previous path
    const { result, rerender } = renderHook(
      ({ wiringFrom, destination }) =>
        useWirePreviewPath({
          wiringFrom,
          destination,
          destinationGateId: wiringFrom.destinationGateId ?? undefined,
          existingSegments: [],
          startOrientation: { x: 1, y: 0, z: 0 },
          allGates: [],
          fromPosition: wiringFrom.fromPosition,
        }),
      {
        initialProps: { wiringFrom, destination },
      }
    )

    // Verify first path was calculated
    expect(result.current.path).toBeDefined()

    // Second render with same pin destination - should reuse previous path
    rerender({ wiringFrom, destination })

    // Should not call calculateWirePath again for pin destination when already reached
    // (The logic checks if last segment is 'entry' type, which means we reached the pin)
    expect(calculateWirePath).toHaveBeenCalledTimes(1)
  })

  it('extends path when extension is possible', () => {
    const wiringFrom = createWiringState()
    const previousPath: WirePath = createWirePath([
      {
        start: { x: 0, y: 0.2, z: 0 },
        end: { x: 4, y: 0.2, z: 0 },
        type: 'horizontal',
      },
    ])

    const extendedPath: WirePath = createWirePath([
      ...previousPath.segments,
      {
        start: { x: 4, y: 0.2, z: 0 },
        end: { x: 8, y: 0.2, z: 0 },
        type: 'horizontal',
      },
    ])

    const destination1: DestinationType = {
      type: 'cursor',
      pos: { x: 4, y: 0.2, z: 0 },
    }

    const destination2: DestinationType = {
      type: 'cursor',
      pos: { x: 8, y: 0.2, z: 0 },
    }

    vi.mocked(calculateWirePath).mockReturnValue(previousPath)
    vi.mocked(canExtendPath).mockReturnValue(true)
    vi.mocked(extendPathFromEnd).mockReturnValue(extendedPath)

    // First render
    const { result, rerender } = renderHook(
      ({ destination }) =>
        useWirePreviewPath({
          wiringFrom,
          destination,
          destinationGateId: undefined,
          existingSegments: [],
          startOrientation: { x: 1, y: 0, z: 0 },
          allGates: [],
          fromPosition: wiringFrom.fromPosition,
        }),
      {
        initialProps: { destination: destination1 },
      }
    )

    expect(result.current.path).toBeDefined()

    // Second render with new destination - should try to extend
    rerender({ destination: destination2 })

    expect(canExtendPath).toHaveBeenCalled()
    expect(extendPathFromEnd).toHaveBeenCalled()
  })

  it('recalculates from scratch when extension fails', () => {
    const wiringFrom = createWiringState()
    const previousPath: WirePath = createWirePath([
      {
        start: { x: 0, y: 0.2, z: 0 },
        end: { x: 4, y: 0.2, z: 0 },
        type: 'horizontal',
      },
    ])

    const recalculatedPath: WirePath = createWirePath([
      {
        start: { x: 0, y: 0.2, z: 0 },
        end: { x: 8, y: 0.2, z: 0 },
        type: 'horizontal',
      },
    ])

    const destination1: DestinationType = {
      type: 'cursor',
      pos: { x: 4, y: 0.2, z: 0 },
    }

    const destination2: DestinationType = {
      type: 'cursor',
      pos: { x: 8, y: 0.2, z: 0 },
    }

    vi.mocked(calculateWirePath)
      .mockReturnValueOnce(previousPath)
      .mockReturnValueOnce(recalculatedPath)
    vi.mocked(canExtendPath).mockReturnValue(true)
    vi.mocked(extendPathFromEnd).mockImplementation(() => {
      throw new Error('Extension failed')
    })

    // First render
    const { result, rerender } = renderHook(
      ({ destination }) =>
        useWirePreviewPath({
          wiringFrom,
          destination,
          destinationGateId: undefined,
          existingSegments: [],
          startOrientation: { x: 1, y: 0, z: 0 },
          allGates: [],
          fromPosition: wiringFrom.fromPosition,
        }),
      {
        initialProps: { destination: destination1 },
      }
    )

    expect(result.current.path).toBeDefined()

    // Second render - extension should fail and trigger recalculation
    rerender({ destination: destination2 })

    expect(extendPathFromEnd).toHaveBeenCalled()
    expect(calculateWirePath).toHaveBeenCalledTimes(2) // Once initially, once after extension fails
  })

  it('returns error when path calculation throws', () => {
    const wiringFrom = createWiringState()
    const destination: DestinationType = {
      type: 'cursor',
      pos: { x: 4, y: 0.2, z: 0 },
    }

    const error = new Error('Path calculation failed')
    vi.mocked(calculateWirePath).mockImplementation(() => {
      throw error
    })

    const { result } = renderHook(() =>
      useWirePreviewPath({
        wiringFrom,
        destination,
        destinationGateId: undefined,
        existingSegments: [],
        startOrientation: { x: 1, y: 0, z: 0 },
        allGates: [],
        fromPosition: wiringFrom.fromPosition,
      })
    )

    expect(result.current.path).toBeNull()
    expect(result.current.error).toEqual(error)
  })

  it('resets path state when wiring source changes', () => {
    const wiringFrom1: WiringState = {
      ...createWiringState(),
      fromGateId: 'gate-1',
      fromPinId: 'pin-1',
    }

    const wiringFrom2: WiringState = {
      ...createWiringState(),
      fromGateId: 'gate-2',
      fromPinId: 'pin-2',
    }

    const destination: DestinationType = {
      type: 'cursor',
      pos: { x: 4, y: 0.2, z: 0 },
    }

    const path1: WirePath = createWirePath([
      {
        start: { x: 0, y: 0.2, z: 0 },
        end: { x: 4, y: 0.2, z: 0 },
        type: 'horizontal',
      },
    ])

    const path2: WirePath = createWirePath([
      {
        start: { x: 0, y: 0.2, z: 0 },
        end: { x: 4, y: 0.2, z: 0 },
        type: 'vertical',
      },
    ])

    vi.mocked(calculateWirePath).mockReturnValueOnce(path1).mockReturnValueOnce(path2)

    const { rerender } = renderHook(
      ({ wiringFrom }) =>
        useWirePreviewPath({
          wiringFrom,
          destination,
          destinationGateId: undefined,
          existingSegments: [],
          startOrientation: { x: 1, y: 0, z: 0 },
          allGates: [],
          fromPosition: wiringFrom.fromPosition,
        }),
      {
        initialProps: { wiringFrom: wiringFrom1 },
      }
    )

    // Change wiring source
    rerender({ wiringFrom: wiringFrom2 })

    // Should recalculate from scratch (not extend from previous path)
    expect(calculateWirePath).toHaveBeenCalledTimes(2)
  })
})

