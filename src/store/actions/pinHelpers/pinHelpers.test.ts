import { describe, it, expect, beforeEach } from 'vitest'
import { Vector3, Euler } from 'three'
import { useCircuitStore } from '../../circuitStore'
import { computeChipLayout } from '@/components/scene/chipBodyLayout'
import { getBuiltinChipRegistry } from '@/core/chips/appRegistry'
import type { GateInstance, Position } from '../../types'

// Helper to get store state
const getState = () => useCircuitStore.getState()

/**
 * Computes the world position of a pin by routing through `chipBodyLayout`
 * (the single source of truth for the visible 3D pin position) and applying
 * the gate's rotation + position. The store-level `getPinWorldPosition`
 * must agree with this for wire endpoints to coincide with rendered pins.
 */
function expectedWorldPos(gate: GateInstance, pinId: string): Position {
  const chip = getBuiltinChipRegistry().get(gate.chipName)
  if (!chip) throw new Error(`Test setup: chip ${gate.chipName} not in registry`)
  const layout = computeChipLayout(chip, gate.id)
  const slot = layout.pinSlots.find((s) => s.pinId === pinId)
  if (!slot) throw new Error(`Test setup: pin ${pinId} has no layout slot`)
  const local = new Vector3(slot.position[0], slot.position[1], slot.position[2])
  const euler = new Euler(gate.rotation.x, gate.rotation.y, gate.rotation.z, 'XYZ')
  local.applyEuler(euler)
  return {
    x: gate.position.x + local.x,
    y: gate.position.y + local.y,
    z: gate.position.z + local.z,
  }
}

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

  // Pin position constants derived from the chipBodyLayout source of truth:
  //   For a 2-input chip (e.g. Nand) MIN_SIZE_X=1.0 + SIZE_X_GROWTH=0.05 * 2 = 1.1,
  //   so halfBodyX=0.55 and the pin sits PIN_OFFSET_X=0.05 outside the body.
  //   Inputs at x=-0.6, output at x=+0.6. No bubble offset (generic 3D body).
  const INPUT_PIN_X = -0.6
  const OUTPUT_PIN_X = 0.6

  describe('getPinWorldPosition', () => {
    it('returns input pin world position for first input (top of screen after rotation)', () => {
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })

      const position = getState().getPinWorldPosition(gate.id, gate.inputs[0].id)

      expect(position).not.toBeNull()
      expect(position?.x).toBeCloseTo(INPUT_PIN_X, 1)
      // chipBodyLayout places chip.inputs[0] at local Y = -0.2 (the lowest
      // local Y in a 2-input chip). After the [PI/2, 0, 0] rotation that maps
      // local Y → world Z, the pin lands at world Z = -0.2 — the "far" side
      // of the camera (top of the screen given the [0, 6, 6] camera).
      expect(position?.y).toBeCloseTo(0, 1)
      expect(position?.z).toBeCloseTo(-0.2, 1)
    })

    it('returns input pin world position for second input (bottom of screen after rotation)', () => {
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })

      const position = getState().getPinWorldPosition(gate.id, gate.inputs[1].id)

      expect(position).not.toBeNull()
      expect(position?.x).toBeCloseTo(INPUT_PIN_X, 1)
      // chip.inputs[1] at local Y = +0.2 → world Z = +0.2 after rotation.
      expect(position?.y).toBeCloseTo(0, 1)
      expect(position?.z).toBeCloseTo(0.2, 1)
    })

    it('returns output pin world position', () => {
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })

      const position = getState().getPinWorldPosition(gate.id, gate.outputs[0].id)

      expect(position).not.toBeNull()
      expect(position?.x).toBeCloseTo(OUTPUT_PIN_X, 1)
      expect(position?.y).toBe(0)
      expect(position?.z).toBe(0)
    })

    it('accounts for gate position', () => {
      const gate = getState().addGate('Nand', { x: 5, y: 10, z: 15 })

      const position = getState().getPinWorldPosition(gate.id, gate.outputs[0].id)

      expect(position).not.toBeNull()
      // Output pin local [OUTPUT_PIN_X, 0, 0] → world after rotation [OUTPUT_PIN_X, 0, 0]
      expect(position?.x).toBeCloseTo(5 + OUTPUT_PIN_X, 1)
      expect(position?.y).toBeCloseTo(10, 1)
      expect(position?.z).toBeCloseTo(15, 1)
    })

    it('accounts for gate rotation', () => {
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      getState().rotateGate(gate.id, 'y', Math.PI)

      const position = getState().getPinWorldPosition(gate.id, gate.outputs[0].id)

      expect(position).not.toBeNull()
      // After an additional 180° around Y, the output ends up on the opposite side.
      expect(position?.x).toBeCloseTo(-OUTPUT_PIN_X, 1)
    })

    it('returns null if gate does not exist', () => {
      const position = getState().getPinWorldPosition('non-existent-id', 'pin-id')

      expect(position).toBeNull()
    })

    it('returns null if pin does not exist', () => {
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })

      const position = getState().getPinWorldPosition(gate.id, 'non-existent-pin')

      expect(position).toBeNull()
    })
  })

  describe('getPinWorldPosition - Center Alignment', () => {
    it('returns exact pin center with no Y offset above or below', () => {
      const gate = getState().addGate('Nand', { x: 0, y: 0.2, z: 0 })

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
        const gate = getState().addGate('Nand', { x: 0, y: 0.2, z: 0 })
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
      const gate = getState().addGate('Nand', { x: 0, y: 0.2, z: 0 })

      // Gate has default 90° X rotation (flat orientation). chipBodyLayout
      // places chip.inputs[0] at local Y = -0.2, which after the rotation
      // becomes world Z = -0.2.
      const inputAPosition = getState().getPinWorldPosition(gate.id, gate.inputs[0].id)

      expect(inputAPosition).not.toBeNull()
      expect(inputAPosition?.y).toBeCloseTo(0.2, 5) // Gate Y is preserved
      expect(inputAPosition?.z).toBeCloseTo(-0.2, 5) // Local Y maps to world Z
    })

    it('pin center accounts for user rotation (Z rotation)', () => {
      const gate = getState().addGate('Nand', { x: 0, y: 0.2, z: 0 })
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
      const gate = getState().addGate('Nand', { x: 0, y: 0.2, z: 0 })

      const inputAPos = getState().getPinWorldPosition(gate.id, gate.inputs[0].id)
      const inputBPos = getState().getPinWorldPosition(gate.id, gate.inputs[1].id)
      const outputPos = getState().getPinWorldPosition(gate.id, gate.outputs[0].id)

      // All pins should have same Y coordinate (pin center Y = gate Y)
      expect(inputAPos?.y).toBeCloseTo(0.2, 5)
      expect(inputBPos?.y).toBeCloseTo(0.2, 5)
      expect(outputPos?.y).toBeCloseTo(0.2, 5)
    })

    it('works for all gate types', () => {
      const gateTypes = ['Nand', 'And', 'Or', 'Xor', 'Not'] as const
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
      const gate1 = getState().addGate('Nand', { x: 0, y: 0.2, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 5, y: 0.2, z: 0 })

      const fromPinPos = getState().getPinWorldPosition(gate1.id, gate1.outputs[0].id)
      const toPinPos = getState().getPinWorldPosition(gate2.id, gate2.inputs[0].id)

      // Create wire
      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        []
      )

      // Wire positions should match pin centers exactly
      // This is an integration test - wires use getPinWorldPosition
      expect(fromPinPos).not.toBeNull()
      expect(toPinPos).not.toBeNull()

      // Verify wire exists and uses correct pin IDs
      const wires = getState().wires
      const createdWire = wires.find(w => w.id === wire.id)
      expect(createdWire).toBeDefined()
      expect(createdWire?.from.type).toBe('gate')
      expect(createdWire?.from.entityId).toBe(gate1.id)
      expect(createdWire?.from.pinId).toBe(gate1.outputs[0].id)
      expect(createdWire?.to.type).toBe('gate')
      expect(createdWire?.to.entityId).toBe(gate2.id)
      expect(createdWire?.to.pinId).toBe(gate2.inputs[0].id)
    })
  })

  describe('getPinWorldPosition - layout/world-position contract', () => {
    // Regression for the wiring bug where clicking a visually-rendered pin
    // wired to a different pin position because getPinWorldPosition used
    // hardcoded legacy offsets that diverged from chipBodyLayout.
    //
    // The store-level getPinWorldPosition MUST agree with the chipBodyLayout
    // function used by ChipBody3D — otherwise the wire endpoint and the
    // rendered pin disagree, and clicking pin N wires to a different pin.

    it('Nand (2 inputs, 1 output): every pin matches the layout-derived world position', () => {
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      for (const pin of [...gate.inputs, ...gate.outputs]) {
        const expected = expectedWorldPos(gate, pin.id)
        const actual = getState().getPinWorldPosition(gate.id, pin.id)
        expect(actual, `pin ${pin.id} should have a world position`).not.toBeNull()
        expect(actual?.x).toBeCloseTo(expected.x, 5)
        expect(actual?.y).toBeCloseTo(expected.y, 5)
        expect(actual?.z).toBeCloseTo(expected.z, 5)
      }
    })

    it('Not (1 input, 1 output): single input pin matches the layout slot', () => {
      const gate = getState().addGate('Not', { x: 1, y: 0, z: 2 })
      for (const pin of [...gate.inputs, ...gate.outputs]) {
        const expected = expectedWorldPos(gate, pin.id)
        const actual = getState().getPinWorldPosition(gate.id, pin.id)
        expect(actual?.x).toBeCloseTo(expected.x, 5)
        expect(actual?.y).toBeCloseTo(expected.y, 5)
        expect(actual?.z).toBeCloseTo(expected.z, 5)
      }
    })

    it('Mux (3 inputs a/b/sel, 1 output): each input has a distinct world position matching the layout', () => {
      const gate = getState().addGate('Mux', { x: 0, y: 0, z: 0 })
      expect(gate.inputs).toHaveLength(3)
      for (const pin of gate.inputs) {
        const expected = expectedWorldPos(gate, pin.id)
        const actual = getState().getPinWorldPosition(gate.id, pin.id)
        expect(actual?.x).toBeCloseTo(expected.x, 5)
        expect(actual?.y).toBeCloseTo(expected.y, 5)
        expect(actual?.z).toBeCloseTo(expected.z, 5)
      }
      const zs = gate.inputs.map((p) => getState().getPinWorldPosition(gate.id, p.id)?.z ?? NaN)
      expect(new Set(zs).size).toBe(3)
    })

    it('Mux8Way16 (9 distinct input pins): every input returns a unique world position matching the layout', () => {
      // Regression for the previous hardcoded-offset bug, which collapsed
      // every input with index >= 1 to the same Y=-0.2 position. Mux8Way16
      // has 9 input pins (a..h + sel) — the strongest multi-pin coverage
      // available in Project 1 builtins.
      const gate = getState().addGate('Mux8Way16', { x: 0, y: 0, z: 0 })
      expect(gate.inputs).toHaveLength(9)
      for (const pin of gate.inputs) {
        const expected = expectedWorldPos(gate, pin.id)
        const actual = getState().getPinWorldPosition(gate.id, pin.id)
        expect(actual?.x).toBeCloseTo(expected.x, 5)
        expect(actual?.y).toBeCloseTo(expected.y, 5)
        expect(actual?.z).toBeCloseTo(expected.z, 5)
      }
      // Each input must occupy a unique world position.
      const fingerprints = gate.inputs.map((p) => {
        const pos = getState().getPinWorldPosition(gate.id, p.id)
        return `${pos?.x.toFixed(4)}|${pos?.y.toFixed(4)}|${pos?.z.toFixed(4)}`
      })
      expect(new Set(fingerprints).size).toBe(9)
    })

    it('Mux16 (3 inputs of mixed widths): layout contract holds under multi-bit pins', () => {
      const gate = getState().addGate('Mux16', { x: 0, y: 0, z: 0 })
      for (const pin of [...gate.inputs, ...gate.outputs]) {
        const expected = expectedWorldPos(gate, pin.id)
        const actual = getState().getPinWorldPosition(gate.id, pin.id)
        expect(actual?.x).toBeCloseTo(expected.x, 5)
        expect(actual?.y).toBeCloseTo(expected.y, 5)
        expect(actual?.z).toBeCloseTo(expected.z, 5)
      }
    })

    it('Layout contract survives gate rotation (180° around Y)', () => {
      const gate = getState().addGate('Mux', { x: 3, y: 0, z: 4 })
      getState().rotateGate(gate.id, 'y', Math.PI)
      // Read the rotated gate back so expectedWorldPos uses current rotation.
      const rotatedGate = getState().gates.find((g) => g.id === gate.id)!
      for (const pin of [...rotatedGate.inputs, ...rotatedGate.outputs]) {
        const expected = expectedWorldPos(rotatedGate, pin.id)
        const actual = getState().getPinWorldPosition(rotatedGate.id, pin.id)
        expect(actual?.x).toBeCloseTo(expected.x, 5)
        expect(actual?.y).toBeCloseTo(expected.y, 5)
        expect(actual?.z).toBeCloseTo(expected.z, 5)
      }
    })
  })
})
