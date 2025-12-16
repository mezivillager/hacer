import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleDeleteSelected, handleGateSelect } from './uiHandlers'

describe('uiHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleDeleteSelected', () => {
    it('calls removeGate when gate is selected', () => {
      const removeGate = vi.fn()
      handleDeleteSelected('gate-1', removeGate)

      expect(removeGate).toHaveBeenCalledWith('gate-1')
    })

    it('does nothing when no gate is selected', () => {
      const removeGate = vi.fn()
      handleDeleteSelected(null, removeGate)

      expect(removeGate).not.toHaveBeenCalled()
    })
  })

  describe('handleGateSelect', () => {
    it('cancels placement when same gate type is already being placed', () => {
      const startPlacement = vi.fn()
      const cancelPlacement = vi.fn()

      handleGateSelect('NAND', 'NAND', startPlacement, cancelPlacement)

      expect(cancelPlacement).toHaveBeenCalled()
      expect(startPlacement).not.toHaveBeenCalled()
    })

    it('starts placement when different gate type is selected', () => {
      const startPlacement = vi.fn()
      const cancelPlacement = vi.fn()

      handleGateSelect('AND', 'NAND', startPlacement, cancelPlacement)

      expect(startPlacement).toHaveBeenCalledWith('AND')
      expect(cancelPlacement).not.toHaveBeenCalled()
    })

    it('starts placement when no gate type is currently being placed', () => {
      const startPlacement = vi.fn()
      const cancelPlacement = vi.fn()

      handleGateSelect('OR', null, startPlacement, cancelPlacement)

      expect(startPlacement).toHaveBeenCalledWith('OR')
      expect(cancelPlacement).not.toHaveBeenCalled()
    })
  })
})
