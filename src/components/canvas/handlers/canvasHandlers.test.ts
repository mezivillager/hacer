/**
 * Canvas Handlers Tests
 *
 * Tests for canvas event handlers including junction click handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the store before imports
const mockStartWiringFromJunction = vi.fn()
vi.mock('@/store/circuitStore', () => ({
  useCircuitStore: {
    getState: vi.fn(),
  },
  circuitActions: {
    startWiringFromJunction: (...args: unknown[]): void => {
      mockStartWiringFromJunction(...args)
    },
  },
}))

import { handleJunctionClick } from './canvasHandlers'
import { useCircuitStore } from '@/store/circuitStore'

describe('canvasHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStartWiringFromJunction.mockClear()
    ;(useCircuitStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
      wiringFrom: null,
      junctionPlacementMode: null,
    })
  })

  describe('handleJunctionClick', () => {
    it('starts wiring from junction when not in placement mode and not already wiring', () => {
      ;(useCircuitStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        wiringFrom: null,
        junctionPlacementMode: null,
      })

      handleJunctionClick('junction-1', { x: 4, y: 0.2, z: 0 })

      expect(mockStartWiringFromJunction).toHaveBeenCalledWith('junction-1', { x: 4, y: 0.2, z: 0 })
    })

    it('does nothing when in junction placement mode', () => {
      ;(useCircuitStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        wiringFrom: null,
        junctionPlacementMode: true,
      })

      handleJunctionClick('junction-1', { x: 4, y: 0.2, z: 0 })

      expect(mockStartWiringFromJunction).not.toHaveBeenCalled()
    })

    it('does nothing when already wiring', () => {
      ;(useCircuitStore.getState as ReturnType<typeof vi.fn>).mockReturnValue({
        wiringFrom: { fromGateId: 'gate-1', fromPinId: 'pin-1' },
        junctionPlacementMode: null,
      })

      handleJunctionClick('junction-1', { x: 4, y: 0.2, z: 0 })

      expect(mockStartWiringFromJunction).not.toHaveBeenCalled()
    })
  })
})
