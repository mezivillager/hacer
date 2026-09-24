/**
 * Junction Actions Tests
 *
 * Tests for junction management (signal branch points).
 * Note: Signal wire functionality is now part of unified wireActions.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'
import type { Position, WireEndpoint } from '../../types'
import { SECTION_SIZE, WIRE_HEIGHT } from '@/utils/wiringScheme/types'
import type { WireSegment } from '@/utils/wiringScheme/types'

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

    // Was `removes branch wires tracked in junction wireIds`, asserting only `originalWire`
    // survived. All three wires run `input-a → gate-N`: two real endpoints each, the shape the
    // wiring gesture writes. Deleting two of them was the data loss #403 fixes, so the expectation
    // flips: listing a wire in `wireIds` is not a reason to delete it.
    it('keeps every tracked wire that has two real endpoints (#403)', () => {
      const store = useCircuitStore.getState()

      // Create original wire and two branch wires
      const originalWire = store.addWire(
        { type: 'input', entityId: 'input-a' },
        { type: 'gate', entityId: 'gate-1', pinId: 'in' },
        [],
        [],
        'sig-a'
      )
      const branchWire1 = store.addWire(
        { type: 'input', entityId: 'input-a' },
        { type: 'gate', entityId: 'gate-2', pinId: 'in' },
        [],
        [],
        'sig-a'
      )
      const branchWire2 = store.addWire(
        { type: 'input', entityId: 'input-a' },
        { type: 'gate', entityId: 'gate-3', pinId: 'in' },
        [],
        [],
        'sig-a'
      )

      // Create junction tracking all three wires (original + 2 branches)
      const junction = store.addJunction('sig-a', { x: 4, y: 0.2, z: 4 })
      useCircuitStore.setState((state) => {
        const j = state.junctions.find((j) => j.id === junction.id)
        if (j) j.wireIds = [originalWire.id, branchWire1.id, branchWire2.id]
      })

      expect(useCircuitStore.getState().wires).toHaveLength(3)

      store.removeJunction(junction.id)

      // No wire needed the junction to exist, so every wire stays; only the junction goes.
      const state = useCircuitStore.getState()
      expect(state.wires.map((w) => w.id)).toEqual([originalWire.id, branchWire1.id, branchWire2.id])
      expect(state.junctions).toHaveLength(0)
    })

    it('does not remove unrelated wires when removing junction', () => {
      const store = useCircuitStore.getState()

      // Create wires for two different junctions
      const wire1 = store.addWire(
        { type: 'input', entityId: 'input-a' },
        { type: 'gate', entityId: 'gate-1', pinId: 'in' },
        [],
        [],
        'sig-a'
      )
      const branchWire = store.addWire(
        { type: 'input', entityId: 'input-a' },
        { type: 'gate', entityId: 'gate-2', pinId: 'in' },
        [],
        [],
        'sig-a'
      )
      const unrelatedWire = store.addWire(
        { type: 'input', entityId: 'input-b' },
        { type: 'gate', entityId: 'gate-3', pinId: 'in' },
        [],
        [],
        'sig-b'
      )

      // Junction1 tracks wire1 (original) and branchWire
      const junction1 = store.addJunction('sig-a', { x: 4, y: 0.2, z: 4 })
      useCircuitStore.setState((state) => {
        const j = state.junctions.find((j) => j.id === junction1.id)
        if (j) j.wireIds = [wire1.id, branchWire.id]
      })

      expect(useCircuitStore.getState().wires).toHaveLength(3)

      store.removeJunction(junction1.id)

      // The unrelated wire is untouched, as before. `branchWire` used to be deleted too; it runs
      // `input-a → gate-2` with two real endpoints, so since #403 it stays as well.
      const state = useCircuitStore.getState()
      expect(state.wires).toHaveLength(3)
      expect(state.wires.map(w => w.id).sort()).toEqual([wire1.id, branchWire.id, unrelatedWire.id].sort())
    })
  })

  describe('removeJunction - wire cleanup', () => {
    // Expectation unchanged; the fixture is corrected. wire2/wire3 used to start at
    // 'j-placeholder', a junction that never existed, and were deleted only because `wireIds`
    // listed them. Since #403 a wire is deleted because its endpoint IS the removed junction, so
    // the branches now start at the real one — the importer's shape; no store action writes it.
    it('removes branch wires when junction is removed', () => {
      const store = useCircuitStore.getState()
      const junction = store.addJunction('sig-a', { x: 4, y: 0.2, z: 4 })

      const wire1 = store.addWire(
        { type: 'input', entityId: 'input-a' },
        { type: 'gate', entityId: 'gate-1', pinId: 'in' },
        [],
        [],
        'sig-a'
      )
      const wire2 = store.addWire(
        { type: 'junction', entityId: junction.id },
        { type: 'gate', entityId: 'gate-2', pinId: 'in' },
        [],
        [],
        'sig-a'
      )
      const wire3 = store.addWire(
        { type: 'junction', entityId: junction.id },
        { type: 'gate', entityId: 'gate-3', pinId: 'in' },
        [],
        [],
        'sig-a'
      )

      // Set wireIds: [original, branch1, branch2]
      useCircuitStore.setState((state) => {
        const j = state.junctions.find((j) => j.id === junction.id)
        if (j) j.wireIds = [wire1.id, wire2.id, wire3.id]
      })

      expect(useCircuitStore.getState().wires).toHaveLength(3)

      store.removeJunction(junction.id)

      const state = useCircuitStore.getState()
      // wire2 and wire3 (branch wires) removed, wire1 (original) remains
      expect(state.wires).toHaveLength(1)
      expect(state.wires[0].id).toBe(wire1.id)
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
// The early tests below hand-write junction endpoints (the importer's shape, #377; no store action
// writes it). The gesture's own shape is pinned at the end of the block, once with hand-appended
// `wireIds` (#396's reproduction) and once through the real wiring actions.
describe('removeJunction — deletes only the wires that would dangle (#364, #403)', () => {
  const getState = () => useCircuitStore.getState()

  /** Z-shaped wire with a real perpendicular corner, so `placeJunctionOnWire` accepts it. */
  function zSegments(): WireSegment[] {
    return [
      { type: 'exit', start: { x: 0.7, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 } },
      { type: 'vertical', start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: 0 }, end: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE } },
      { type: 'horizontal', start: { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }, end: { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE } },
      { type: 'entry', start: { x: 2 * SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }, end: { x: 2 * SECTION_SIZE + 0.7, y: WIRE_HEIGHT, z: -SECTION_SIZE } },
    ]
  }

  /** The corner where the vertical segment meets the horizontal one. */
  const CORNER = { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -SECTION_SIZE }

  beforeEach(() => {
    useCircuitStore.setState({
      gates: [], wires: [], junctions: [], inputNodes: [], outputNodes: [],
      junctionPlacementMode: null, junctionPreviewPosition: null, junctionPreviewWireId: null,
    })
  })

  /**
   * `source → sink` trunk with a junction placed on it by the real action, then two branch wires.
   *
   * Two things here are hand-written:
   *  - the two `wireIds` appends, standing in for `completeJunctionWiring`, which appends each new
   *    branch to `wireIds` (`wiringActions.ts:959`);
   *  - `from: { type: 'junction' }` on both branches — a shape serialization permits and no store
   *    action writes today (#365's verifier), which is why they are built with `addWire` rather
   *    than through the wiring gesture. That endpoint is why these branches are deleted: with the
   *    gesture's `from` (the source pin, `wiringActions.ts:859`) they are complete wires and stay —
   *    see the gesture-shaped tests at the end of this block.
   */
  function buildFanOut() {
    const source = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    const sink = getState().addGate('Nand', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })
    const branchSink1 = getState().addGate('Nand', { x: 4 * SECTION_SIZE, y: 0, z: 0 })
    const branchSink2 = getState().addGate('Nand', { x: 4 * SECTION_SIZE, y: 0, z: 4 })

    const trunk = getState().addWire(
      { type: 'gate', entityId: source.id, pinId: source.outputs[0].id },
      { type: 'gate', entityId: sink.id, pinId: sink.inputs[0].id },
      zSegments()
    )
    const junction = getState().placeJunctionOnWire(CORNER, trunk.id)
    const branch1 = getState().addWire(
      { type: 'junction', entityId: junction.id },
      { type: 'gate', entityId: branchSink1.id, pinId: branchSink1.inputs[0].id },
      []
    )
    const branch2 = getState().addWire(
      { type: 'junction', entityId: junction.id },
      { type: 'gate', entityId: branchSink2.id, pinId: branchSink2.inputs[0].id },
      []
    )
    attachWires(junction.id, [branch1.id, branch2.id])

    return { source, sink, junction, trunk, branch1, branch2 }
  }

  /** Append wire ids to a junction, the way `completeJunctionWiring` does. */
  function attachWires(junctionId: string, wireIds: string[]) {
    useCircuitStore.setState((state) => {
      const j = state.junctions.find((x) => x.id === junctionId)
      if (!j) return
      for (const id of wireIds) if (!j.wireIds.includes(id)) j.wireIds.push(id)
    })
  }

  /**
   * Overwrite a junction's `wireIds` outright — NO store action does this. Every real writer is
   * order-preserving: `placeJunctionOnWire` seeds `[wireId]` (`junctionPlacementActions.ts:228`),
   * `completeJunctionWiring` appends, `removeWire` splices, `removeJunction` filters, and
   * `deserialize.ts:217` keeps the saved order. It is used here only to reach a list order in one
   * step that the gesture reaches in several, so a test can state the ordering it is about.
   * The one test that reaches its ordering through the real actions is the re-draw case below.
   */
  function setWireIds(junctionId: string, wireIds: string[]) {
    useCircuitStore.setState((state) => {
      const j = state.junctions.find((x) => x.id === junctionId)
      if (j) j.wireIds = wireIds
    })
  }

  const wireIdsNow = () => getState().wires.map((w) => w.id)

  it('keeps the trunk when wireIds[0] genuinely is the trunk', () => {
    const c = buildFanOut()
    expect(getState().junctions[0].wireIds).toEqual([c.trunk.id, c.branch1.id, c.branch2.id])

    getState().removeJunction(c.junction.id)

    expect(wireIdsNow()).toEqual([c.trunk.id])
    expect(getState().junctions).toHaveLength(0)
  })

  it('keeps the trunk when wireIds[0] is a branch', () => {
    const c = buildFanOut()
    setWireIds(c.junction.id, [c.branch1.id, c.branch2.id, c.trunk.id])

    getState().removeJunction(c.junction.id)

    // The surviving wire is the one that fed the junction — not `wireIds[0]`.
    expect(wireIdsNow()).toEqual([c.trunk.id])
  })

  // Both wires here are hand-written shapes: a feed wire whose `to` IS the junction and a branch
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
    const source = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    const sink = getState().addGate('Nand', { x: 4 * SECTION_SIZE, y: 0, z: 0 })
    const junction = getState().addJunction('sig-a', CORNER)

    const feed = getState().addWire(
      { type: 'gate', entityId: source.id, pinId: source.outputs[0].id },
      { type: 'junction', entityId: junction.id },
      []
    )
    const branch = getState().addWire(
      { type: 'junction', entityId: junction.id },
      { type: 'gate', entityId: sink.id, pinId: sink.inputs[0].id },
      []
    )
    setWireIds(junction.id, [branch.id, feed.id])

    getState().removeJunction(junction.id)

    expect(wireIdsNow()).toEqual([])
  })

  it('keeps the feed wire of a junction fed from another junction (a chain)', () => {
    const c = buildFanOut()
    // A second junction sits on branch1: its feed is a wire that STARTS at the first junction.
    const chainSink = getState().addGate('Nand', { x: 6 * SECTION_SIZE, y: 0, z: 0 })
    const junction2 = getState().addJunction(c.junction.signalId, { x: 3 * SECTION_SIZE, y: WIRE_HEIGHT, z: 0 })
    const branch3 = getState().addWire(
      { type: 'junction', entityId: junction2.id },
      { type: 'gate', entityId: chainSink.id, pinId: chainSink.inputs[0].id },
      []
    )
    setWireIds(junction2.id, [branch3.id, c.branch1.id])

    getState().removeJunction(junction2.id)

    // branch1 has no endpoint on junction2, so it survives; branch3 starts there, so it goes.
    expect(wireIdsNow()).toEqual([c.trunk.id, c.branch1.id, c.branch2.id])
    // The upstream junction keeps every wire it still owns.
    expect(getState().junctions.map((j) => j.id)).toEqual([c.junction.id])
    expect(getState().junctions[0].wireIds).toEqual([c.trunk.id, c.branch1.id, c.branch2.id])
  })

  it('removes every listed wire when the junction has no feed wire', () => {
    const c = buildFanOut()
    // Malformed document: the junction lists only wires that start at it — nothing feeds it.
    setWireIds(c.junction.id, [c.branch1.id, c.branch2.id])

    getState().removeJunction(c.junction.id)

    // Both listed wires start at the junction, so both would dangle and both go. The trunk the
    // junction no longer lists is untouched.
    expect(wireIdsNow()).toEqual([c.trunk.id])
    expect(getState().junctions).toHaveLength(0)
  })

  it('keeps the trunk after it is deleted and re-drawn (wireIds becomes branch-first)', () => {
    const c = buildFanOut()

    // `removeWire` splices the trunk out of `wireIds`; the junction survives on its two branches.
    getState().removeWire(c.trunk.id)
    expect(getState().junctions[0].wireIds).toEqual([c.branch1.id, c.branch2.id])

    // Re-drawing the wire and re-attaching it appends it *last*, as `completeJunctionWiring` does.
    const trunk2 = getState().addWire(
      { type: 'gate', entityId: c.source.id, pinId: c.source.outputs[0].id },
      { type: 'gate', entityId: c.sink.id, pinId: c.sink.inputs[0].id },
      zSegments()
    )
    attachWires(c.junction.id, [trunk2.id])
    expect(getState().junctions[0].wireIds).toEqual([c.branch1.id, c.branch2.id, trunk2.id])

    getState().removeJunction(c.junction.id)

    expect(wireIdsNow()).toEqual([trunk2.id])
  })

  // ── The shape the live wiring gesture writes ─────────────────────────────────────────────────
  //
  // `completeJunctionWiring` copies the trunk's source into every branch (`wiringActions.ts:859`),
  // so a gesture-written junction lists wires that are structurally indistinguishable: same `from`
  // (the source pin), a destination pin on each `to`, and segments sharing the trunk's prefix up
  // to the junction. Each is a complete wire the user drew, so none may be deleted (#403).
  //
  // This is the same reproduction as the re-draw test, with the branches built the way the gesture
  // builds them and nothing else changed. The last two tests drive the gesture itself.
  function buildGestureFanOut() {
    const source = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    const sink = getState().addGate('Nand', { x: 2 * SECTION_SIZE, y: 0, z: -SECTION_SIZE })
    const branchSink1 = getState().addGate('Nand', { x: 4 * SECTION_SIZE, y: 0, z: 0 })
    const branchSink2 = getState().addGate('Nand', { x: 4 * SECTION_SIZE, y: 0, z: 4 })
    // The gesture's source endpoint: `{ ...originalWire.from }`, i.e. the trunk's own source pin.
    const fromSource: WireEndpoint = { type: 'gate', entityId: source.id, pinId: source.outputs[0].id }

    const trunk = getState().addWire(
      fromSource,
      { type: 'gate', entityId: sink.id, pinId: sink.inputs[0].id },
      zSegments()
    )
    const junction = getState().placeJunctionOnWire(CORNER, trunk.id)
    const branch1 = getState().addWire(
      fromSource,
      { type: 'gate', entityId: branchSink1.id, pinId: branchSink1.inputs[0].id },
      []
    )
    const branch2 = getState().addWire(
      fromSource,
      { type: 'gate', entityId: branchSink2.id, pinId: branchSink2.inputs[0].id },
      []
    )
    attachWires(junction.id, [branch1.id, branch2.id])

    return { source, sink, junction, trunk, branch1, branch2, fromSource }
  }

  // THE #403 REPRODUCTION — updated, not deleted. Until #403 this was `gesture-shaped branches: two
  // user-drawn wires are still lost (known limit, #403)`, asserting survivors `[branch1]`: with
  // every listed wire sharing the source pin's `from`, `findJunctionFeedWire` fell back to the
  // first listed wire in creation order, and `trunk2` and `branch2` — both with two real endpoints
  // and complete segments — were deleted. `removeJunction` no longer picks a survivor at all.
  it('gesture-shaped branches: every user-drawn wire survives (#403 reproduction)', () => {
    const c = buildGestureFanOut()

    getState().removeWire(c.trunk.id)
    expect(getState().junctions[0].wireIds).toEqual([c.branch1.id, c.branch2.id])

    const trunk2 = getState().addWire(
      c.fromSource,
      { type: 'gate', entityId: c.sink.id, pinId: c.sink.inputs[0].id },
      zSegments()
    )
    attachWires(c.junction.id, [trunk2.id])
    expect(getState().junctions[0].wireIds).toEqual([c.branch1.id, c.branch2.id, trunk2.id])

    getState().removeJunction(c.junction.id)

    expect(wireIdsNow()).toEqual([c.branch1.id, c.branch2.id, trunk2.id])
    expect(getState().junctions).toHaveLength(0)
  })

  // Was `gesture-shaped branches: an undisturbed fan-out still keeps its trunk`, asserting `[trunk]`
  // and labelled "the case #403 must not regress". #396's verifier measured that it pinned the old
  // contract, not an invariant: the trunk still survives, and now so do both branches.
  it('gesture-shaped branches: an undisturbed fan-out keeps its trunk and both branches', () => {
    const c = buildGestureFanOut()

    getState().removeJunction(c.junction.id)

    expect(wireIdsNow()).toEqual([c.trunk.id, c.branch1.id, c.branch2.id])
  })

  // ── Through the real wiring gesture (#403) ───────────────────────────────────────────────────
  //
  // Nothing hand-written but the new tail's route: the app's preview hook computes it
  // asynchronously, so it is set on `wiringFrom.segments` as `wireActions.test.ts` does. The branch
  // `from`, the shared prefix and the `wireIds` append all come from `completeWiringFromJunction`.
  function drawFromJunction(junctionId: string, sinkId: string, sinkPinId: string, tail: WireSegment[]) {
    getState().startWiringFromJunction(junctionId, CORNER)
    useCircuitStore.setState((state) => {
      if (state.wiringFrom) state.wiringFrom.segments = tail
    })
    getState().completeWiringFromJunction(sinkId, sinkPinId, 'input')
  }

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
    const junction = getState().placeJunctionOnWire(CORNER, trunk.id)
    const toZ = { x: SECTION_SIZE, y: WIRE_HEIGHT, z: -2 * SECTION_SIZE }
    const toX = { x: 0, y: WIRE_HEIGHT, z: -SECTION_SIZE }
    drawFromJunction(junction.id, sink1.id, sink1.inputs[0].id, [{ type: 'vertical', start: CORNER, end: toZ }])
    drawFromJunction(junction.id, sink2.id, sink2.inputs[0].id, [{ type: 'horizontal', start: CORNER, end: toX }])
    getState().removeWire(trunk.id)
    drawFromJunction(junction.id, trunkSink.id, trunkSink.inputs[0].id, zSegments().slice(2))

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
