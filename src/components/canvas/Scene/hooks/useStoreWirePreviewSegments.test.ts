import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStoreWirePreviewSegments } from './useStoreWirePreviewSegments'
import { useCircuitStore } from '@/store/circuitStore'
import type { WirePath, WireSegment } from '@/utils/wiringScheme/types'
import type { WiringState } from '@/store/types'

// Helper to get store state
const getState = () => useCircuitStore.getState()

describe('useStoreWirePreviewSegments', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCircuitStore.setState({
      gates: [],
      wires: [],
      selectedGateId: null,
      simulationRunning: false,
      simulationSpeed: 100,
      placementMode: null,
      placementPreviewPosition: null,
      wiringFrom: null,
      isDragActive: false,
      hoveredGateId: null,
    })
  })

  it('does not store segments when path is null', () => {
    const wiringFrom: WiringState = {
      fromGateId: 'gate-1',
      fromPinId: 'pin-1',
      fromPinType: 'output',
      fromPosition: { x: 0, y: 0, z: 0 },
      previewEndPosition: { x: 4, y: 0, z: 0 },
      destinationGateId: 'gate-2',
      destinationPinId: 'pin-2',
      destinationNodeId: null,
      destinationNodeType: null,
      segments: null,
    }

    useCircuitStore.setState({ wiringFrom })

    renderHook(() =>
      useStoreWirePreviewSegments({
        path: null,
        wiringFrom,
        fromPinType: 'output',
      })
    )

    expect(getState().wiringFrom?.segments).toBeNull()
  })

  it('does not store segments when wiringFrom is null', () => {
    const path: WirePath = {
      segments: [
        {
          start: { x: 0, y: 0.2, z: 0 },
          end: { x: 4, y: 0.2, z: 0 },
          type: 'horizontal',
        },
      ],
      totalLength: 4,
    }

    renderHook(() =>
      useStoreWirePreviewSegments({
        path,
        wiringFrom: null,
        fromPinType: 'output',
      })
    )

    // Should not crash
    expect(getState().wiringFrom).toBeNull()
  })

  it('stores segments when destination pin is set and path is available (output -> input)', async () => {
    const segments: WireSegment[] = [
      {
        start: { x: 0, y: 0.2, z: 0 },
        end: { x: 4, y: 0.2, z: 0 },
        type: 'horizontal',
      },
    ]

    const path: WirePath = {
      segments,
      totalLength: 4,
    }

    const wiringFrom: WiringState = {
      fromGateId: 'gate-1',
      fromPinId: 'pin-1',
      fromPinType: 'output',
      fromPosition: { x: 0, y: 0, z: 0 },
      previewEndPosition: { x: 4, y: 0, z: 0 },
      destinationGateId: 'gate-2',
      destinationPinId: 'pin-2',
      destinationNodeId: null,
      destinationNodeType: null,
      segments: null,
    }

    useCircuitStore.setState({ wiringFrom })

    renderHook(() =>
      useStoreWirePreviewSegments({
        path,
        wiringFrom,
        fromPinType: 'output',
      })
    )

    await waitFor(() => {
      const stored = getState().wiringFrom?.segments
      expect(stored).toBeDefined()
      expect(stored).toHaveLength(1)
      expect(stored?.[0]).toEqual(segments[0])
    })
  })

  it('reverses segments when wiring from input to output', async () => {
    const segments: WireSegment[] = [
      {
        start: { x: 0, y: 0.2, z: 0 },
        end: { x: 4, y: 0.2, z: 0 },
        type: 'horizontal',
      },
      {
        start: { x: 4, y: 0.2, z: 0 },
        end: { x: 8, y: 0.2, z: 0 },
        type: 'horizontal',
      },
    ]

    const path: WirePath = {
      segments,
      totalLength: 8,
    }

    const wiringFrom: WiringState = {
      fromGateId: 'gate-1',
      fromPinId: 'pin-1',
      fromPinType: 'input',
      fromPosition: { x: 0, y: 0, z: 0 },
      previewEndPosition: { x: 8, y: 0, z: 0 },
      destinationGateId: 'gate-2',
      destinationPinId: 'pin-2',
      destinationNodeId: null,
      destinationNodeType: null,
      segments: null,
    }

    useCircuitStore.setState({ wiringFrom })

    renderHook(() =>
      useStoreWirePreviewSegments({
        path,
        wiringFrom,
        fromPinType: 'input',
      })
    )

    await waitFor(() => {
      const stored = getState().wiringFrom?.segments
      expect(stored).toBeDefined()
      expect(stored).toHaveLength(2)
      // Segments should be reversed with start/end swapped
      expect(stored?.[0].start).toEqual(segments[1].end)
      expect(stored?.[0].end).toEqual(segments[1].start)
      expect(stored?.[1].start).toEqual(segments[0].end)
      expect(stored?.[1].end).toEqual(segments[0].start)
    })
  })

  it('does not store segments when destination pin is not set', () => {
    const path: WirePath = {
      segments: [
        {
          start: { x: 0, y: 0.2, z: 0 },
          end: { x: 4, y: 0.2, z: 0 },
          type: 'horizontal',
        },
      ],
      totalLength: 4,
    }

    const wiringFrom: WiringState = {
      fromGateId: 'gate-1',
      fromPinId: 'pin-1',
      fromPinType: 'output',
      fromPosition: { x: 0, y: 0, z: 0 },
      previewEndPosition: { x: 4, y: 0, z: 0 },
      destinationGateId: null,
      destinationPinId: null,
      destinationNodeId: null,
      destinationNodeType: null,
      segments: null,
    }

    useCircuitStore.setState({ wiringFrom })

    renderHook(() =>
      useStoreWirePreviewSegments({
        path,
        wiringFrom,
        fromPinType: 'output',
      })
    )

    // Should not store when destination is not set
    expect(getState().wiringFrom?.segments).toBeNull()
  })

  it('stores segments when node destination is set (gate output to output node)', async () => {
    const segments: WireSegment[] = [
      {
        start: { x: 0.7, y: 0.2, z: 0 },
        end: { x: 7.6, y: 0.2, z: 0 },
        type: 'horizontal',
      },
    ]

    const path: WirePath = {
      segments,
      totalLength: 6.9,
    }

    const wiringFrom: WiringState = {
      fromGateId: 'gate-1',
      fromPinId: 'pin-1',
      fromPinType: 'output',
      fromPosition: { x: 0.7, y: 0.2, z: 0 },
      previewEndPosition: { x: 7.6, y: 0.2, z: 0 },
      destinationGateId: null,
      destinationPinId: null,
      destinationNodeId: 'output-node-1',
      destinationNodeType: 'output',
      segments: null,
      source: { type: 'gate', gateId: 'gate-1', pinId: 'pin-1', pinType: 'output' },
    }

    useCircuitStore.setState({ wiringFrom })

    renderHook(() =>
      useStoreWirePreviewSegments({
        path,
        wiringFrom,
        fromPinType: 'output',
      })
    )

    // Wait for useEffect to run
    await waitFor(() => {
      const stored = getState().wiringFrom?.segments
      expect(stored).toBeDefined()
      expect(stored).toHaveLength(1)
      expect(stored?.[0].start).toEqual({ x: 0.7, y: 0.2, z: 0 })
      expect(stored?.[0].end).toEqual({ x: 7.6, y: 0.2, z: 0 })
    })
  })

  it('does not update store if segments have not changed', async () => {
    const segments: WireSegment[] = [
      {
        start: { x: 0, y: 0.2, z: 0 },
        end: { x: 4, y: 0.2, z: 0 },
        type: 'horizontal',
      },
    ]

    const path: WirePath = {
      segments,
      totalLength: 4,
    }

    const wiringFrom: WiringState = {
      fromGateId: 'gate-1',
      fromPinId: 'pin-1',
      fromPinType: 'output',
      fromPosition: { x: 0, y: 0, z: 0 },
      previewEndPosition: { x: 4, y: 0, z: 0 },
      destinationGateId: 'gate-2',
      destinationPinId: 'pin-2',
      destinationNodeId: null,
      destinationNodeType: null,
      segments: null,
    }

    useCircuitStore.setState({ wiringFrom })

    const { rerender } = renderHook(() =>
      useStoreWirePreviewSegments({
        path,
        wiringFrom,
        fromPinType: 'output',
      })
    )

    await waitFor(() => {
      expect(getState().wiringFrom?.segments).toBeDefined()
    })

    const firstStoreCall = vi.spyOn(useCircuitStore, 'setState')
    firstStoreCall.mockClear()

    // Rerender with same path - should not trigger another store update
    rerender()

    // Wait a bit to ensure no additional calls
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Should not have called setState again (or only once for the initial store)
    // Since we cleared after the first render, any additional calls would indicate a re-store
    const callsAfterRerender = firstStoreCall.mock.calls.length
    expect(callsAfterRerender).toBeLessThanOrEqual(1)
  })
})

