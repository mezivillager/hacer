import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useExistingSegments } from './useExistingSegments'
import { useCircuitStore } from '@/store/circuitStore'
import type { WireSegment } from '@/utils/wiringScheme/types'

// Helper to get store state
const getState = () => useCircuitStore.getState()

describe('useExistingSegments', () => {
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

  it('returns empty array when no wires exist', () => {
    const { result } = renderHook(() => useExistingSegments())

    expect(result.current).toEqual([])
  })

  it('collects segments from all wires', () => {
    const segment1: WireSegment = {
      start: { x: 0, y: 0.2, z: 0 },
      end: { x: 4, y: 0.2, z: 0 },
      type: 'horizontal',
    }
    const segment2: WireSegment = {
      start: { x: 4, y: 0.2, z: 0 },
      end: { x: 8, y: 0.2, z: 0 },
      type: 'horizontal',
    }

    const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
    const gate2 = getState().addGate('NAND', { x: 8, y: 0, z: 0 })

    getState().addWire(
      { type: 'gate', entityId: gate1.id, pinId: `${gate1.id}-out-0` },
      { type: 'gate', entityId: gate2.id, pinId: `${gate2.id}-in-0` },
      [segment1, segment2]
    )

    const { result } = renderHook(() => useExistingSegments())

    expect(result.current).toHaveLength(2)
    expect(result.current).toContainEqual(segment1)
    expect(result.current).toContainEqual(segment2)
  })

  it('updates when wires are added', () => {
    const { result, rerender } = renderHook(() => useExistingSegments())

    expect(result.current).toEqual([])

    const segment: WireSegment = {
      start: { x: 0, y: 0.2, z: 0 },
      end: { x: 4, y: 0.2, z: 0 },
      type: 'horizontal',
    }

    const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
    const gate2 = getState().addGate('NAND', { x: 4, y: 0, z: 0 })
    getState().addWire(
      { type: 'gate', entityId: gate1.id, pinId: `${gate1.id}-out-0` },
      { type: 'gate', entityId: gate2.id, pinId: `${gate2.id}-in-0` },
      [segment]
    )

    rerender()

    expect(result.current).toHaveLength(1)
    expect(result.current[0]).toEqual(segment)
  })
})

