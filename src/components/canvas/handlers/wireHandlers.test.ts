import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the store before imports
const mockSelectWire = vi.fn()
vi.mock('@/store/circuitStore', () => ({
  useCircuitStore: {
    getState: vi.fn(),
  },
  circuitActions: {
    selectWire: (...args: unknown[]): void => {
      mockSelectWire(...args)
    },
  },
}))

// Mock wire hit test
const mockFindNearestWire = vi.fn()
vi.mock('@/utils/wireHitTest', () => ({
  findNearestWire: (...args: unknown[]): string | null => {
    const result = mockFindNearestWire(...args) as string | null | undefined
    return result ?? null
  },
}))

import { handleWireClick } from './wireHandlers'
import { useCircuitStore } from '@/store/circuitStore'
import type { ThreeEvent } from '@react-three/fiber'

describe('wireHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectWire.mockClear()
    mockFindNearestWire.mockClear()
    ;(useCircuitStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      placementMode: null,
      wiringFrom: null,
      placementPreviewPosition: null,
      selectedGateId: null,
      wires: [],
    })
  })

  describe('handleWireClick', () => {
    it('returns null when in placement mode', () => {
      ;(useCircuitStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        placementMode: 'NAND',
        wiringFrom: null,
        placementPreviewPosition: null,
        selectedGateId: null,
        wires: [],
      })

      const mockEvent = {
        point: { x: 0, y: 0, z: 0 },
      } as unknown as ThreeEvent<MouseEvent>

      const result = handleWireClick(mockEvent)
      expect(result).toBe(null)
      expect(mockFindNearestWire).not.toHaveBeenCalled()
      expect(mockSelectWire).not.toHaveBeenCalled()
    })

    it('returns null when in wiring mode', () => {
      ;(useCircuitStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        placementMode: null,
        wiringFrom: { fromGateId: 'gate-1', fromPinId: 'pin-1' },
        placementPreviewPosition: null,
        selectedGateId: null,
        wires: [],
      })

      const mockEvent = {
        point: { x: 0, y: 0, z: 0 },
      } as unknown as ThreeEvent<MouseEvent>

      const result = handleWireClick(mockEvent)
      expect(result).toBe(null)
      expect(mockFindNearestWire).not.toHaveBeenCalled()
      expect(mockSelectWire).not.toHaveBeenCalled()
    })

    it('returns null when dragging', () => {
      ;(useCircuitStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        placementMode: null,
        wiringFrom: null,
        placementPreviewPosition: { x: 1, y: 1, z: 1 },
        selectedGateId: 'gate-1',
        wires: [],
      })

      const mockEvent = {
        point: { x: 0, y: 0, z: 0 },
      } as unknown as ThreeEvent<MouseEvent>

      const result = handleWireClick(mockEvent)
      expect(result).toBe(null)
      expect(mockFindNearestWire).not.toHaveBeenCalled()
      expect(mockSelectWire).not.toHaveBeenCalled()
    })

    it('selects wire when found near click point', () => {
      mockFindNearestWire.mockReturnValue('wire-1')
      ;(useCircuitStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        placementMode: null,
        wiringFrom: null,
        placementPreviewPosition: null,
        selectedGateId: null,
        wires: [{ id: 'wire-1' }],
      })

      const mockEvent = {
        point: { x: 2, y: 0.2, z: 2 },
      } as unknown as ThreeEvent<MouseEvent>

      const result = handleWireClick(mockEvent)
      expect(result).toBe('wire-1')
      expect(mockFindNearestWire).toHaveBeenCalledWith(
        { x: 2, y: 0.2, z: 2 },
        [{ id: 'wire-1' }],
        0.5
      )
      expect(mockSelectWire).toHaveBeenCalledWith('wire-1')
    })

    it('returns null when no wire found near click point', () => {
      mockFindNearestWire.mockReturnValue(null)
      ;(useCircuitStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        placementMode: null,
        wiringFrom: null,
        placementPreviewPosition: null,
        selectedGateId: null,
        wires: [],
      })

      const mockEvent = {
        point: { x: 10, y: 0.2, z: 10 },
      } as unknown as ThreeEvent<MouseEvent>

      const result = handleWireClick(mockEvent)
      expect(result).toBe(null)
      expect(mockFindNearestWire).toHaveBeenCalled()
      expect(mockSelectWire).not.toHaveBeenCalled()
    })
  })
})
