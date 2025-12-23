import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isPinConnected, handlePinClick, handleInputToggle, handleGateClick } from './canvasHandlers'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import type { Wire, WiringState } from '@/store/types'
import { createMockStore } from '@/test/testUtils'

// Mock dependencies
vi.mock('@/store/circuitStore', () => ({
  useCircuitStore: {
    getState: vi.fn(),
  },
  circuitActions: {
    completeWiring: vi.fn(),
    startWiring: vi.fn(),
    setInputValue: vi.fn(),
    selectGate: vi.fn(),
  },
}))

describe('canvasHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isPinConnected', () => {
    it('returns true when pin is connected as source', () => {
      const wire: Wire = { id: 'wire-1', fromGateId: 'gate-1', fromPinId: 'pin-1', toGateId: 'gate-2', toPinId: 'pin-2', segments: [] }
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({ wires: [wire] })
      )

      expect(isPinConnected('gate-1', 'pin-1')).toBe(true)
    })

    it('returns true when pin is connected as target', () => {
      const wire: Wire = { id: 'wire-1', fromGateId: 'gate-1', fromPinId: 'pin-1', toGateId: 'gate-2', toPinId: 'pin-2', segments: [] }
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({ wires: [wire] })
      )

      expect(isPinConnected('gate-2', 'pin-2')).toBe(true)
    })

    it('returns false when pin is not connected', () => {
      const wire: Wire = { id: 'wire-1', fromGateId: 'gate-1', fromPinId: 'pin-1', toGateId: 'gate-2', toPinId: 'pin-2', segments: [] }
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({ wires: [wire] })
      )

      expect(isPinConnected('gate-1', 'pin-2')).toBe(false)
    })

    it('returns false when no wires exist', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({ wires: [] })
      )

      expect(isPinConnected('gate-1', 'pin-1')).toBe(false)
    })
  })

  describe('handlePinClick', () => {
    it('completes wiring when wiring is active', () => {
      const wiringFrom: WiringState = {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0, z: 0 },
        previewEndPosition: null,
        destinationGateId: null,
        destinationPinId: null,
        segments: null,
      }
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({ wiringFrom })
      )

      handlePinClick('gate-2', 'pin-2', 'input', { x: 1, y: 2, z: 3 })

      expect(circuitActions.completeWiring).toHaveBeenCalledWith('gate-2', 'pin-2', 'input')
      expect(circuitActions.startWiring).not.toHaveBeenCalled()
    })

    it('starts wiring when wiring is not active', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({ wiringFrom: null })
      )

      handlePinClick('gate-1', 'pin-1', 'output', { x: 1, y: 2, z: 3 })

      expect(circuitActions.startWiring).toHaveBeenCalledWith('gate-1', 'pin-1', 'output', { x: 1, y: 2, z: 3 })
      expect(circuitActions.completeWiring).not.toHaveBeenCalled()
    })
  })

  describe('handleInputToggle', () => {
    it('toggles input value when gate and pin exist', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          gates: [
            {
              id: 'gate-1',
              type: 'NAND',
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              inputs: [{ id: 'pin-1', name: 'A', type: 'input', value: false }],
              outputs: [],
              selected: false,
            },
          ],
        })
      )

      handleInputToggle('gate-1', 'pin-1')

      expect(circuitActions.setInputValue).toHaveBeenCalledWith('gate-1', 'pin-1', true)
    })

    it('does nothing when gate does not exist', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({ gates: [] })
      )

      handleInputToggle('gate-1', 'pin-1')

      expect(circuitActions.setInputValue).not.toHaveBeenCalled()
    })

    it('does nothing when pin does not exist', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({
          gates: [
            {
              id: 'gate-1',
              type: 'NAND',
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0 },
              inputs: [{ id: 'pin-2', name: 'B', type: 'input', value: false }],
              outputs: [],
              selected: false,
            },
          ],
        })
      )

      handleInputToggle('gate-1', 'pin-1')

      expect(circuitActions.setInputValue).not.toHaveBeenCalled()
    })
  })

  describe('handleGateClick', () => {
    it('selects gate when not wiring', () => {
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({ wiringFrom: null })
      )

      handleGateClick('gate-1')

      expect(circuitActions.selectGate).toHaveBeenCalledWith('gate-1')
    })

    it('does not select gate when wiring', () => {
      const wiringFrom: WiringState = {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0, z: 0 },
        previewEndPosition: null,
        destinationGateId: null,
        destinationPinId: null,
        segments: null,
      }
      vi.mocked(useCircuitStore.getState).mockReturnValue(
        createMockStore({ wiringFrom })
      )

      handleGateClick('gate-1')

      expect(circuitActions.selectGate).not.toHaveBeenCalled()
    })
  })
})
