import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handlePointerMove, handlePointerLeave, handleClick, handlePointerUp } from './groundPlaneHandlers'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { snapToGrid, worldToGrid, canPlaceGateAt } from '@/utils/grid'
import type { WiringState, GateInstance } from '@/store/types'
import { createMockStore, createMockThreeEvent } from '@/test/testUtils'

// Mock dependencies
vi.mock('@/store/circuitStore', () => ({
  useCircuitStore: {
    getState: vi.fn(),
  },
  circuitActions: {
    updateWirePreviewPosition: vi.fn(),
    updatePlacementPreviewPosition: vi.fn(),
    updateGatePosition: vi.fn(),
    setDragActive: vi.fn(),
    placeGate: vi.fn(),
    cancelWiring: vi.fn(),
    selectGate: vi.fn(),
  },
}))

vi.mock('@/utils/grid', () => ({
  snapToGrid: vi.fn((pos: { x: number; y: number; z: number }) => ({ x: Math.round(pos.x), y: pos.y, z: Math.round(pos.z) })),
  worldToGrid: vi.fn((pos: { x: number; y: number; z: number }) => ({ x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z) })),
  canPlaceGateAt: vi.fn(() => true),
}))

describe('groundPlaneHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handlePointerMove', () => {
    it('updates placement preview position when placing', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          placementMode: 'NAND',
          wiringFrom: null,
          isDragActive: false,
          placementPreviewPosition: null,
          selectedGateId: null,
        })
      )

      const mockEvent = createMockThreeEvent<PointerEvent>({ x: 1.5, y: 0.2, z: 2.5 })

      handlePointerMove(mockEvent)

      expect(snapToGrid).toHaveBeenCalledWith({ x: 1.5, y: 0.2, z: 2.5 })
      expect(circuitActions.updatePlacementPreviewPosition).toHaveBeenCalled()
    })

    it('updates placement preview position when dragging', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          placementMode: null,
          wiringFrom: null,
          isDragActive: true,
          placementPreviewPosition: { x: 1, y: 0.2, z: 2 },
          selectedGateId: 'gate-1',
        })
      )

      const mockEvent = createMockThreeEvent<PointerEvent>({ x: 2.5, y: 0.2, z: 3.5 })

      handlePointerMove(mockEvent)

      expect(snapToGrid).toHaveBeenCalledWith({ x: 2.5, y: 0.2, z: 3.5 })
      expect(circuitActions.updatePlacementPreviewPosition).toHaveBeenCalled()
    })

    it('updates wire preview position when wiring', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          placementMode: null,
          wiringFrom: {
            fromGateId: 'gate-1',
            fromPinId: 'pin-1',
            fromPinType: 'output',
            fromPosition: { x: 0, y: 0, z: 0 },
            previewEndPosition: null,
          } as WiringState,
          isDragActive: false,
          placementPreviewPosition: null,
          selectedGateId: null,
        })
      )

      const mockEvent = createMockThreeEvent<PointerEvent>({ x: 1, y: 2, z: 3 })

      handlePointerMove(mockEvent)

      expect(circuitActions.updateWirePreviewPosition).toHaveBeenCalledWith({ x: 1, y: 2, z: 3 })
    })

    it('does nothing when not placing, wiring, or dragging', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          placementMode: null,
          wiringFrom: null,
          isDragActive: false,
          placementPreviewPosition: null,
          selectedGateId: null,
        })
      )

      const mockEvent = createMockThreeEvent<PointerEvent>({ x: 1, y: 2, z: 3 })

      handlePointerMove(mockEvent)

      expect(circuitActions.updatePlacementPreviewPosition).not.toHaveBeenCalled()
      expect(circuitActions.updateWirePreviewPosition).not.toHaveBeenCalled()
    })
  })

  describe('handlePointerLeave', () => {
    it('clears placement preview position when placing', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          placementMode: 'NAND',
          wiringFrom: null,
        })
      )

      handlePointerLeave()

      expect(circuitActions.updatePlacementPreviewPosition).toHaveBeenCalledWith(null)
    })

    it('clears wire preview position when wiring', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          placementMode: null,
          wiringFrom: {
            fromGateId: 'gate-1',
            fromPinId: 'pin-1',
            fromPinType: 'output',
            fromPosition: { x: 0, y: 0, z: 0 },
            previewEndPosition: null,
          } as WiringState,
        })
      )

      handlePointerLeave()

      expect(circuitActions.updateWirePreviewPosition).toHaveBeenCalledWith(null)
    })

    it('clears both when placing and wiring (edge case)', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          placementMode: 'NAND',
          wiringFrom: {
            fromGateId: 'gate-1',
            fromPinId: 'pin-1',
            fromPinType: 'output',
            fromPosition: { x: 0, y: 0, z: 0 },
            previewEndPosition: null,
          } as WiringState,
        })
      )

      handlePointerLeave()

      expect(circuitActions.updatePlacementPreviewPosition).toHaveBeenCalledWith(null)
      expect(circuitActions.updateWirePreviewPosition).toHaveBeenCalledWith(null)
    })
  })

  describe('handleClick', () => {
    it('places gate when in placement mode', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          placementMode: 'NAND',
          wiringFrom: null,
          placementPreviewPosition: null,
          selectedGateId: null,
        })
      )

      const mockEvent = createMockThreeEvent<MouseEvent>(
        { x: 1.5, y: 0.2, z: 2.5 },
        { stopPropagation: vi.fn() }
      )

      handleClick(mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(snapToGrid).toHaveBeenCalledWith({ x: 1.5, y: 0.2, z: 2.5 })
      expect(circuitActions.placeGate).toHaveBeenCalled()
    })

    it('cancels wiring when in wiring mode', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          placementMode: null,
          wiringFrom: {
            fromGateId: 'gate-1',
            fromPinId: 'pin-1',
            fromPinType: 'output',
            fromPosition: { x: 0, y: 0, z: 0 },
            previewEndPosition: null,
          } as WiringState,
          placementPreviewPosition: null,
          selectedGateId: null,
        })
      )

      const mockEvent = createMockThreeEvent<MouseEvent>(
        { x: 1, y: 2, z: 3 },
        { stopPropagation: vi.fn() }
      )

      handleClick(mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(circuitActions.cancelWiring).toHaveBeenCalled()
    })

    it('deselects gate when not placing, wiring, or dragging', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          placementMode: null,
          wiringFrom: null,
          placementPreviewPosition: null,
          selectedGateId: 'gate-1',
        })
      )

      const mockEvent = createMockThreeEvent<MouseEvent>(
        { x: 1, y: 2, z: 3 },
        { stopPropagation: vi.fn() }
      )

      handleClick(mockEvent)

      expect(circuitActions.selectGate).toHaveBeenCalledWith(null)
    })

    it('stops propagation but does nothing when dragging', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          placementMode: null,
          wiringFrom: null,
          placementPreviewPosition: { x: 1, y: 0.2, z: 2 },
          selectedGateId: 'gate-1',
        })
      )

      const mockEvent = createMockThreeEvent<MouseEvent>(
        { x: 1, y: 2, z: 3 },
        { stopPropagation: vi.fn() }
      )

      handleClick(mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(circuitActions.placeGate).not.toHaveBeenCalled()
      expect(circuitActions.cancelWiring).not.toHaveBeenCalled()
      expect(circuitActions.selectGate).not.toHaveBeenCalled()
    })
  })

  describe('handlePointerUp', () => {
    it('completes drag and updates gate position when valid', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          isDragActive: true,
          placementPreviewPosition: { x: 2, y: 0.2, z: 3 },
          placementMode: null,
          selectedGateId: 'gate-1',
          gates: [
            { id: 'gate-1', type: 'NAND', position: { x: 1, y: 0.2, z: 2 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: false },
            { id: 'gate-2', type: 'AND', position: { x: 5, y: 0.2, z: 6 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: false },
          ] as GateInstance[],
        })
      )

      vi.mocked(canPlaceGateAt).mockReturnValue(true)

      handlePointerUp()

      expect(circuitActions.setDragActive).toHaveBeenCalledWith(false)
      expect(worldToGrid).toHaveBeenCalledWith({ x: 2, y: 0.2, z: 3 })
      expect(canPlaceGateAt).toHaveBeenCalled()
      expect(circuitActions.updateGatePosition).toHaveBeenCalledWith('gate-1', { x: 2, y: 0.2, z: 3 })
      expect(circuitActions.updatePlacementPreviewPosition).toHaveBeenCalledWith(null)
    })

    it('completes drag but does not update gate position when invalid', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          isDragActive: true,
          placementPreviewPosition: { x: 2, y: 0.2, z: 3 },
          placementMode: null,
          selectedGateId: 'gate-1',
          gates: [
            { id: 'gate-1', type: 'NAND', position: { x: 1, y: 0.2, z: 2 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: false },
            { id: 'gate-2', type: 'AND', position: { x: 2, y: 0.2, z: 3 }, rotation: { x: 0, y: 0, z: 0 }, inputs: [], outputs: [], selected: false },
          ] as GateInstance[],
        })
      )

      vi.mocked(canPlaceGateAt).mockReturnValue(false)

      handlePointerUp()

      expect(circuitActions.setDragActive).toHaveBeenCalledWith(false)
      expect(circuitActions.updateGatePosition).not.toHaveBeenCalled()
      expect(circuitActions.updatePlacementPreviewPosition).toHaveBeenCalledWith(null)
    })

    it('does nothing when preview position is null (not actually dragging)', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          isDragActive: true,
          placementPreviewPosition: null, // null means not actually dragging
          placementMode: null,
          selectedGateId: 'gate-1',
          gates: [],
        })
      )

      handlePointerUp()

      // When placementPreviewPosition is null, isDragging check fails, so nothing happens
      expect(circuitActions.setDragActive).not.toHaveBeenCalled()
      expect(circuitActions.updatePlacementPreviewPosition).not.toHaveBeenCalled()
    })

    it('does nothing when not dragging', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          isDragActive: false,
          placementPreviewPosition: null,
          placementMode: null,
          selectedGateId: null,
          gates: [],
        })
      )

      handlePointerUp()

      expect(circuitActions.setDragActive).not.toHaveBeenCalled()
      expect(circuitActions.updateGatePosition).not.toHaveBeenCalled()
    })
  })
})
