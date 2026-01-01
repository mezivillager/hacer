import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { useCircuitStore } from '@/store/circuitStore'

// Helper to get store state
const getState = () => useCircuitStore.getState()

describe('useKeyboardShortcuts', () => {
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
      isDragActive: false,
      hoveredGateId: null,
    })
  })

  describe('Delete key handling', () => {
    it('deletes selected gate when Delete key is pressed', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().selectGate(gate.id)

      renderHook(() => useKeyboardShortcuts())

      const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      act(() => {
        window.dispatchEvent(event)
      })

      expect(getState().gates).toHaveLength(0)
      expect(getState().selectedGateId).toBeNull()
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('deletes selected gate when Backspace key is pressed', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().selectGate(gate.id)

      renderHook(() => useKeyboardShortcuts())

      const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      act(() => {
        window.dispatchEvent(event)
      })

      expect(getState().gates).toHaveLength(0)
      expect(getState().selectedGateId).toBeNull()
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('does nothing when Delete key is pressed and no gate is selected', () => {
      getState().addGate('NAND', { x: 0, y: 0, z: 0 })

      renderHook(() => useKeyboardShortcuts())

      const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      act(() => {
        window.dispatchEvent(event)
      })

      expect(getState().gates).toHaveLength(1)
      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('does nothing when Delete key is pressed during placement mode', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().selectGate(gate.id)
      getState().startPlacement('AND')

      renderHook(() => useKeyboardShortcuts())

      const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      act(() => {
        window.dispatchEvent(event)
      })

      expect(getState().gates).toHaveLength(1)
      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('does nothing when Delete key is pressed during wiring mode', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().addGate('NAND', { x: 2, y: 0, z: 2 })
      getState().selectGate(gate1.id)

      // Start wiring from gate1 output
      const fromPos = getState().getPinWorldPosition(gate1.id, gate1.outputs[0].id)
      if (fromPos) {
        getState().startWiring(gate1.id, gate1.outputs[0].id, 'output', fromPos)
      }

      renderHook(() => useKeyboardShortcuts())

      const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      act(() => {
        window.dispatchEvent(event)
      })

      expect(getState().gates).toHaveLength(2)
      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('does nothing when Delete key is pressed during dragging', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().selectGate(gate.id)
      // Set preview position to simulate dragging
      getState().updatePlacementPreviewPosition({ x: 2, y: 0, z: 2 })

      renderHook(() => useKeyboardShortcuts())

      const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      act(() => {
        window.dispatchEvent(event)
      })

      expect(getState().gates).toHaveLength(1)
      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('removes associated wires when gate is deleted via Delete key', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 2 })
      getState().selectGate(gate1.id)

      // Create wire between gates
      getState().addWire(
        gate1.id,
        gate1.outputs[0].id,
        gate2.id,
        gate2.inputs[0].id,
        []
      )

      expect(getState().wires).toHaveLength(1)

      renderHook(() => useKeyboardShortcuts())

      const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })
      act(() => {
        window.dispatchEvent(event)
      })

      expect(getState().gates).toHaveLength(1)
      expect(getState().wires).toHaveLength(0)
    })

    it('deletes selected wire when Delete key is pressed', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 2 })
      const wire = getState().addWire(
        gate1.id,
        gate1.outputs[0].id,
        gate2.id,
        gate2.inputs[0].id,
        []
      )
      getState().selectWire(wire.id)

      renderHook(() => useKeyboardShortcuts())

      const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      act(() => {
        window.dispatchEvent(event)
      })

      expect(getState().wires).toHaveLength(0)
      expect(getState().selectedWireId).toBeNull()
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('deletes selected wire when Backspace key is pressed', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 2 })
      const wire = getState().addWire(
        gate1.id,
        gate1.outputs[0].id,
        gate2.id,
        gate2.inputs[0].id,
        []
      )
      getState().selectWire(wire.id)

      renderHook(() => useKeyboardShortcuts())

      const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      act(() => {
        window.dispatchEvent(event)
      })

      expect(getState().wires).toHaveLength(0)
      expect(getState().selectedWireId).toBeNull()
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('prioritizes wire deletion over gate deletion when both are selected', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 2 })
      const wire = getState().addWire(
        gate1.id,
        gate1.outputs[0].id,
        gate2.id,
        gate2.inputs[0].id,
        []
      )
      getState().selectGate(gate1.id)
      getState().selectWire(wire.id) // This should deselect gate, but test both selected scenario

      // Manually set both (for testing edge case)
      useCircuitStore.setState({ selectedGateId: gate1.id, selectedWireId: wire.id })

      renderHook(() => useKeyboardShortcuts())

      const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })
      act(() => {
        window.dispatchEvent(event)
      })

      // Wire should be deleted (wire takes precedence)
      expect(getState().wires).toHaveLength(0)
      expect(getState().selectedWireId).toBeNull()
      // Gate should remain
      expect(getState().gates).toHaveLength(2)
    })
  })

  describe('Escape key handling', () => {
    it('deselects wire when Escape key is pressed with wire selected', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 2 })
      const wire = getState().addWire(
        gate1.id,
        gate1.outputs[0].id,
        gate2.id,
        gate2.inputs[0].id,
        []
      )
      getState().selectWire(wire.id)

      renderHook(() => useKeyboardShortcuts())

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      act(() => {
        window.dispatchEvent(event)
      })

      expect(getState().selectedWireId).toBeNull()
    })
  })

  describe('Delete key with other shortcuts', () => {
    it('does not interfere with Escape key for deselecting', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().selectGate(gate.id)

      renderHook(() => useKeyboardShortcuts())

      // Press Escape
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      act(() => {
        window.dispatchEvent(escapeEvent)
      })

      expect(getState().selectedGateId).toBeNull()
      expect(getState().gates).toHaveLength(1)

      // Press Delete (should do nothing since no gate selected)
      const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })
      act(() => {
        window.dispatchEvent(deleteEvent)
      })

      expect(getState().gates).toHaveLength(1)
    })

    it('does not interfere with arrow keys for rotation', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().selectGate(gate.id)

      const { rerender } = renderHook(() => useKeyboardShortcuts())

      // Press Delete
      const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true })
      act(() => {
        window.dispatchEvent(deleteEvent)
      })

      // Gate should be deleted
      expect(getState().gates).toHaveLength(0)
      expect(getState().selectedGateId).toBeNull()

      // Add new gate and select it
      const gate2 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().selectGate(gate2.id)

      // Re-render hook to pick up new selection
      rerender()

      const originalRotationZ = getState().gates.find(g => g.id === gate2.id)?.rotation.z ?? 0
      expect(originalRotationZ).toBe(0)

      // Press ArrowLeft to rotate
      const leftArrowEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
      act(() => {
        window.dispatchEvent(leftArrowEvent)
      })

      const updatedGate = getState().gates.find(g => g.id === gate2.id)
      // ArrowLeft rotates by -Math.PI/2, so z should change from 0
      expect(updatedGate?.rotation.z).not.toBe(0)
      expect(updatedGate?.rotation.z).not.toBe(originalRotationZ)
    })
  })

  describe('Arrow key handling', () => {
    it('does not rotate gate when ArrowLeft is pressed and no gate is selected', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      // Don't select the gate

      renderHook(() => useKeyboardShortcuts())

      const originalRotationZ = gate.rotation.z

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      act(() => {
        window.dispatchEvent(event)
      })

      // Should not prevent default (let SceneKeyboardPan handle it)
      expect(preventDefaultSpy).not.toHaveBeenCalled()

      // Gate rotation should not change
      const updatedGate = getState().gates.find(g => g.id === gate.id)
      expect(updatedGate?.rotation.z).toBe(originalRotationZ)
    })

    it('does not rotate gate when ArrowRight is pressed and no gate is selected', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      // Don't select the gate

      renderHook(() => useKeyboardShortcuts())

      const originalRotationZ = gate.rotation.z

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      act(() => {
        window.dispatchEvent(event)
      })

      // Should not prevent default (let SceneKeyboardPan handle it)
      expect(preventDefaultSpy).not.toHaveBeenCalled()

      // Gate rotation should not change
      const updatedGate = getState().gates.find(g => g.id === gate.id)
      expect(updatedGate?.rotation.z).toBe(originalRotationZ)
    })

    it('rotates gate when ArrowLeft is pressed and gate is selected', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().selectGate(gate.id)

      renderHook(() => useKeyboardShortcuts())

      const originalRotationZ = gate.rotation.z

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      act(() => {
        window.dispatchEvent(event)
      })

      expect(preventDefaultSpy).toHaveBeenCalled()

      // Gate rotation should change
      const updatedGate = getState().gates.find(g => g.id === gate.id)
      expect(updatedGate?.rotation.z).not.toBe(originalRotationZ)
    })

    it('rotates gate when ArrowRight is pressed and gate is selected', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().selectGate(gate.id)

      renderHook(() => useKeyboardShortcuts())

      const originalRotationZ = gate.rotation.z

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      act(() => {
        window.dispatchEvent(event)
      })

      expect(preventDefaultSpy).toHaveBeenCalled()

      // Gate rotation should change
      const updatedGate = getState().gates.find(g => g.id === gate.id)
      expect(updatedGate?.rotation.z).not.toBe(originalRotationZ)
    })

    it('does not rotate gate when arrow key is pressed during dragging', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().selectGate(gate.id)
      // Set preview position to simulate dragging
      getState().updatePlacementPreviewPosition({ x: 2, y: 0, z: 2 })

      renderHook(() => useKeyboardShortcuts())

      const originalRotationZ = gate.rotation.z

      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      act(() => {
        window.dispatchEvent(event)
      })

      // Should not prevent default or rotate during drag
      expect(preventDefaultSpy).not.toHaveBeenCalled()

      // Gate rotation should not change
      const updatedGate = getState().gates.find(g => g.id === gate.id)
      expect(updatedGate?.rotation.z).toBe(originalRotationZ)
    })
  })
})

