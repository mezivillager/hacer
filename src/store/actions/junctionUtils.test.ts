import { describe, it, expect, beforeEach } from 'vitest'
import { computeJunctionRelocations } from './junctionUtils'
import { useCircuitStore } from '../circuitStore'
import { placeJunction, zSegments, Z_CORNER } from '@/test/junctionFixtures'
import { SECTION_SIZE, WIRE_HEIGHT } from '@/utils/wiringScheme/types'

const getState = () => useCircuitStore.getState()

function buildJunction() {
  const source = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
  const sink = getState().addGate('Nand', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })
  const branchSink = getState().addGate('Nand', { x: SECTION_SIZE, y: 0, z: -3 * SECTION_SIZE })
  const trunk = getState().addWire(
    { type: 'gate', entityId: source.id, pinId: source.outputs[0].id },
    { type: 'gate', entityId: sink.id, pinId: sink.inputs[0].id },
    zSegments()
  )
  return placeJunction(trunk.id, Z_CORNER, [{
    to: { type: 'gate', gateId: branchSink.id, pinId: branchSink.inputs[0].id },
    tail: [{ type: 'vertical', start: Z_CORNER, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -2 * SECTION_SIZE } }],
  }])
}

const relocate = (trunkId: string) =>
  computeJunctionRelocations(new Set([trunkId]), getState, getState().getPinWorldPosition)

describe('junctionUtils', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      gates: [], wires: [], junctions: [], inputNodes: [], outputNodes: [], wiringFrom: null,
      junctionPlacementMode: null, junctionPreviewPosition: null, junctionPreviewWireId: null,
    })
  })

  describe('computeJunctionRelocations', () => {
    it('relocates junction to nearest corner when current position is invalid', () => {
      const { junctionId, trunkId } = buildJunction()
      getState().updateWireSegments(trunkId, [
        { type: 'horizontal', start: { x: 0, y: WIRE_HEIGHT, z: 0 }, end: { x: 10, y: WIRE_HEIGHT, z: 0 } },
        { type: 'vertical', start: { x: 10, y: WIRE_HEIGHT, z: 0 }, end: { x: 10, y: WIRE_HEIGHT, z: 10 } },
      ])

      const result = relocate(trunkId)

      expect(result.updates).toHaveLength(1)
      expect(result.updates[0].id).toBe(junctionId)
      // The horizontal and vertical runs meet at (10, 0): the recalculated trunk's only corner.
      expect(result.updates[0].position.x).toBe(10)
      expect(result.updates[0].position.z).toBe(0)
    })

    it('removes junction if trunk wire has no corners', () => {
      const { junctionId, trunkId } = buildJunction()
      getState().updateWireSegments(trunkId, [])

      const result = relocate(trunkId)

      expect(result.removals).toContain(junctionId)
    })

    it('keeps junction if current position is still a valid corner', () => {
      const { trunkId } = buildJunction()

      const result = relocate(trunkId)

      expect(result.updates).toHaveLength(0)
      expect(result.removals).toHaveLength(0)
    })
  })
})
