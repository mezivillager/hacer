/**
 * Junction Placement Actions Tests
 *
 * Tests for placing junction nodes on wires.
 * All test wires use realistic geometries with perpendicular segments
 * (exit + vertical + horizontal + entry) to form valid corners.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCircuitStore } from '../../circuitStore'
import { SECTION_SIZE, WIRE_HEIGHT } from '@/utils/wiringScheme/types'
import type { WireSegment } from '@/utils/wiringScheme/types'

const getState = () => useCircuitStore.getState()

/**
 * Z-shaped wire with perpendicular corners.
 *
 * Corners:
 *   1. Exit end:              (SECTION_SIZE, WIRE_HEIGHT, 0)
 *   2. Vertical/Horizontal:   (SECTION_SIZE, WIRE_HEIGHT, -SECTION_SIZE)
 *   3. Entry start:           (2*SECTION_SIZE, WIRE_HEIGHT, -SECTION_SIZE)
 */
function createTestWireSegments(): WireSegment[] {
  return [
    { type: 'exit', start: { x: 0.7, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 } },
    { type: 'vertical', start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE } },
    { type: 'horizontal', start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }, end: { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE } },
    { type: 'entry', start: { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }, end: { x: 2 * SECTION_SIZE + 0.7, y: WIRE_HEIGHT, z: -SECTION_SIZE } },
  ]
}

/** The perpendicular corner where vertical meets horizontal. */
const CORNER_POSITION = { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }

/**
 * S-shaped wire with two perpendicular corners for multi-junction tests.
 *
 * Corners:
 *   1. Exit end:              (SECTION_SIZE, WIRE_HEIGHT, 0)
 *   2. Vertical/Horizontal:   (SECTION_SIZE, WIRE_HEIGHT, -SECTION_SIZE)
 *   3. Horizontal/Vertical:   (2*SECTION_SIZE, WIRE_HEIGHT, -SECTION_SIZE)
 *   4. Vertical/Horizontal:   (2*SECTION_SIZE, WIRE_HEIGHT, -2*SECTION_SIZE)
 *   5. Entry start:           (3*SECTION_SIZE, WIRE_HEIGHT, -2*SECTION_SIZE)
 */
function createMultiCornerWireSegments(): WireSegment[] {
  return [
    { type: 'exit', start: { x: 0.7, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 } },
    { type: 'vertical', start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE } },
    { type: 'horizontal', start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }, end: { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE } },
    { type: 'vertical', start: { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }, end: { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: -2 * SECTION_SIZE } },
    { type: 'horizontal', start: { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: -2 * SECTION_SIZE }, end: { x: 3 * SECTION_SIZE, y: WIRE_HEIGHT, z: -2 * SECTION_SIZE } },
    { type: 'entry', start: { x: 3 * SECTION_SIZE, y: WIRE_HEIGHT, z: -2 * SECTION_SIZE }, end: { x: 3 * SECTION_SIZE + 0.7, y: WIRE_HEIGHT, z: -2 * SECTION_SIZE } },
  ]
}

const MULTI_CORNER_1 = { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }
const MULTI_CORNER_2 = { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }

describe('junctionPlacementActions', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      gates: [],
      wires: [],
      junctions: [],
      junctionPlacementMode: null,
    })
    vi.clearAllMocks()
  })

  describe('startJunctionPlacement', () => {
    it('sets junction placement mode', () => {
      getState().startJunctionPlacement()

      expect(getState().junctionPlacementMode).toBe(true)
      expect(getState().placementMode).toBe(null)
      expect(getState().nodePlacementMode).toBe(null)
    })

    it('clears other placement modes', () => {
      useCircuitStore.setState({
        placementMode: 'NAND',
        nodePlacementMode: 'INPUT',
      })

      getState().startJunctionPlacement()

      expect(getState().junctionPlacementMode).toBe(true)
      expect(getState().placementMode).toBe(null)
      expect(getState().nodePlacementMode).toBe(null)
    })
  })

  describe('cancelJunctionPlacement', () => {
    it('clears junction placement mode', () => {
      useCircuitStore.setState({
        junctionPlacementMode: true,
      })

      getState().cancelJunctionPlacement()

      expect(getState().junctionPlacementMode).toBe(null)
    })
  })

  describe('updateJunctionPreviewPosition', () => {
    it('clears preview position and wire id when called with null', () => {
      useCircuitStore.setState({
        junctionPreviewPosition: { x: 1, y: WIRE_HEIGHT, z: 1 },
        junctionPreviewWireId: 'wire-1',
      })

      getState().updateJunctionPreviewPosition(null)

      expect(getState().junctionPreviewPosition).toBe(null)
      expect(getState().junctionPreviewWireId).toBe(null)
    })

    it('snaps to nearest corner and stores both position and wire id', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        createTestWireSegments()
      )

      getState().updateJunctionPreviewPosition({
        x: CORNER_POSITION.x + 0.1,
        y: CORNER_POSITION.y,
        z: CORNER_POSITION.z - 0.1,
      })

      expect(getState().junctionPreviewPosition).toEqual(CORNER_POSITION)
      expect(getState().junctionPreviewWireId).toBe(wire.id)
    })

    it('clears preview fields when not near any corner', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })

      getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        createTestWireSegments()
      )

      getState().updateJunctionPreviewPosition({
        x: 1.5 * SECTION_SIZE,
        y: WIRE_HEIGHT,
        z: -SECTION_SIZE,
      })

      expect(getState().junctionPreviewPosition).toBe(null)
      expect(getState().junctionPreviewWireId).toBe(null)
    })
  })

  describe('placeJunctionOnWire', () => {
    it('creates junction on wire at corner position', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        createTestWireSegments()
      )

      const junction = getState().placeJunctionOnWire(CORNER_POSITION, wire.id)

      expect(junction).toBeDefined()
      expect(junction.id).toBeDefined()
      expect(junction.signalId).toBeDefined()
      expect(junction.wireIds).toContain(wire.id)
      expect(getState().junctions).toHaveLength(1)
      expect(getState().junctionPlacementMode).toBe(null)
    })

    it('generates signalId if wire does not have one', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        createTestWireSegments()
      )

      const junction = getState().placeJunctionOnWire(CORNER_POSITION, wire.id)

      expect(junction.signalId).toBeDefined()
      const updatedWire = getState().wires.find((w) => w.id === wire.id)
      expect(updatedWire?.signalId).toBe(junction.signalId)
    })

    it('uses wire signalId if wire already has one', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        createTestWireSegments(),
        [],
        'sig-custom'
      )

      const junction = getState().placeJunctionOnWire(CORNER_POSITION, wire.id)

      expect(junction.signalId).toBe('sig-custom')
    })

    it('throws error if wire not found', () => {
      expect(() => {
        getState().placeJunctionOnWire({ x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, 'non-existent')
      }).toThrow('Wire non-existent not found')
    })

    it('rejects placement when position is not at a corner', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        createTestWireSegments()
      )

      // Click in the middle of the horizontal segment, far from any corner (> 0.3 snap threshold)
      expect(() => {
        getState().placeJunctionOnWire({ x: 1.5 * SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }, wire.id)
      }).toThrow('Junction can only be placed at wire corners (section line intersections)')
    })

    it('rejects placement when position is not at segment endpoint', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        createTestWireSegments()
      )

      // Click partway along horizontal segment, beyond snap threshold from nearest corner
      expect(() => {
        getState().placeJunctionOnWire({ x: SECTION_SIZE + 0.5, y: WIRE_HEIGHT, z: -SECTION_SIZE }, wire.id)
      }).toThrow('Junction can only be placed at wire corners (section line intersections)')
    })

    it('allows placement at corners of multi-segment wire', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        createTestWireSegments()
      )

      const junction = getState().placeJunctionOnWire(CORNER_POSITION, wire.id)

      expect(junction).toBeDefined()
      expect(getState().junctions).toHaveLength(1)
    })

    it('allows multiple junctions on same wire at different corners', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 3 * SECTION_SIZE, y: 0, z: -2 * SECTION_SIZE })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        createMultiCornerWireSegments()
      )

      const junction1 = getState().placeJunctionOnWire(MULTI_CORNER_1, wire.id)
      expect(junction1).toBeDefined()

      const junction2 = getState().placeJunctionOnWire(MULTI_CORNER_2, wire.id)
      expect(junction2).toBeDefined()

      expect(getState().junctions).toHaveLength(2)
      expect(junction1.wireIds).toContain(wire.id)
      expect(junction2.wireIds).toContain(wire.id)
    })

    it('allows wiring from each junction independently', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 3 * SECTION_SIZE, y: 0, z: -2 * SECTION_SIZE })
      const gate3 = getState().addGate('NAND', { x: 3 * SECTION_SIZE, y: 0, z: SECTION_SIZE })
      const gate4 = getState().addGate('NAND', { x: 3 * SECTION_SIZE, y: 0, z: 2 * SECTION_SIZE })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        createMultiCornerWireSegments(),
        [],
        'sig-test'
      )

      const junction1 = getState().placeJunctionOnWire(MULTI_CORNER_1, wire.id)
      const junction2 = getState().placeJunctionOnWire(MULTI_CORNER_2, wire.id)

      // Wire from junction1 to gate3
      getState().startWiringFromJunction(junction1.id, junction1.position)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            {
              start: MULTI_CORNER_1,
              end: { x: 3 * SECTION_SIZE, y: WIRE_HEIGHT, z: SECTION_SIZE },
              type: 'horizontal',
            },
          ]
        }
      })
      getState().completeWiringFromJunction(gate3.id, gate3.inputs[0].id, 'input')

      // Wire from junction2 to gate4
      getState().startWiringFromJunction(junction2.id, junction2.position)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            {
              start: MULTI_CORNER_2,
              end: { x: 3 * SECTION_SIZE, y: WIRE_HEIGHT, z: 2 * SECTION_SIZE },
              type: 'horizontal',
            },
          ]
        }
      })
      getState().completeWiringFromJunction(gate4.id, gate4.inputs[0].id, 'input')

      // Original wire + 2 branch wires
      expect(getState().wires).toHaveLength(3)

      const branchWire1 = getState().wires.find((w) => w.to.entityId === gate3.id)
      const branchWire2 = getState().wires.find((w) => w.to.entityId === gate4.id)

      expect(branchWire1?.from.entityId).toBe(gate1.id)
      expect(branchWire2?.from.entityId).toBe(gate1.id)

      const updatedJunction1 = getState().junctions.find((j) => j.id === junction1.id)
      const updatedJunction2 = getState().junctions.find((j) => j.id === junction2.id)

      expect(updatedJunction1?.wireIds).toContain(branchWire1!.id)
      expect(updatedJunction2?.wireIds).toContain(branchWire2!.id)
    })

    it('throws error when wire has no segments', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 8, y: 0, z: 0 })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        []
      )

      expect(() => {
        getState().placeJunctionOnWire({ x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, wire.id)
      }).toThrow()
    })

    it('allows placement at corners even when wire contains arc segments', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 3 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        [
          { type: 'exit', start: { x: 0.7, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 } },
          { type: 'vertical', start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE } },
          {
            type: 'arc',
            start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE },
            end: { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE },
            arcCenter: { x: 1.5 * SECTION_SIZE, y: WIRE_HEIGHT + 0.15, z: -SECTION_SIZE },
            arcRadius: 0.075,
            crossedWireId: 'some-wire-id',
          },
          { type: 'horizontal', start: { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }, end: { x: 3 * SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE } },
          { type: 'entry', start: { x: 3 * SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }, end: { x: 3 * SECTION_SIZE + 0.7, y: WIRE_HEIGHT, z: -SECTION_SIZE } },
        ]
      )

      // Place junction at corner between vertical and arc (arc is perpendicular to everything)
      const junction = getState().placeJunctionOnWire(
        { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE },
        wire.id
      )

      expect(junction).toBeDefined()
      expect(getState().junctions).toHaveLength(1)
    })
  })

  describe('placeJunctionOnWire - snap to corner', () => {
    it('snaps to nearest corner when clicking near but not exactly on a corner', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        createTestWireSegments()
      )

      // Click slightly offset from the corner (within 0.3 units threshold)
      const clickPoint = {
        x: CORNER_POSITION.x + 0.15,
        y: CORNER_POSITION.y,
        z: CORNER_POSITION.z - 0.1,
      }

      const junction = getState().placeJunctionOnWire(clickPoint, wire.id)

      expect(junction).toBeDefined()
      expect(junction.position).toEqual(CORNER_POSITION)
      expect(getState().junctions).toHaveLength(1)
    })

    it('does not snap when clicking far from any corner', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        createTestWireSegments()
      )

      // Click in the middle of the horizontal segment, > 0.3 units from any corner
      expect(() => {
        getState().placeJunctionOnWire(
          { x: 1.5 * SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE },
          wire.id
        )
      }).toThrow('Junction can only be placed at wire corners (section line intersections)')
    })
  })
})
