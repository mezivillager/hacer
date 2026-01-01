import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleDeleteSelected, handleGateSelect } from './uiHandlers'

describe('uiHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleDeleteSelected', () => {
    it('calls removeWire when wire is selected', () => {
      const removeGate = vi.fn()
      const removeWire = vi.fn()
      handleDeleteSelected(null, 'wire-1', removeGate, removeWire)

      expect(removeWire).toHaveBeenCalledWith('wire-1')
      expect(removeGate).not.toHaveBeenCalled()
    })

    it('calls removeGate when gate is selected and no wire is selected', () => {
      const removeGate = vi.fn()
      const removeWire = vi.fn()
      handleDeleteSelected('gate-1', null, removeGate, removeWire)

      expect(removeGate).toHaveBeenCalledWith('gate-1')
      expect(removeWire).not.toHaveBeenCalled()
    })

    it('prioritizes wire deletion over gate deletion when both are selected', () => {
      const removeGate = vi.fn()
      const removeWire = vi.fn()
      handleDeleteSelected('gate-1', 'wire-1', removeGate, removeWire)

      expect(removeWire).toHaveBeenCalledWith('wire-1')
      expect(removeGate).not.toHaveBeenCalled()
    })

    it('does nothing when nothing is selected', () => {
      const removeGate = vi.fn()
      const removeWire = vi.fn()
      handleDeleteSelected(null, null, removeGate, removeWire)

      expect(removeGate).not.toHaveBeenCalled()
      expect(removeWire).not.toHaveBeenCalled()
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
