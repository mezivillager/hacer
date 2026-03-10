/**
 * UI Handlers Tests
 *
 * Tests for UI interaction handlers including delete functionality.
 */

import { describe, it, expect, vi } from 'vitest'
import { handleDeleteSelected, handleGateSelect } from './uiHandlers'

describe('UI Handlers', () => {
  describe('handleDeleteSelected', () => {
    it('deletes selected wire first (highest priority)', () => {
      const mockRemoveWire = vi.fn()
      const mockRemoveGate = vi.fn()
      const mockRemoveInputNode = vi.fn()
      const mockRemoveOutputNode = vi.fn()

      handleDeleteSelected(
        'gate-1',      // selectedGateId
        'wire-1',      // selectedWireId
        'node-1',      // selectedNodeId
        'input',       // selectedNodeType
        mockRemoveGate,
        mockRemoveWire,
        mockRemoveInputNode,
        mockRemoveOutputNode
      )

      expect(mockRemoveWire).toHaveBeenCalledWith('wire-1')
      expect(mockRemoveGate).not.toHaveBeenCalled()
      expect(mockRemoveInputNode).not.toHaveBeenCalled()
    })

    it('deletes selected gate when no wire is selected', () => {
      const mockRemoveWire = vi.fn()
      const mockRemoveGate = vi.fn()
      const mockRemoveInputNode = vi.fn()
      const mockRemoveOutputNode = vi.fn()

      handleDeleteSelected(
        'gate-1',
        null,          // no wire selected
        'node-1',
        'input',
        mockRemoveGate,
        mockRemoveWire,
        mockRemoveInputNode,
        mockRemoveOutputNode
      )

      expect(mockRemoveGate).toHaveBeenCalledWith('gate-1')
      expect(mockRemoveWire).not.toHaveBeenCalled()
      expect(mockRemoveInputNode).not.toHaveBeenCalled()
    })

    it('deletes selected input node when no wire or gate is selected', () => {
      const mockRemoveWire = vi.fn()
      const mockRemoveGate = vi.fn()
      const mockRemoveInputNode = vi.fn()
      const mockRemoveOutputNode = vi.fn()

      handleDeleteSelected(
        null,
        null,
        'input-1',
        'input',
        mockRemoveGate,
        mockRemoveWire,
        mockRemoveInputNode,
        mockRemoveOutputNode
      )

      expect(mockRemoveInputNode).toHaveBeenCalledWith('input-1')
      expect(mockRemoveGate).not.toHaveBeenCalled()
      expect(mockRemoveWire).not.toHaveBeenCalled()
    })

    it('deletes selected output node', () => {
      const mockRemoveWire = vi.fn()
      const mockRemoveGate = vi.fn()
      const mockRemoveInputNode = vi.fn()
      const mockRemoveOutputNode = vi.fn()

      handleDeleteSelected(
        null,
        null,
        'output-1',
        'output',
        mockRemoveGate,
        mockRemoveWire,
        mockRemoveInputNode,
        mockRemoveOutputNode
      )

      expect(mockRemoveOutputNode).toHaveBeenCalledWith('output-1')
    })

    it('does nothing when nothing is selected', () => {
      const mockRemoveWire = vi.fn()
      const mockRemoveGate = vi.fn()
      const mockRemoveInputNode = vi.fn()
      const mockRemoveOutputNode = vi.fn()

      handleDeleteSelected(
        null,
        null,
        null,
        null,
        mockRemoveGate,
        mockRemoveWire,
        mockRemoveInputNode,
        mockRemoveOutputNode
      )

      expect(mockRemoveWire).not.toHaveBeenCalled()
      expect(mockRemoveGate).not.toHaveBeenCalled()
      expect(mockRemoveInputNode).not.toHaveBeenCalled()
      expect(mockRemoveOutputNode).not.toHaveBeenCalled()
    })
  })

  describe('handleGateSelect', () => {
    it('starts placement when clicking a different gate type', () => {
      const mockStartPlacement = vi.fn()
      const mockCancelPlacement = vi.fn()

      handleGateSelect('NAND', null, mockStartPlacement, mockCancelPlacement)

      expect(mockStartPlacement).toHaveBeenCalledWith('NAND')
      expect(mockCancelPlacement).not.toHaveBeenCalled()
    })

    it('cancels placement when clicking the same gate type', () => {
      const mockStartPlacement = vi.fn()
      const mockCancelPlacement = vi.fn()

      handleGateSelect('NAND', 'NAND', mockStartPlacement, mockCancelPlacement)

      expect(mockCancelPlacement).toHaveBeenCalled()
      expect(mockStartPlacement).not.toHaveBeenCalled()
    })

    it('starts placement with different type when already placing', () => {
      const mockStartPlacement = vi.fn()
      const mockCancelPlacement = vi.fn()

      handleGateSelect('AND', 'NAND', mockStartPlacement, mockCancelPlacement)

      expect(mockStartPlacement).toHaveBeenCalledWith('AND')
      expect(mockCancelPlacement).not.toHaveBeenCalled()
    })
  })
})
