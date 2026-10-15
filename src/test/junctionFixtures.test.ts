import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { SECTION_SIZE, WIRE_HEIGHT } from '@/utils/wiringScheme/types'
import { drawBranch, placeJunction, zSegments, Z_CORNER } from './junctionFixtures'

const getState = () => useCircuitStore.getState()

function buildTrunk() {
  const source = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
  const sink = getState().addGate('Nand', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })
  const branchSink = getState().addGate('Nand', { x: SECTION_SIZE, y: 0, z: -3 * SECTION_SIZE })
  const output = getState().addOutputNode('out', { x: -SECTION_SIZE, y: 0, z: -SECTION_SIZE })
  const trunk = getState().addWire(
    { type: 'gate', entityId: source.id, pinId: source.outputs[0].id },
    { type: 'gate', entityId: sink.id, pinId: sink.inputs[0].id },
    zSegments()
  )
  return { source, sink, branchSink, output, trunk }
}

describe('junctionFixtures', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      gates: [], wires: [], junctions: [], inputNodes: [], outputNodes: [], wiringFrom: null,
      junctionPlacementMode: null, junctionPreviewPosition: null, junctionPreviewWireId: null,
    })
  })

  it('places the junction on the trunk and draws each branch through the wiring gesture', () => {
    const c = buildTrunk()

    const placed = placeJunction(c.trunk.id, Z_CORNER, [
      {
        to: { type: 'gate', gateId: c.branchSink.id, pinId: c.branchSink.inputs[0].id },
        tail: [{ type: 'vertical', start: Z_CORNER, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -2 * SECTION_SIZE } }],
      },
      {
        to: { type: 'output', nodeId: c.output.id },
        tail: [{ type: 'horizontal', start: Z_CORNER, end: { x: 0, y: WIRE_HEIGHT, z: -SECTION_SIZE } }],
      },
    ])

    const junction = getState().junctions.find((j) => j.id === placed.junctionId)
    expect(junction?.position).toEqual(Z_CORNER)
    expect(junction?.wireIds).toEqual([c.trunk.id, ...placed.branchIds])
    const branches = placed.branchIds.map((id) => getState().wires.find((w) => w.id === id))
    for (const branch of branches) {
      expect(branch?.from).toEqual(c.trunk.from)
      expect(branch?.segments[0]).toEqual(c.trunk.segments[0])
    }
    expect(branches.map((b) => b?.to.entityId)).toEqual([c.branchSink.id, c.output.id])
    expect(getState().wiringFrom).toBeNull()
  })

  it('throws when the gesture creates no wire, rather than returning a junction without its branch', () => {
    const c = buildTrunk()
    const { junctionId } = placeJunction(c.trunk.id, Z_CORNER)

    expect(() =>
      drawBranch(junctionId, { to: { type: 'gate', gateId: c.branchSink.id, pinId: c.branchSink.inputs[0].id }, tail: [] })
    ).toThrow(/created 0 wires/)
  })
})
