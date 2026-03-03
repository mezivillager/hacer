/**
 * Junction Actions Tests
 *
 * Tests for junction management (signal branch points).
 * Note: Signal wire functionality is now part of unified wireActions.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'
import type { Position, WireEndpoint } from '../../types'

describe('Junction Actions', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useCircuitStore.setState({
      inputNodes: [],
      outputNodes: [],
      constantNodes: [],
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
      constantNodes: [],
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
      constantNodes: [],
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
