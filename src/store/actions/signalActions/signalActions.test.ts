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

    it('removes branch wires tracked in junction wireIds', () => {
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

      // Branch wires removed, original wire kept
      const state = useCircuitStore.getState()
      expect(state.wires).toHaveLength(1)
      expect(state.wires[0].id).toBe(originalWire.id)
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

      // branchWire removed, wire1 and unrelatedWire kept
      const state = useCircuitStore.getState()
      expect(state.wires).toHaveLength(2)
      expect(state.wires.map(w => w.id).sort()).toEqual([wire1.id, unrelatedWire.id].sort())
    })
  })

  describe('removeJunction - wire cleanup', () => {
    it('removes branch wires when junction is removed', () => {
      const store = useCircuitStore.getState()

      const wire1 = store.addWire(
        { type: 'input', entityId: 'input-a' },
        { type: 'gate', entityId: 'gate-1', pinId: 'in' },
        [],
        [],
        'sig-a'
      )
      const wire2 = store.addWire(
        { type: 'junction', entityId: 'j-placeholder' },
        { type: 'gate', entityId: 'gate-2', pinId: 'in' },
        [],
        [],
        'sig-a'
      )
      const wire3 = store.addWire(
        { type: 'junction', entityId: 'j-placeholder' },
        { type: 'gate', entityId: 'gate-3', pinId: 'in' },
        [],
        [],
        'sig-a'
      )

      const junction = store.addJunction('sig-a', { x: 4, y: 0.2, z: 4 })

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

// ── #364: `removeJunction` keeps the wire that FEEDS the junction, not `wireIds[0]` ────────────
//
// A junction sits *on* a trunk wire that keeps running to its own destination; branch wires exist
// only because of the junction, so removing the junction removes the branches and keeps the trunk.
// `wireIds[0]` stood in for "the trunk", but that array is bookkeeping order, not structure — and
// `slice(1)` on a branch-first junction deleted the trunk and kept a branch. That is data loss in
// the saved document, not a rendering artefact, which is why it outlived #364's geometry half.
//
// SCOPE — read before trusting a green run here.
// Every test in this block builds at least one wire whose `from` or `to` IS the junction, and that
// shape is what makes the rule structural: `findJunctionFeedWire` can only tell a trunk from a
// branch when the branch says "I start at the junction". Serialization permits that shape,
// `deserialize.ts` preserves it and the legacy importer (#377) will read documents carrying it —
// but no store action writes it. `completeJunctionWiring` copies the trunk's source into every
// branch (`wiringActions.ts`, `const fromEndpoint = { ...originalWire.from }`), so in a document
// the live wiring gesture writes, trunk and branches share one `from` and the rule has nothing to
// discriminate on. These tests therefore describe the IMPORTER's world, not the app's, and the
// hand-written endpoints below are load-bearing for every assertion here that turns on telling a
// trunk from a branch. The app's world is pinned at the end of this block, and still loses wires:
// see `gesture-shaped branches` and #403.
describe('removeJunction — the feed wire survives, not wireIds[0] (#364)', () => {
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
   * Two things here are hand-written, and both are load-bearing (see the SCOPE note above):
   *  - the two `wireIds` appends, standing in for `completeJunctionWiring`, which appends each new
   *    branch to `wireIds` (`wiringActions.ts:959`);
   *  - `from: { type: 'junction' }` on both branches — a shape serialization permits and no store
   *    action writes today (#365's verifier), which is why they are built with `addWire` rather
   *    than through the wiring gesture. Give the branches the gesture's `from` instead (the source
   *    pin, as `wiringActions.ts:859` does) and every assertion below that turns on telling a
   *    trunk from a branch stops holding — measured, and pinned by the last test in this block.
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
  // action writes either (see the SCOPE note). This is the one shape in which "which wire feeds
  // this junction" is a lookup rather than a guess — the document states it outright.
  it('keeps a feed wire that ends at the junction and is listed last', () => {
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

    expect(wireIdsNow()).toEqual([feed.id])
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

    // branch1 feeds junction2, so branch1 survives and branch3 goes.
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

    // Floating, exactly as the evaluator reads it (#356/#365): nothing is the trunk, so no listed
    // wire is kept. The trunk the junction no longer lists is untouched.
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
  // to the junction. The fixture above avoids that by giving branches a junction `from`.
  //
  // This is the same reproduction as the re-draw test, with the branches built the way the gesture
  // builds them and nothing else changed.
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

  // KNOWN LIMIT, pinned on purpose — this documents what the fix does NOT reach (#403).
  //
  // Written first as `expect(wireIdsNow()).toEqual([trunk2.id])` (the outcome the #364 fix aims
  // for) and run: it fails here, and it fails identically with `main`'s `wireIds.slice(1)` in
  // place. `topologicalEval.ts:49` ("a wire starting at the junction is a branch") is false for
  // every gesture-built branch, so `:50` falls back to the first LISTED wire in `state.wires`
  // order — and `state.wires` is strictly creation-ordered (every writer pushes at the end or
  // removes: `wireActions.ts:146/174`, the four `filter` rebuilds, `deserialize.ts:204`), so that
  // is the same wire `wireIds[0]` named. The positional read moved arrays; it did not go away.
  //
  // Two wires the user drew — `trunk2` and `branch2` — are deleted, and both have two real
  // endpoints and complete segments, so neither needed the junction to exist. That is the part of
  // B-009 this fix leaves standing. Carried by #403: UPDATE this test when #403 lands, do not
  // delete it — it is the reproduction.
  it('gesture-shaped branches: two user-drawn wires are still lost (known limit, #403)', () => {
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

    // What actually happens, on this branch and on `main` alike: the oldest listed wire survives.
    expect(wireIdsNow()).toEqual([c.branch1.id])
  })

  // The ordinary gesture-shaped fan-out — trunk never deleted — is unaffected, on both branches:
  // `placeJunctionOnWire` records the trunk first and nothing reorders `state.wires`, so the
  // positional read happens to be right. This is the case #403 must not regress.
  it('gesture-shaped branches: an undisturbed fan-out still keeps its trunk', () => {
    const c = buildGestureFanOut()

    getState().removeJunction(c.junction.id)

    expect(wireIdsNow()).toEqual([c.trunk.id])
  })
})
