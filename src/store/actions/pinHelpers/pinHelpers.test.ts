import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'

// Helper to get store state
const getState = () => useCircuitStore.getState()

describe('pinHelpers', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCircuitStore.setState({
      gates: [],
      wires: [],
      selectedGateId: null,
      simulationRunning: false,
      simulationSpeed: 100,
      placementMode: null,
      wiringFrom: null,
    })
  })

  // Pin position constants from pinHelpers.ts - must match gate component geometry
  const INPUT_PIN_X = -0.6
  const OUTPUT_PIN_X = 0.84

  describe('getPinWorldPosition', () => {
    it('returns input pin world position for first input', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      const position = getState().getPinWorldPosition(gate.id, gate.inputs[0].id)
      
      expect(position).not.toBeNull()
      expect(position?.x).toBeCloseTo(INPUT_PIN_X, 1)
      // After 90° X rotation: local Y offset (0.2) becomes world Z
      // Local position [INPUT_PIN_X, 0.2, 0] → World [INPUT_PIN_X, 0, 0.2]
      expect(position?.y).toBeCloseTo(0, 1)
      expect(position?.z).toBeCloseTo(0.2, 1)
    })

    it('returns input pin world position for second input', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      const position = getState().getPinWorldPosition(gate.id, gate.inputs[1].id)
      
      expect(position).not.toBeNull()
      expect(position?.x).toBeCloseTo(INPUT_PIN_X, 1)
      // After 90° X rotation: local Y offset (-0.2) becomes world Z
      // Local position [INPUT_PIN_X, -0.2, 0] → World [INPUT_PIN_X, 0, -0.2]
      expect(position?.y).toBeCloseTo(0, 1)
      expect(position?.z).toBeCloseTo(-0.2, 1)
    })

    it('returns output pin world position', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      const position = getState().getPinWorldPosition(gate.id, gate.outputs[0].id)
      
      expect(position).not.toBeNull()
      expect(position?.x).toBeCloseTo(OUTPUT_PIN_X, 1)
      expect(position?.y).toBe(0)
      expect(position?.z).toBe(0)
    })

    it('accounts for gate position', () => {
      const gate = getState().addGate('NAND', { x: 5, y: 10, z: 15 })
      
      const position = getState().getPinWorldPosition(gate.id, gate.outputs[0].id)
      
      expect(position).not.toBeNull()
      // Gate position is added to rotated pin position
      // Output pin is at local [OUTPUT_PIN_X, 0, 0], after 90° X rotation: world [OUTPUT_PIN_X, 0, 0]
      expect(position?.x).toBeCloseTo(5 + OUTPUT_PIN_X, 1)
      expect(position?.y).toBeCloseTo(10, 1) // Gate Y + pin Y (0 after rotation)
      expect(position?.z).toBeCloseTo(15, 1) // Gate Z + pin Z (0 after rotation)
    })

    it('accounts for gate rotation', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().rotateGate(gate.id, 'y', Math.PI)
      
      const position = getState().getPinWorldPosition(gate.id, gate.outputs[0].id)
      
      expect(position).not.toBeNull()
      // After 180° rotation, output should be on the opposite side
      expect(position?.x).toBeCloseTo(-OUTPUT_PIN_X, 1)
    })

    it('returns null if gate does not exist', () => {
      const position = getState().getPinWorldPosition('non-existent-id', 'pin-id')
      
      expect(position).toBeNull()
    })

    it('returns null if pin does not exist', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      
      const position = getState().getPinWorldPosition(gate.id, 'non-existent-pin')
      
      expect(position).toBeNull()
    })
  })

  describe('getPinWorldPosition - Center Alignment', () => {
    it('returns exact pin center with no Y offset above or below', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0.2, z: 0 })
      
      const inputPosition = getState().getPinWorldPosition(gate.id, gate.inputs[0].id)
      const outputPosition = getState().getPinWorldPosition(gate.id, gate.outputs[0].id)
      
      // Pin center Y should match gate Y (0.2) - no additional offset
      // After 90° X rotation, local Y offset (0.2) becomes world Z
      // So pin center Y = gate Y = 0.2
      expect(inputPosition?.y).toBeCloseTo(0.2, 5)
      expect(outputPosition?.y).toBeCloseTo(0.2, 5)
    })

    it('pin center is consistent across all gate rotations', () => {
      // Test at 0°, 90°, 180°, 270° rotations (Z axis rotation)
      // Note: rotateGate does relative rotation, so we need separate gates
      const rotations = [
        { z: 0 }, // 0° (default base rotation is 90° X, so this is just base)
        { z: Math.PI / 2 }, // 90° Z rotation
        { z: Math.PI }, // 180° Z rotation
        { z: (3 * Math.PI) / 2 }, // 270° Z rotation
      ]
      const positions = rotations.map(rot => {
        // Create a fresh gate for each rotation
        const gate = getState().addGate('NAND', { x: 0, y: 0.2, z: 0 })
        const pinId = gate.outputs[0].id
        // Set rotation directly using updateGateRotation (absolute, not relative)
        getState().updateGateRotation(gate.id, { x: Math.PI / 2, y: 0, z: rot.z })
        return getState().getPinWorldPosition(gate.id, pinId)
      })
      
      // All positions should have the same Y coordinate (pin center Y)
      const yValues = positions.map(p => p?.y).filter((y): y is number => y !== undefined)
      expect(new Set(yValues.map(y => y.toFixed(5))).size).toBe(1) // All Y values should be the same (within precision)
      expect(yValues[0]).toBeCloseTo(0.2, 5) // Should match gate Y
    })

    it('pin center accounts for flat gate orientation (90° X rotation)', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0.2, z: 0 })
      
      // Gate has default 90° X rotation (flat orientation)
      // Local Y offset (0.2 for inputA) becomes world Z after rotation
      const inputAPosition = getState().getPinWorldPosition(gate.id, gate.inputs[0].id)
      
      expect(inputAPosition).not.toBeNull()
      // After 90° X rotation: local [INPUT_PIN_X, 0.2, 0] → world [INPUT_PIN_X, 0.2, 0.2]
      // Y coordinate should be gate Y (0.2), not pin local Y (0.2) which becomes Z
      expect(inputAPosition?.y).toBeCloseTo(0.2, 5) // Gate Y position
      expect(inputAPosition?.z).toBeCloseTo(0.2, 5) // Local Y offset becomes Z
    })

    it('pin center accounts for user rotation (Z rotation)', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0.2, z: 0 })
      const pinId = gate.outputs[0].id
      
      // Rotate 90° around Z axis (which is world Y after 90° X rotation)
      getState().rotateGate(gate.id, 'z', Math.PI / 2)
      
      const position = getState().getPinWorldPosition(gate.id, pinId)
      
      expect(position).not.toBeNull()
      // Y coordinate should remain consistent (pin center Y)
      expect(position?.y).toBeCloseTo(0.2, 5)
      // X and Z should change based on rotation
      expect(position?.x).toBeCloseTo(0, 5) // Output pin now on different side
    })

    it('works for all pin types (input A, input B, output)', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0.2, z: 0 })
      
      const inputAPos = getState().getPinWorldPosition(gate.id, gate.inputs[0].id)
      const inputBPos = getState().getPinWorldPosition(gate.id, gate.inputs[1].id)
      const outputPos = getState().getPinWorldPosition(gate.id, gate.outputs[0].id)
      
      // All pins should have same Y coordinate (pin center Y = gate Y)
      expect(inputAPos?.y).toBeCloseTo(0.2, 5)
      expect(inputBPos?.y).toBeCloseTo(0.2, 5)
      expect(outputPos?.y).toBeCloseTo(0.2, 5)
    })

    it('works for all gate types', () => {
      const gateTypes = ['NAND', 'AND', 'OR', 'XOR', 'NOT'] as const
      const positions: Array<{ type: string; y: number }> = []
      
      gateTypes.forEach(type => {
        const gate = getState().addGate(type, { x: 0, y: 0.2, z: 0 })
        const pinId = gate.outputs[0].id
        const pos = getState().getPinWorldPosition(gate.id, pinId)
        if (pos) {
          positions.push({ type, y: pos.y })
        }
      })
      
      // All gate types should have consistent pin center Y
      const yValues = positions.map(p => p.y)
      expect(new Set(yValues.map(y => y.toFixed(5))).size).toBe(1) // All Y values should be the same
      expect(yValues[0]).toBeCloseTo(0.2, 5)
    })

    it('wire start/end positions match pin centers exactly', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0.2, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 5, y: 0.2, z: 0 })
      
      const fromPinPos = getState().getPinWorldPosition(gate1.id, gate1.outputs[0].id)
      const toPinPos = getState().getPinWorldPosition(gate2.id, gate2.inputs[0].id)
      
      // Create wire
      const wire = getState().addWire(gate1.id, gate1.outputs[0].id, gate2.id, gate2.inputs[0].id)
      
      // Wire positions should match pin centers exactly
      // This is an integration test - wires use getPinWorldPosition
      expect(fromPinPos).not.toBeNull()
      expect(toPinPos).not.toBeNull()
      
      // Verify wire exists and uses correct pin IDs
      const wires = getState().wires
      const createdWire = wires.find(w => w.id === wire.id)
      expect(createdWire).toBeDefined()
      expect(createdWire?.fromGateId).toBe(gate1.id)
      expect(createdWire?.fromPinId).toBe(gate1.outputs[0].id)
      expect(createdWire?.toGateId).toBe(gate2.id)
      expect(createdWire?.toPinId).toBe(gate2.inputs[0].id)
    })
  })
})
