/**
 * Junction Actions Tests
 *
 * Tests for junction management (signal branch points).
 * Note: Signal wire functionality is now part of unified wireActions.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'
import type { JunctionNode, Position, WireEndpoint } from '../../types'
import { SECTION_SIZE, WIRE_HEIGHT } from '@/utils/wiringScheme/types'
import { drawBranch, placeJunction, zSegments, Z_CORNER } from '@/test/junctionFixtures'
import { gateRecord, importDocument, wireRecord } from '@/test/documentFixtures'

/** A gate-to-gate trunk with a junction on its corner and `branches` (1 or 2) wires drawn from it by the gesture. */
function gestureFanOut(branches: 1 | 2) {
  const getState = () => useCircuitStore.getState()
  const source = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
  const trunkSink = getState().addGate('Nand', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })
  const sinks = [
    getState().addGate('Nand', { x: SECTION_SIZE, y: 0, z: -3 * SECTION_SIZE }),
    getState().addGate('Nand', { x: -SECTION_SIZE, y: 0, z: -SECTION_SIZE }),
  ]
  const tails = [
    { type: 'vertical' as const, start: Z_CORNER, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -2 * SECTION_SIZE } },
    { type: 'horizontal' as const, start: Z_CORNER, end: { x: 0, y: WIRE_HEIGHT, z: -SECTION_SIZE } },
  ]
  const trunk = getState().addWire(
    { type: 'gate', entityId: source.id, pinId: source.outputs[0].id },
    { type: 'gate', entityId: trunkSink.id, pinId: trunkSink.inputs[0].id },
    zSegments()
  )
  const placed = placeJunction(trunk.id, Z_CORNER, sinks.slice(0, branches).map((sink, i) => ({
    to: { type: 'gate' as const, gateId: sink.id, pinId: sink.inputs[0].id },
    tail: [tails[i]],
  })))
  return { ...placed, trunkSink }
}

/** The junction entry of a saved document: the one place this file writes `wireIds`. */
const junctionRecord = (id: string, wireIds: string[], position: Position = Z_CORNER): JunctionNode => ({
  id,
  position,
  signalId: 'sig-a',
  wireIds,
})

const pinIn = (gateId: string) => ({ type: 'gate' as const, entityId: gateId, pinId: `${gateId}-in-0` })
const pinOut = (gateId: string) => ({ type: 'gate' as const, entityId: gateId, pinId: `${gateId}-out-0` })

const FAN = {
  source: 'g-source',
  sink: 'g-sink',
  branchSink1: 'g-branch-sink-1',
  branchSink2: 'g-branch-sink-2',
  junction: 'j-fan',
  trunk: 'w-trunk',
  branch1: 'w-branch-1',
  branch2: 'w-branch-2',
} as const

/** A saved fan-out whose two branches start at the junction on the trunk's corner: the importer's shape (#377), which no store action writes. */
function fanOutDocument(wireIds: string[] = [FAN.trunk, FAN.branch1, FAN.branch2]) {
  return {
    gates: [
      gateRecord(FAN.source),
      gateRecord(FAN.sink, { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE }),
      gateRecord(FAN.branchSink1, { x: 4 * SECTION_SIZE, y: 0, z: 0 }),
      gateRecord(FAN.branchSink2, { x: 4 * SECTION_SIZE, y: 0, z: 4 }),
    ],
    wires: [
      wireRecord(FAN.trunk, pinOut(FAN.source), pinIn(FAN.sink), zSegments()),
      wireRecord(FAN.branch1, { type: 'junction', entityId: FAN.junction }, pinIn(FAN.branchSink1)),
      wireRecord(FAN.branch2, { type: 'junction', entityId: FAN.junction }, pinIn(FAN.branchSink2)),
    ],
    junctions: [junctionRecord(FAN.junction, wireIds)],
  }
}

describe('Junction Actions', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useCircuitStore.setState({
      inputNodes: [],
      outputNodes: [],
      junctions: [],
      wires: [],
      gates: [],
    })
  })

  describe('addJunction', () => {
    it('creates a junction node for signal branching', () => {
      const position: Position = { x: 4, y: 0.2, z: 4 }
      const store = useCircuitStore.getState()

      const junction = store.addJunction('sig-a', position)

      expect(junction.id).toBeDefined()
      expect(junction.signalId).toBe('sig-a')
      expect(junction.position).toEqual(position)
    })

    it('adds the junction to the store state', () => {
      const store = useCircuitStore.getState()

      store.addJunction('sig-a', { x: 4, y: 0.2, z: 4 })
      store.addJunction('sig-b', { x: 8, y: 0.2, z: 8 })

      const state = useCircuitStore.getState()
      expect(state.junctions).toHaveLength(2)
    })
  })

  describe('removeJunction', () => {
    it('removes a junction by ID', () => {
      const store = useCircuitStore.getState()
      const junction = store.addJunction('sig-a', { x: 4, y: 0.2, z: 4 })

      store.removeJunction(junction.id)

      const state = useCircuitStore.getState()
      expect(state.junctions).toHaveLength(0)
    })

    // Every wire the gesture draws has two real endpoints, so listing it in `wireIds` is no reason
    // to delete it (#403).
    it('keeps every tracked wire that has two real endpoints (#403)', () => {
      const store = useCircuitStore.getState()
      const { junctionId, trunkId, branchIds } = gestureFanOut(2)

      expect(useCircuitStore.getState().wires).toHaveLength(3)

      store.removeJunction(junctionId)

      // No wire needed the junction to exist, so every wire stays; only the junction goes.
      const state = useCircuitStore.getState()
      expect(state.wires.map((w) => w.id)).toEqual([trunkId, ...branchIds])
      expect(state.junctions).toHaveLength(0)
    })

    it('does not remove unrelated wires when removing junction', () => {
      const store = useCircuitStore.getState()
      const { junctionId, trunkId: wire1Id, branchIds: [branchWireId] } = gestureFanOut(1)
      const unrelatedWire = store.addWire(
        { type: 'input', entityId: 'input-b' },
        { type: 'gate', entityId: 'gate-3', pinId: 'in' },
        [],
        [],
        'sig-b'
      )

      expect(useCircuitStore.getState().wires).toHaveLength(3)

      store.removeJunction(junctionId)

      // The unrelated wire is untouched; the branch has two real endpoints, so it stays too (#403).
      const state = useCircuitStore.getState()
      expect(state.wires).toHaveLength(3)
      expect(state.wires.map(w => w.id).sort()).toEqual([wire1Id, branchWireId, unrelatedWire.id].sort())
    })
  })

  describe('removeJunction - wire cleanup', () => {
    // The branches start at the junction, so they go with it; the trunk has two real endpoints and stays.
    it('removes branch wires when junction is removed', () => {
      importDocument(fanOutDocument())

      expect(useCircuitStore.getState().wires).toHaveLength(3)

      useCircuitStore.getState().removeJunction(FAN.junction)

      const state = useCircuitStore.getState()
      // branch1 and branch2 removed, the trunk remains
      expect(state.wires).toHaveLength(1)
      expect(state.wires[0].id).toBe(FAN.trunk)
    })

    it('removes junction from junctions array', () => {
      const store = useCircuitStore.getState()
      const junction = store.addJunction('sig-a', { x: 4, y: 0.2, z: 4 })

      expect(useCircuitStore.getState().junctions).toHaveLength(1)

      store.removeJunction(junction.id)

      expect(useCircuitStore.getState().junctions).toHaveLength(0)
    })

    it('does nothing when junction not found', () => {
      const store = useCircuitStore.getState()
      store.addJunction('sig-a', { x: 4, y: 0.2, z: 4 })
      store.addWire(
        { type: 'input', entityId: 'input-a' },
        { type: 'gate', entityId: 'gate-1', pinId: 'in' },
        [],
        [],
        'sig-a'
      )

      const stateBefore = useCircuitStore.getState()

      store.removeJunction('non-existent-id')

      const stateAfter = useCircuitStore.getState()
      expect(stateAfter.junctions).toHaveLength(1)
      expect(stateAfter.wires).toHaveLength(1)
      expect(stateAfter.junctions).toEqual(stateBefore.junctions)
      expect(stateAfter.wires).toEqual(stateBefore.wires)
    })
  })

  describe('updateJunctionPosition', () => {
    it('updates the position of a junction', () => {
      const store = useCircuitStore.getState()
      const junction = store.addJunction('sig-a', { x: 4, y: 0.2, z: 4 })

      store.updateJunctionPosition(junction.id, { x: 8, y: 0.2, z: 8 })

      const state = useCircuitStore.getState()
      const updated = state.junctions.find((j) => j.id === junction.id)
      expect(updated?.position).toEqual({ x: 8, y: 0.2, z: 8 })
    })

    it('does nothing if junction does not exist', () => {
      const store = useCircuitStore.getState()
      store.addJunction('sig-a', { x: 4, y: 0.2, z: 4 })

      // Should not throw
      store.updateJunctionPosition('non-existent', { x: 0, y: 0, z: 0 })

      const state = useCircuitStore.getState()
      expect(state.junctions).toHaveLength(1)
      expect(state.junctions[0].position).toEqual({ x: 4, y: 0.2, z: 4 })
    })
  })
})

describe('Unified Wire System - Node and Junction Wiring', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      inputNodes: [],
      outputNodes: [],
      junctions: [],
      wires: [],
      gates: [],
    })
  })

  describe('addWire with node endpoints', () => {
    it('creates a wire from input node to gate', () => {
      const store = useCircuitStore.getState()

      const from: WireEndpoint = { type: 'input', entityId: 'input-a' }
      const to: WireEndpoint = { type: 'gate', entityId: 'not-1', pinId: 'in' }

      const wire = store.addWire(from, to, [], [], 'sig-a')

      expect(wire.id).toBeDefined()
      expect(wire.signalId).toBe('sig-a')
      expect(wire.from).toEqual(from)
      expect(wire.to).toEqual(to)
      expect(wire.segments).toEqual([])
      expect(wire.crossesWireIds).toEqual([])
    })

    it('creates a wire from source to junction (trunk)', () => {
      const store = useCircuitStore.getState()

      const from: WireEndpoint = { type: 'input', entityId: 'input-a' }
      const to: WireEndpoint = { type: 'junction', entityId: 'junction-1' }

      const wire = store.addWire(from, to, [], [], 'sig-a')

      expect(wire.from.type).toBe('input')
      expect(wire.to.type).toBe('junction')
    })

    it('creates a wire from junction to destination (branch)', () => {
      const store = useCircuitStore.getState()

      const from: WireEndpoint = { type: 'junction', entityId: 'junction-1' }
      const to: WireEndpoint = { type: 'gate', entityId: 'and-1', pinId: 'a' }

      const wire = store.addWire(from, to, [], [], 'sig-a')

      expect(wire.from.type).toBe('junction')
      expect(wire.to.type).toBe('gate')
    })

    it('creates a wire from gate to output node', () => {
      const store = useCircuitStore.getState()

      const from: WireEndpoint = { type: 'gate', entityId: 'or-1', pinId: 'out' }
      const to: WireEndpoint = { type: 'output', entityId: 'output-out' }

      const wire = store.addWire(from, to, [], [], 'sig-out')

      expect(wire.from.type).toBe('gate')
      expect(wire.to.type).toBe('output')
    })

    it('stores wire segments and crossed wire IDs', () => {
      const store = useCircuitStore.getState()

      const segments = [
        { start: { x: 0, y: 0.2, z: 0 }, end: { x: 4, y: 0.2, z: 0 }, type: 'horizontal' as const },
      ]

      const wire = store.addWire(
        { type: 'input', entityId: 'input-a' },
        { type: 'gate', entityId: 'not-1', pinId: 'in' },
        segments,
        ['wire-existing-1'],
        'sig-a'
      )

      expect(wire.segments).toEqual(segments)
      expect(wire.crossesWireIds).toEqual(['wire-existing-1'])
    })
  })

  describe('removeWire', () => {
    it('removes a wire by ID', () => {
      const store = useCircuitStore.getState()

      const wire = store.addWire(
        { type: 'input', entityId: 'input-a' },
        { type: 'gate', entityId: 'not-1', pinId: 'in' },
        [],
        [],
        'sig-a'
      )

      store.removeWire(wire.id)

      const state = useCircuitStore.getState()
      expect(state.wires).toHaveLength(0)
    })
  })

  describe('updateWireSegments', () => {
    it('updates the segments of a wire', () => {
      const store = useCircuitStore.getState()

      const wire = store.addWire(
        { type: 'input', entityId: 'input-a' },
        { type: 'gate', entityId: 'not-1', pinId: 'in' },
        [],
        [],
        'sig-a'
      )

      const newSegments = [
        { start: { x: 0, y: 0.2, z: 0 }, end: { x: 8, y: 0.2, z: 0 }, type: 'horizontal' as const },
      ]

      store.updateWireSegments(wire.id, newSegments, ['wire-2'])

      const state = useCircuitStore.getState()
      const updated = state.wires.find(w => w.id === wire.id)
      expect(updated?.segments).toEqual(newSegments)
      expect(updated?.crossesWireIds).toEqual(['wire-2'])
    })
  })
})

describe('XOR Circuit Wiring Integration', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      inputNodes: [],
      outputNodes: [],
      junctions: [],
      wires: [],
      gates: [],
    })
  })

  it('creates complete XOR circuit topology with fan-out', () => {
    const store = useCircuitStore.getState()

    // Create input nodes
    const inputA = store.addInputNode('a', { x: 0, y: 0, z: 0 })
    const inputB = store.addInputNode('b', { x: 0, y: 0, z: 8 })

    // Create output node
    const output = store.addOutputNode('out', { x: 32, y: 0, z: 4 })

    // Create junctions for fan-out (input 'a' and 'b' each go to 2 gates)
    const junctionA = store.addJunction('sig-a', { x: 4, y: 0.2, z: 2 })
    const junctionB = store.addJunction('sig-b', { x: 4, y: 0.2, z: 6 })

    // Signal 'a': input -> junction -> (not-1, and-1)
    const wireATrunk = store.addWire(
      { type: 'input', entityId: inputA.id },
      { type: 'junction', entityId: junctionA.id },
      [],
      [],
      'sig-a'
    )
    const wireAToNot = store.addWire(
      { type: 'junction', entityId: junctionA.id },
      { type: 'gate', entityId: 'not-1', pinId: 'in' },
      [],
      [],
      'sig-a'
    )
    const wireAToAnd = store.addWire(
      { type: 'junction', entityId: junctionA.id },
      { type: 'gate', entityId: 'and-1', pinId: 'a' },
      [],
      [],
      'sig-a'
    )

    // Signal 'b': input -> junction -> (not-2, and-2)
    const wireBTrunk = store.addWire(
      { type: 'input', entityId: inputB.id },
      { type: 'junction', entityId: junctionB.id },
      [],
      [],
      'sig-b'
    )
    const wireBToNot = store.addWire(
      { type: 'junction', entityId: junctionB.id },
      { type: 'gate', entityId: 'not-2', pinId: 'in' },
      [],
      [],
      'sig-b'
    )
    const wireBToAnd = store.addWire(
      { type: 'junction', entityId: junctionB.id },
      { type: 'gate', entityId: 'and-2', pinId: 'b' },
      [],
      [],
      'sig-b'
    )

    // Internal signals (no fan-out)
    const wireNotAToAnd2 = store.addWire(
      { type: 'gate', entityId: 'not-1', pinId: 'out' },
      { type: 'gate', entityId: 'and-2', pinId: 'a' },
      [],
      [],
      'sig-notA'
    )
    const wireNotBToAnd1 = store.addWire(
      { type: 'gate', entityId: 'not-2', pinId: 'out' },
      { type: 'gate', entityId: 'and-1', pinId: 'b' },
      [],
      [],
      'sig-notB'
    )

    // And outputs to Or
    const wireAnd1ToOr = store.addWire(
      { type: 'gate', entityId: 'and-1', pinId: 'out' },
      { type: 'gate', entityId: 'or-1', pinId: 'a' },
      [],
      [],
      'sig-aAndNotB'
    )
    const wireAnd2ToOr = store.addWire(
      { type: 'gate', entityId: 'and-2', pinId: 'out' },
      { type: 'gate', entityId: 'or-1', pinId: 'b' },
      [],
      [],
      'sig-notAAndB'
    )

    // Or to output
    const wireOrToOut = store.addWire(
      { type: 'gate', entityId: 'or-1', pinId: 'out' },
      { type: 'output', entityId: output.id },
      [],
      [],
      'sig-out'
    )

    // Verify topology
    const state = useCircuitStore.getState()

    // 2 input nodes, 1 output node
    expect(state.inputNodes).toHaveLength(2)
    expect(state.outputNodes).toHaveLength(1)

    // 2 junctions (for fan-out)
    expect(state.junctions).toHaveLength(2)

    // Count wires by signal (fan-out creates multiple wires per signal)
    const sigAWires = state.wires.filter(w => w.signalId === 'sig-a')
    const sigBWires = state.wires.filter(w => w.signalId === 'sig-b')

    // sig-a has 3 wires: trunk + 2 branches
    expect(sigAWires).toHaveLength(3)
    // sig-b has 3 wires: trunk + 2 branches
    expect(sigBWires).toHaveLength(3)

    // Total wires: sig-a(3) + sig-b(3) + notA(1) + notB(1) + aAndNotB(1) + notAAndB(1) + out(1) = 11
    expect(state.wires).toHaveLength(11)

    // Verify all wires are defined
    expect(wireATrunk).toBeDefined()
    expect(wireAToNot).toBeDefined()
    expect(wireAToAnd).toBeDefined()
    expect(wireBTrunk).toBeDefined()
    expect(wireBToNot).toBeDefined()
    expect(wireBToAnd).toBeDefined()
    expect(wireNotAToAnd2).toBeDefined()
    expect(wireNotBToAnd1).toBeDefined()
    expect(wireAnd1ToOr).toBeDefined()
    expect(wireAnd2ToOr).toBeDefined()
    expect(wireOrToOut).toBeDefined()
  })
})

// ── #364 / #403: `removeJunction` deletes only the wires that would dangle ────────────────────────
//
// #364: `wireIds[0]` stood in for "the trunk", but that array is bookkeeping order, not structure —
// `slice(1)` on a branch-first junction deleted the trunk and kept a branch. #396 then chose the
// survivor by structure, which only worked where the document carries junction endpoints.
//
// #403 changed the contract. A wire is deleted only when its `from` or `to` IS the removed junction,
// because that endpoint would name an entity that no longer exists. Every wire with two real
// endpoints stays, whatever `wireIds` lists and in whatever order: in a document the live wiring
// gesture writes, trunk and branches all run from the source pin (`wiringActions.ts`,
// `const fromEndpoint = { ...originalWire.from }`), each is complete on its own, and "keep one,
// delete the rest" lost the user's wires whichever one it kept.
//
// The early tests below load documents whose branches start at the junction (the importer's shape,
// #377; no store action writes it). The gesture's own shape is pinned at the end of the block,
// through the real wiring actions.
describe('removeJunction — deletes only the wires that would dangle (#364, #403)', () => {
  const getState = () => useCircuitStore.getState()

  beforeEach(() => {
    useCircuitStore.setState({
      gates: [], wires: [], junctions: [], inputNodes: [], outputNodes: [],
      junctionPlacementMode: null, junctionPreviewPosition: null, junctionPreviewWireId: null,
    })
  })

  const wireIdsNow = () => getState().wires.map((w) => w.id)

  it('keeps the trunk when wireIds[0] genuinely is the trunk', () => {
    importDocument(fanOutDocument())
    expect(getState().junctions[0].wireIds).toEqual([FAN.trunk, FAN.branch1, FAN.branch2])

    getState().removeJunction(FAN.junction)

    expect(wireIdsNow()).toEqual([FAN.trunk])
    expect(getState().junctions).toHaveLength(0)
  })

  it('keeps the trunk when wireIds[0] is a branch', () => {
    importDocument(fanOutDocument([FAN.branch1, FAN.branch2, FAN.trunk]))

    getState().removeJunction(FAN.junction)

    // The surviving wire is the one that fed the junction — not `wireIds[0]`.
    expect(wireIdsNow()).toEqual([FAN.trunk])
  })

  // Both wires here are document shapes: a feed wire whose `to` IS the junction and a branch
  // whose `from` is. Serialization permits both and the importer (#377) will produce them; no store
  // action writes either.
  //
  // Was `keeps a feed wire that ends at the junction and is listed last`, asserting `[feed]`. The
  // kept feed's `to` then named a junction that no longer existed — #396's verifier flagged that
  // dangling reference as nit 3. Since #403 the policy for this endpoint is stated: a wire whose
  // `to` is the removed junction cannot stand alone, so it goes with it. Nothing with two real
  // endpoints is lost; the connection this junction carried in an imported document was already
  // lost before (the branch was deleted either way).
  it('removes a feed wire that ends at the junction: its `to` would dangle (#403)', () => {
    importDocument({
      gates: [gateRecord('g-source'), gateRecord('g-sink', { x: 4 * SECTION_SIZE, y: 0, z: 0 })],
      wires: [
        wireRecord('w-feed', pinOut('g-source'), { type: 'junction', entityId: 'j-feed' }),
        wireRecord('w-branch', { type: 'junction', entityId: 'j-feed' }, pinIn('g-sink')),
      ],
      junctions: [junctionRecord('j-feed', ['w-branch', 'w-feed'])],
    })

    getState().removeJunction('j-feed')

    expect(wireIdsNow()).toEqual([])
  })

  it('keeps the feed wire of a junction fed from another junction (a chain)', () => {
    const fanOut = fanOutDocument()
    // A second junction sits on branch1: its feed is a wire that STARTS at the first junction.
    importDocument({
      gates: [...fanOut.gates, gateRecord('g-chain-sink', { x: 6 * SECTION_SIZE, y: 0, z: 0 })],
      wires: [
        ...fanOut.wires,
        wireRecord('w-branch-3', { type: 'junction', entityId: 'j-chain' }, pinIn('g-chain-sink')),
      ],
      junctions: [
        ...fanOut.junctions,
        junctionRecord('j-chain', ['w-branch-3', FAN.branch1], { x: 3 * SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }),
      ],
    })

    getState().removeJunction('j-chain')

    // branch1 has no endpoint on the chained junction, so it survives; branch3 starts there, so it goes.
    expect(wireIdsNow()).toEqual([FAN.trunk, FAN.branch1, FAN.branch2])
    // The upstream junction keeps every wire it still owns.
    expect(getState().junctions.map((j) => j.id)).toEqual([FAN.junction])
    expect(getState().junctions[0].wireIds).toEqual([FAN.trunk, FAN.branch1, FAN.branch2])
  })

  it('removes every listed wire when the junction has no feed wire', () => {
    // Malformed document: the junction lists only wires that start at it — nothing feeds it.
    importDocument(fanOutDocument([FAN.branch1, FAN.branch2]))

    getState().removeJunction(FAN.junction)

    // Both listed wires start at the junction, so both would dangle and both go. The trunk the
    // junction no longer lists is untouched.
    expect(wireIdsNow()).toEqual([FAN.trunk])
    expect(getState().junctions).toHaveLength(0)
  })

  it('keeps the trunk after it is deleted and re-drawn (wireIds becomes branch-first)', () => {
    const fanOut = fanOutDocument()
    importDocument(fanOut)

    // `removeWire` splices the trunk out of `wireIds`; the junction survives on its two branches.
    getState().removeWire(FAN.trunk)
    expect(getState().junctions[0].wireIds).toEqual([FAN.branch1, FAN.branch2])

    // The gesture cannot draw from a junction whose listed wires all start at it, so the re-drawn
    // trunk comes in the saved document, appended last as `completeJunctionWiring` appends.
    const trunk2 = wireRecord('w-trunk-2', pinOut(FAN.source), pinIn(FAN.sink), zSegments())
    importDocument({
      gates: fanOut.gates,
      wires: [...getState().wires, trunk2],
      junctions: [junctionRecord(FAN.junction, [...getState().junctions[0].wireIds, trunk2.id])],
    })
    expect(getState().junctions[0].wireIds).toEqual([FAN.branch1, FAN.branch2, trunk2.id])

    getState().removeJunction(FAN.junction)

    expect(wireIdsNow()).toEqual([trunk2.id])
  })

  // ── The shape the live wiring gesture writes ─────────────────────────────────────────────────
  //
  // `completeJunctionWiring` copies the trunk's source into every branch (`wiringActions.ts:859`),
  // so a gesture-written junction lists wires that are structurally indistinguishable: same `from`
  // (the source pin), a destination pin on each `to`, and segments sharing the trunk's prefix up
  // to the junction. Each is a complete wire the user drew, so none may be deleted (#403).
  //
  // The same reproduction as the re-draw test, drawn by the gesture throughout.

  // THE #403 REPRODUCTION — updated, not deleted. Until #403 this was `gesture-shaped branches: two
  // user-drawn wires are still lost (known limit, #403)`, asserting survivors `[branch1]`: with
  // every listed wire sharing the source pin's `from`, `findJunctionFeedWire` fell back to the
  // first listed wire in creation order, and `trunk2` and `branch2` — both with two real endpoints
  // and complete segments — were deleted. `removeJunction` no longer picks a survivor at all.
  it('gesture-shaped branches: every user-drawn wire survives (#403 reproduction)', () => {
    const c = gestureFanOut(2)
    const [branch1, branch2] = c.branchIds

    getState().removeWire(c.trunkId)
    expect(getState().junctions[0].wireIds).toEqual([branch1, branch2])

    const trunk2 = drawBranch(c.junctionId, {
      to: { type: 'gate', gateId: c.trunkSink.id, pinId: c.trunkSink.inputs[0].id },
      tail: zSegments().slice(2),
    })
    expect(getState().junctions[0].wireIds).toEqual([branch1, branch2, trunk2])

    getState().removeJunction(c.junctionId)

    expect(wireIdsNow()).toEqual([branch1, branch2, trunk2])
    expect(getState().junctions).toHaveLength(0)
  })

  // Was `gesture-shaped branches: an undisturbed fan-out still keeps its trunk`, asserting `[trunk]`
  // and labelled "the case #403 must not regress". #396's verifier measured that it pinned the old
  // contract, not an invariant: the trunk still survives, and now so do both branches.
  it('gesture-shaped branches: an undisturbed fan-out keeps its trunk and both branches', () => {
    const c = gestureFanOut(2)

    getState().removeJunction(c.junctionId)

    expect(wireIdsNow()).toEqual([c.trunkId, ...c.branchIds])
  })

  // ── Through the real wiring gesture (#403) ───────────────────────────────────────────────────
  //
  // Nothing hand-written but the new tail's route, which `drawBranch` stores where the app's preview
  // hook does. The branch `from`, the shared prefix and the `wireIds` append all come from the action.

  /**
   * #403's measured sequence: `addWire(TRUNK) → placeJunctionOnWire → attach branch1, branch2 →
   * removeWire(TRUNK) → re-draw TRUNK'`, every step a real store action.
   */
  function buildGestureRedraw() {
    const source = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    const sinks = [
      getState().addGate('Nand', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE }),
      getState().addGate('Nand', { x: SECTION_SIZE, y: 0, z: -3 * SECTION_SIZE }),
      getState().addGate('Nand', { x: -SECTION_SIZE, y: 0, z: -SECTION_SIZE }),
    ]
    const [trunkSink, sink1, sink2] = sinks
    const trunk = getState().addWire(
      { type: 'gate', entityId: source.id, pinId: source.outputs[0].id },
      { type: 'gate', entityId: trunkSink.id, pinId: trunkSink.inputs[0].id },
      zSegments()
    )
    const junction = getState().placeJunctionOnWire(Z_CORNER, trunk.id)
    const toZ = { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -2 * SECTION_SIZE }
    const toX = { x: 0, y: WIRE_HEIGHT, z: -SECTION_SIZE }
    const toPin = (gate: typeof source) => ({ type: 'gate' as const, gateId: gate.id, pinId: gate.inputs[0].id })
    drawBranch(junction.id, { to: toPin(sink1), tail: [{ type: 'vertical', start: Z_CORNER, end: toZ }] })
    drawBranch(junction.id, { to: toPin(sink2), tail: [{ type: 'horizontal', start: Z_CORNER, end: toX }] })
    getState().removeWire(trunk.id)
    drawBranch(junction.id, { to: toPin(trunkSink), tail: zSegments().slice(2) })

    return { source, sinks, junction }
  }

  it('through the real gesture: the re-drawn trunk and both branches survive (#403)', () => {
    const c = buildGestureRedraw()
    const [branch1, branch2, trunk2] = getState().wires
    // The gesture's shape, measured rather than assumed: one junction listing three wires, all
    // from the source pin, none with an endpoint on the junction.
    expect(getState().junctions[0].wireIds).toEqual([branch1.id, branch2.id, trunk2.id])
    for (const w of [branch1, branch2, trunk2]) {
      expect(w.from).toEqual({ type: 'gate', entityId: c.source.id, pinId: c.source.outputs[0].id })
      expect(w.to.type).toBe('gate')
    }
    expect(trunk2.to.entityId).toBe(c.sinks[0].id)

    getState().removeJunction(c.junction.id)

    expect(wireIdsNow()).toEqual([branch1.id, branch2.id, trunk2.id])
    expect(getState().junctions).toHaveLength(0)
  })

  it('through the real gesture: every surviving wire still carries the signal (#403)', () => {
    const c = buildGestureRedraw()
    // NAND with both inputs undriven outputs 1 (B-008: an undriven pin reads 0).
    const sinkInputs = () =>
      c.sinks.map((s) => getState().gates.find((g) => g.id === s.id)?.inputs[0].value)

    getState().simulationTick()
    expect(sinkInputs()).toEqual([1, 1, 1])

    getState().removeJunction(c.junction.id)
    getState().simulationTick()

    expect(getState().lastSimulationError).toBeNull()
    expect(sinkInputs()).toEqual([1, 1, 1])
  })
})
