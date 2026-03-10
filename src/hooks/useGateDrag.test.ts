import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGateDrag } from './useGateDrag'
import { useCircuitStore } from '@/store/circuitStore'
import { createMockThreeEvent } from '@/test/testUtils'

// Helper to get store state
const getState = () => useCircuitStore.getState()

// Mock canvas element
const mockCanvas = {
  setPointerCapture: vi.fn(),
  releasePointerCapture: vi.fn(),
  closest: vi.fn((selector: string) => selector === 'canvas' ? mockCanvas : null),
  tagName: 'CANVAS',
} as unknown as HTMLElement

// Helper to create mock events with canvas target
const createMockEvent = (point: { x: number; y: number; z: number }) => {
  return createMockThreeEvent<PointerEvent>(point, {
    nativeEvent: {
      target: mockCanvas,
      pointerId: 1,
    } as unknown as PointerEvent,
    stopPropagation: vi.fn(),
  })
}

describe('useGateDrag', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCircuitStore.setState({
      gates: [],
      wires: [],
      selectedGateId: null,
      selectedWireId: null,
      simulationRunning: false,
      simulationSpeed: 100,
      placementMode: null,
      placementPreviewPosition: null,
      wiringFrom: null,
      // Node state fields
      inputNodes: [],
      outputNodes: [],
      junctions: [],
      nodePlacementMode: null,
      selectedNodeId: null,
      selectedNodeType: null,
    })
  })

  describe('drag start', () => {
    it('sets dragging state after movement exceeds threshold', () => {
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })

      const { result } = renderHook(() => useGateDrag(gate.id))

      expect(result.current.isDragging).toBe(false)

      // Pointer down does not set isDragging - waits for movement
      act(() => {
        result.current.onPointerDown(createMockEvent({ x: 2, y: 0.2, z: 2 }))
      })

      expect(result.current.isDragging).toBe(false)

      // Move beyond threshold to trigger drag state
      act(() => {
        result.current.onPointerMove(createMockEvent({ x: 2.5, y: 0.2, z: 2.5 }))
      })

      expect(result.current.isDragging).toBe(true)
    })

    it('does not start drag if gate does not exist', () => {
      const { result } = renderHook(() => useGateDrag('non-existent-id'))

      act(() => {
        result.current.onPointerDown(createMockEvent({ x: 0, y: 0, z: 0 }))
      })

      expect(result.current.isDragging).toBe(false)
    })

    it('stops propagation on drag start', () => {
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
      const { result } = renderHook(() => useGateDrag(gate.id))

      const mockEvent = createMockEvent({ x: 2, y: 0.2, z: 2 })

      act(() => {
        result.current.onPointerDown(mockEvent)
      })

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
    })
  })

  describe('drag move', () => {
    it('updates preview position during drag', () => {
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
      const { result } = renderHook(() => useGateDrag(gate.id))

      act(() => {
        result.current.onPointerDown(createMockEvent({ x: 2, y: 0.2, z: 2 }))
      })

      act(() => {
        result.current.onPointerMove(createMockEvent({ x: 4, y: 0.2, z: 4 }))
      })

      const previewPos = getState().placementPreviewPosition
      expect(previewPos).not.toBeNull()
      // Should snap to grid
      expect(previewPos?.x).toBeCloseTo(4, 1)
      expect(previewPos?.z).toBeCloseTo(4, 1)
      expect(previewPos?.y).toBe(0.2) // Y preserved
    })

    it('preserves Y coordinate during drag', () => {
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
      const { result } = renderHook(() => useGateDrag(gate.id))

      act(() => {
        result.current.onPointerDown(createMockEvent({ x: 2, y: 0.5, z: 2 }))
      })

      act(() => {
        result.current.onPointerMove(createMockEvent({ x: 4, y: 1.0, z: 4 }))
      })

      const previewPos = getState().placementPreviewPosition
      expect(previewPos?.y).toBe(0.2) // Y preserved from gate position, not event
    })

    it('cancels drag if gate is deleted during drag', () => {
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
      const { result } = renderHook(() => useGateDrag(gate.id))

      act(() => {
        result.current.onPointerDown(createMockEvent({ x: 2, y: 0.2, z: 2 }))
      })

      // Delete gate
      getState().removeGate(gate.id)

      act(() => {
        result.current.onPointerMove(createMockEvent({ x: 4, y: 0.2, z: 4 }))
      })

      expect(result.current.isDragging).toBe(false)
      expect(getState().placementPreviewPosition).toBeNull()
    })
  })

  describe('drag end', () => {
    it('updates gate position on valid drag end', () => {
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
      const { result } = renderHook(() => useGateDrag(gate.id))

      act(() => {
        result.current.onPointerDown(createMockEvent({ x: 2, y: 0.2, z: 2 }))
      })

      // Move beyond threshold
      act(() => {
        result.current.onPointerMove(createMockEvent({ x: 6, y: 0.2, z: 6 }))
      })

      act(() => {
        result.current.onPointerUp()
      })

      const updatedGate = getState().gates.find(g => g.id === gate.id)
      expect(updatedGate?.position.x).toBeCloseTo(6, 1)
      expect(updatedGate?.position.z).toBeCloseTo(6, 1)
      expect(updatedGate?.position.y).toBe(0.2)
    })

    it('does not update gate position if drag distance is below threshold', () => {
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
      const originalPos = { ...gate.position }
      const { result } = renderHook(() => useGateDrag(gate.id))

      act(() => {
        result.current.onPointerDown(createMockEvent({ x: 2, y: 0.2, z: 2 }))
      })

      // Move very little (below 0.1 threshold)
      act(() => {
        result.current.onPointerMove(createMockEvent({ x: 2.05, y: 0.2, z: 2.05 }))
      })

      act(() => {
        result.current.onPointerUp()
      })

      const updatedGate = getState().gates.find(g => g.id === gate.id)
      expect(updatedGate?.position).toEqual(originalPos) // Position unchanged
      expect(result.current.isDragging).toBe(false)
    })

    it('does not update gate position if final position is invalid', () => {
      const gate1 = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
      getState().addGate('AND', { x: 6, y: 0.2, z: 6 })
      const originalPos = { ...gate1.position }
      const { result } = renderHook(() => useGateDrag(gate1.id))

      act(() => {
        result.current.onPointerDown(createMockEvent({ x: 2, y: 0.2, z: 2 }))
      })

      // Try to drag to same position as gate2 (invalid - too close)
      act(() => {
        result.current.onPointerMove(createMockEvent({ x: 6, y: 0.2, z: 6 }))
      })

      act(() => {
        result.current.onPointerUp()
      })

      const updatedGate = getState().gates.find(g => g.id === gate1.id)
      expect(updatedGate?.position).toEqual(originalPos) // Position unchanged
    })

    it('excludes dragged gate from validation', () => {
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
      const { result } = renderHook(() => useGateDrag(gate.id))

      act(() => {
        result.current.onPointerDown(createMockEvent({ x: 2, y: 0.2, z: 2 }))
      })

      // Drag to same position (should be valid since we exclude the gate itself)
      act(() => {
        result.current.onPointerMove(createMockEvent({ x: 2, y: 0.2, z: 2 }))
      })

      act(() => {
        result.current.onPointerUp()
      })

      // Should succeed (gate can stay in same position)
      const updatedGate = getState().gates.find(g => g.id === gate.id)
      expect(updatedGate).toBeDefined()
    })

    it('clears preview position on drag end', () => {
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
      const { result } = renderHook(() => useGateDrag(gate.id))

      act(() => {
        result.current.onPointerDown(createMockEvent({ x: 2, y: 0.2, z: 2 }))
      })

      act(() => {
        result.current.onPointerMove(createMockEvent({ x: 6, y: 0.2, z: 6 }))
      })

      expect(getState().placementPreviewPosition).not.toBeNull()

      act(() => {
        result.current.onPointerUp()
      })

      expect(getState().placementPreviewPosition).toBeNull()
    })
  })

  describe('drag cancel', () => {
    it('cancels drag on pointer leave', () => {
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
      const { result } = renderHook(() => useGateDrag(gate.id))

      // Start dragging with pointer down and move beyond threshold
      act(() => {
        result.current.onPointerDown(createMockEvent({ x: 2, y: 0.2, z: 2 }))
      })
      act(() => {
        result.current.onPointerMove(createMockEvent({ x: 2.5, y: 0.2, z: 2.5 }))
      })

      expect(result.current.isDragging).toBe(true)

      act(() => {
        result.current.onPointerLeave()
      })

      expect(result.current.isDragging).toBe(false)
      expect(getState().placementPreviewPosition).toBeNull()
    })

    it('cancels drag if gate is deleted', () => {
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
      const { result } = renderHook(() => useGateDrag(gate.id))

      act(() => {
        result.current.onPointerDown(createMockEvent({ x: 2, y: 0.2, z: 2 }))
      })

      getState().removeGate(gate.id)

      act(() => {
        result.current.onPointerMove(createMockEvent({ x: 4, y: 0.2, z: 4 }))
      })

      expect(result.current.isDragging).toBe(false)
      expect(getState().placementPreviewPosition).toBeNull()
    })
  })

  describe('grid snapping', () => {
    it('snaps position to grid during drag', () => {
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
      const { result } = renderHook(() => useGateDrag(gate.id))

      act(() => {
        result.current.onPointerDown(createMockEvent({ x: 2, y: 0.2, z: 2 }))
      })

      // Move to position that should snap to grid
      act(() => {
        result.current.onPointerMove(createMockEvent({ x: 2.9, y: 0.2, z: 3.1 }))
      })

      const previewPos = getState().placementPreviewPosition
      // Starting at (2, 0.2, 2), moving to (2.9, 0.2, 3.1)
      // Delta: (0.9, 0, 1.1), new pos: (2.9, 0.2, 3.1)
      // Grid: (round(2.9/2), round(3.1/2)) = (1, 2)
      // World: (1*2, 0.2, 2*2) = (2, 0.2, 4)
      expect(previewPos?.x).toBeCloseTo(2, 1)
      expect(previewPos?.z).toBeCloseTo(4, 1)
    })
  })
})
