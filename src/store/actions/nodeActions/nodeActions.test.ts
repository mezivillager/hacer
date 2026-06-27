/**
 * Node Actions Tests
 *
 * Tests for input/output node management actions.
 * These nodes are essential for HDL-style circuits with chip-level I/O.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'
import type { Position } from '../../types'
import { calculateWirePath } from '@/utils/wiringScheme/core'
import { calculateNodePinPosition } from '@/nodes/config'

describe('Node Actions', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useCircuitStore.setState({
      inputNodes: [],
      outputNodes: [],
      junctions: [],
      wires: [],
      gates: [],
      selectedNodeId: null,
      selectedNodeType: null,
    })
  })

  describe('addInputNode', () => {
    it('creates an input node with the given name and position', () => {
      const position: Position = { x: 0, y: 0, z: 0 }
      const store = useCircuitStore.getState()

      const node = store.addInputNode('a', position)

      expect(node.id).toBeDefined()
      expect(node.name).toBe('a')
      expect(node.position).toEqual(position)
      expect(node.value).toBe(1)
      expect(node.width).toBe(1)
    })

    it('creates a bus input node with specified width', () => {
      const position: Position = { x: 0, y: 0, z: 4 }
      const store = useCircuitStore.getState()

      const node = store.addInputNode('data', position, 16)

      expect(node.width).toBe(16)
    })

    it('adds the node to the store state', () => {
      const position: Position = { x: 0, y: 0, z: 0 }
      const store = useCircuitStore.getState()

      store.addInputNode('a', position)
      store.addInputNode('b', { x: 0, y: 0, z: 4 })

      const state = useCircuitStore.getState()
      expect(state.inputNodes).toHaveLength(2)
      expect(state.inputNodes[0].name).toBe('a')
      expect(state.inputNodes[1].name).toBe('b')
    })
  })

  describe('addOutputNode', () => {
    it('creates an output node with the given name and position', () => {
      const position: Position = { x: 32, y: 0, z: 4 }
      const store = useCircuitStore.getState()

      const node = store.addOutputNode('out', position)

      expect(node.id).toBeDefined()
      expect(node.name).toBe('out')
      expect(node.position).toEqual(position)
      expect(node.value).toBe(0)
    })

    it('adds the node to the store state', () => {
      const store = useCircuitStore.getState()

      store.addOutputNode('out', { x: 32, y: 0, z: 4 })

      const state = useCircuitStore.getState()
      expect(state.outputNodes).toHaveLength(1)
      expect(state.outputNodes[0].name).toBe('out')
    })
  })

  describe('removeInputNode', () => {
    it('removes an input node by ID', () => {
      const store = useCircuitStore.getState()
      const node = store.addInputNode('a', { x: 0, y: 0, z: 0 })

      store.removeInputNode(node.id)

      const state = useCircuitStore.getState()
      expect(state.inputNodes).toHaveLength(0)
    })

    it('does nothing if node ID does not exist', () => {
      const store = useCircuitStore.getState()
      store.addInputNode('a', { x: 0, y: 0, z: 0 })

      store.removeInputNode('non-existent-id')

      const state = useCircuitStore.getState()
      expect(state.inputNodes).toHaveLength(1)
    })

    it('clears selection if the removed node was selected', () => {
      const store = useCircuitStore.getState()
      const node = store.addInputNode('a', { x: 0, y: 0, z: 0 })

      // Select the node
      useCircuitStore.setState({ selectedNodeId: node.id, selectedNodeType: 'input' })

      store.removeInputNode(node.id)

      const state = useCircuitStore.getState()
      expect(state.selectedNodeId).toBe(null)
      expect(state.selectedNodeType).toBe(null)
    })

    it('does not clear selection if a different node was selected', () => {
      const store = useCircuitStore.getState()
      const node1 = store.addInputNode('a', { x: 0, y: 0, z: 0 })
      const node2 = store.addInputNode('b', { x: 4, y: 0, z: 0 })

      // Select node2
      useCircuitStore.setState({ selectedNodeId: node2.id, selectedNodeType: 'input' })

      store.removeInputNode(node1.id)

      const state = useCircuitStore.getState()
      expect(state.selectedNodeId).toBe(node2.id)
      expect(state.selectedNodeType).toBe('input')
    })

    it('removes wires connected to the deleted input node', () => {
      const store = useCircuitStore.getState()
      const inputNode = store.addInputNode('a', { x: 0, y: 0, z: 0 })
      const gate = store.addGate('Not', { x: 4, y: 0.2, z: 0 })

      // Create wire from input to gate
      store.addWire(
        { type: 'input', entityId: inputNode.id },
        { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
        [],
        [],
        'sig-a'
      )

      expect(useCircuitStore.getState().wires).toHaveLength(1)

      store.removeInputNode(inputNode.id)

      const state = useCircuitStore.getState()
      expect(state.wires).toHaveLength(0)
    })

    it('does not remove unrelated wires when removing input node', () => {
      const store = useCircuitStore.getState()
      const inputNode1 = store.addInputNode('a', { x: 0, y: 0, z: 0 })
      const inputNode2 = store.addInputNode('b', { x: 0, y: 0, z: 4 })
      const gate = store.addGate('And', { x: 4, y: 0.2, z: 0 })

      // Create wires from both inputs
      store.addWire(
        { type: 'input', entityId: inputNode1.id },
        { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
        [],
        [],
        'sig-a'
      )
      store.addWire(
        { type: 'input', entityId: inputNode2.id },
        { type: 'gate', entityId: gate.id, pinId: gate.inputs[1].id },
        [],
        [],
        'sig-b'
      )

      expect(useCircuitStore.getState().wires).toHaveLength(2)

      store.removeInputNode(inputNode1.id)

      const state = useCircuitStore.getState()
      expect(state.wires).toHaveLength(1)
      expect(state.wires[0].from.entityId).toBe(inputNode2.id)
    })
  })

  describe('removeOutputNode', () => {
    it('removes an output node by ID', () => {
      const store = useCircuitStore.getState()
      const node = store.addOutputNode('out', { x: 32, y: 0, z: 4 })

      store.removeOutputNode(node.id)

      const state = useCircuitStore.getState()
      expect(state.outputNodes).toHaveLength(0)
    })

    it('clears selection if the removed node was selected', () => {
      const store = useCircuitStore.getState()
      const node = store.addOutputNode('out', { x: 32, y: 0, z: 4 })

      useCircuitStore.setState({ selectedNodeId: node.id, selectedNodeType: 'output' })

      store.removeOutputNode(node.id)

      const state = useCircuitStore.getState()
      expect(state.selectedNodeId).toBe(null)
      expect(state.selectedNodeType).toBe(null)
    })

    it('removes wires connected to the deleted output node', () => {
      const store = useCircuitStore.getState()
      const gate = store.addGate('Not', { x: 0, y: 0.2, z: 0 })
      const outputNode = store.addOutputNode('out', { x: 4, y: 0, z: 0 })

      // Create wire from gate to output
      store.addWire(
        { type: 'gate', entityId: gate.id, pinId: gate.outputs[0].id },
        { type: 'output', entityId: outputNode.id },
        [],
        [],
        'sig-out'
      )

      expect(useCircuitStore.getState().wires).toHaveLength(1)

      store.removeOutputNode(outputNode.id)

      const state = useCircuitStore.getState()
      expect(state.wires).toHaveLength(0)
    })
  })

  describe('updateInputNodeValue', () => {
    it('updates the value of an input node', () => {
      const store = useCircuitStore.getState()
      const node = store.addInputNode('a', { x: 0, y: 0, z: 0 })

      store.updateInputNodeValue(node.id, 0)

      const state = useCircuitStore.getState()
      const updated = state.inputNodes.find(n => n.id === node.id)
      expect(updated?.value).toBe(0)
    })
  })

  describe('updateInputNodePosition', () => {
    it('updates the position of an input node', () => {
      const store = useCircuitStore.getState()
      const node = store.addInputNode('a', { x: 0, y: 0, z: 0 })

      const newPosition: Position = { x: 4, y: 0, z: 4 }
      store.updateInputNodePosition(node.id, newPosition)

      const state = useCircuitStore.getState()
      const updated = state.inputNodes.find(n => n.id === node.id)
      expect(updated?.position).toEqual(newPosition)
    })
  })

  describe('updateOutputNodePosition', () => {
    it('updates the position of an output node', () => {
      const store = useCircuitStore.getState()
      const node = store.addOutputNode('out', { x: 32, y: 0, z: 4 })

      const newPosition: Position = { x: 36, y: 0, z: 8 }
      store.updateOutputNodePosition(node.id, newPosition)

      const state = useCircuitStore.getState()
      const updated = state.outputNodes.find(n => n.id === node.id)
      expect(updated?.position).toEqual(newPosition)
    })
  })

  describe('renameInputNode', () => {
    it('renames an input node', () => {
      const store = useCircuitStore.getState()
      const node = store.addInputNode('in0', { x: 0, y: 0, z: 0 })

      store.renameInputNode(node.id, 'a')

      const updated = useCircuitStore.getState().inputNodes.find((n) => n.id === node.id)
      expect(updated?.name).toBe('a')
    })

    it('trims whitespace before applying the name', () => {
      const store = useCircuitStore.getState()
      const node = store.addInputNode('in0', { x: 0, y: 0, z: 0 })

      store.renameInputNode(node.id, '  sel  ')

      const updated = useCircuitStore.getState().inputNodes.find((n) => n.id === node.id)
      expect(updated?.name).toBe('sel')
    })

    it('rejects empty names', () => {
      const store = useCircuitStore.getState()
      const node = store.addInputNode('in0', { x: 0, y: 0, z: 0 })

      store.renameInputNode(node.id, '   ')

      const updated = useCircuitStore.getState().inputNodes.find((n) => n.id === node.id)
      expect(updated?.name).toBe('in0')
    })

    it('rejects invalid HDL identifier format', () => {
      const store = useCircuitStore.getState()
      const node = store.addInputNode('in0', { x: 0, y: 0, z: 0 })

      store.renameInputNode(node.id, 'bad-name')

      const updated = useCircuitStore.getState().inputNodes.find((n) => n.id === node.id)
      expect(updated?.name).toBe('in0')
    })

    it('rejects case-insensitive duplicate names within input nodes', () => {
      const store = useCircuitStore.getState()
      const first = store.addInputNode('a', { x: 0, y: 0, z: 0 })
      store.addInputNode('sel', { x: 0, y: 0, z: 4 })

      store.renameInputNode(first.id, 'SeL')

      const updated = useCircuitStore.getState().inputNodes.find((n) => n.id === first.id)
      expect(updated?.name).toBe('a')
    })

    it('allows case-only change for the current node name', () => {
      const store = useCircuitStore.getState()
      const node = store.addInputNode('sel', { x: 0, y: 0, z: 0 })

      store.renameInputNode(node.id, 'SEL')

      const updated = useCircuitStore.getState().inputNodes.find((n) => n.id === node.id)
      expect(updated?.name).toBe('SEL')
    })

    it('is a no-op when node does not exist', () => {
      const store = useCircuitStore.getState()
      store.addInputNode('in0', { x: 0, y: 0, z: 0 })

      store.renameInputNode('missing-node', 'x')

      expect(useCircuitStore.getState().inputNodes).toHaveLength(1)
      expect(useCircuitStore.getState().inputNodes[0]?.name).toBe('in0')
    })
  })

  describe('renameOutputNode', () => {
    it('renames an output node', () => {
      const store = useCircuitStore.getState()
      const node = store.addOutputNode('out0', { x: 8, y: 0, z: 0 })

      store.renameOutputNode(node.id, 'out')

      const updated = useCircuitStore.getState().outputNodes.find((n) => n.id === node.id)
      expect(updated?.name).toBe('out')
    })

    it('rejects case-insensitive duplicate names within output nodes', () => {
      const store = useCircuitStore.getState()
      const first = store.addOutputNode('out0', { x: 8, y: 0, z: 0 })
      store.addOutputNode('result', { x: 10, y: 0, z: 0 })

      store.renameOutputNode(first.id, 'RESULT')

      const updated = useCircuitStore.getState().outputNodes.find((n) => n.id === first.id)
      expect(updated?.name).toBe('out0')
    })

    it('rejects invalid HDL identifier format', () => {
      const store = useCircuitStore.getState()
      const node = store.addOutputNode('out0', { x: 8, y: 0, z: 0 })

      store.renameOutputNode(node.id, '1output')

      const updated = useCircuitStore.getState().outputNodes.find((n) => n.id === node.id)
      expect(updated?.name).toBe('out0')
    })
  })

  describe('updateInputNodeWidth', () => {
    it('changes the width of an existing input node', () => {
      const store = useCircuitStore.getState()
      const node = store.addInputNode('in', { x: 0, y: 0, z: 0 }, 1)

      store.updateInputNodeWidth(node.id, 4)

      const updated = useCircuitStore.getState().inputNodes.find((n) => n.id === node.id)
      expect(updated?.width).toBe(4)
    })

    it('is a no-op when the node id is unknown', () => {
      const store = useCircuitStore.getState()
      const before = useCircuitStore.getState().inputNodes.length

      store.updateInputNodeWidth('does-not-exist', 8)

      expect(useCircuitStore.getState().inputNodes.length).toBe(before)
    })

    it('does not mutate other nodes', () => {
      const store = useCircuitStore.getState()
      const a = store.addInputNode('a', { x: 0, y: 0, z: 0 }, 1)
      const b = store.addInputNode('b', { x: 1, y: 0, z: 0 }, 1)

      store.updateInputNodeWidth(a.id, 4)

      const bAfter = useCircuitStore.getState().inputNodes.find((n) => n.id === b.id)
      expect(bAfter?.width).toBe(1)
    })
  })

  describe('updateOutputNodeWidth', () => {
    it('changes the width of an existing output node', () => {
      const store = useCircuitStore.getState()
      const node = store.addOutputNode('out', { x: 0, y: 0, z: 0 }, 1)

      store.updateOutputNodeWidth(node.id, 8)

      const updated = useCircuitStore.getState().outputNodes.find((n) => n.id === node.id)
      expect(updated?.width).toBe(8)
    })

    it('is a no-op when the node id is unknown', () => {
      const store = useCircuitStore.getState()
      const before = useCircuitStore.getState().outputNodes.length

      store.updateOutputNodeWidth('does-not-exist', 8)

      expect(useCircuitStore.getState().outputNodes.length).toBe(before)
    })
  })

  describe('updateInputNodeWidth — width cascade', () => {
    it('propagates new width to a directly-connected wire and the gate at the other end', () => {
      const store = useCircuitStore.getState()
      const inNode = store.addInputNode('in', { x: 0, y: 0, z: 0 }, 1)
      const not = store.addGate('Not', { x: 4, y: 0, z: 0 })
      store.addWire(
        { type: 'input', entityId: inNode.id },
        { type: 'gate', entityId: not.id, pinId: not.inputs[0].id },
        []
      )

      store.updateInputNodeWidth(inNode.id, 4)

      const after = useCircuitStore.getState()
      expect(after.inputNodes.find((n) => n.id === inNode.id)?.width).toBe(4)
      const gateAfter = after.gates.find((g) => g.id === not.id)
      expect(gateAfter?.width).toBe(4)
      expect(gateAfter?.inputs.every((p) => p.width === 4)).toBe(true)
      expect(gateAfter?.outputs.every((p) => p.width === 4)).toBe(true)
      const wireAfter = after.wires[0]
      expect(wireAfter?.width).toBe(4)
    })

    it('cascades width across the whole connected component (input → NOT → output)', () => {
      const store = useCircuitStore.getState()
      const inNode = store.addInputNode('in', { x: 0, y: 0, z: 0 }, 1)
      const not = store.addGate('Not', { x: 4, y: 0, z: 0 })
      const outNode = store.addOutputNode('out', { x: 8, y: 0, z: 0 }, 1)
      store.addWire(
        { type: 'input', entityId: inNode.id },
        { type: 'gate', entityId: not.id, pinId: not.inputs[0].id },
        []
      )
      store.addWire(
        { type: 'gate', entityId: not.id, pinId: not.outputs[0].id },
        { type: 'output', entityId: outNode.id },
        []
      )

      store.updateInputNodeWidth(inNode.id, 4)

      const after = useCircuitStore.getState()
      expect(after.inputNodes.find((n) => n.id === inNode.id)?.width).toBe(4)
      expect(after.gates.find((g) => g.id === not.id)?.width).toBe(4)
      expect(after.outputNodes.find((n) => n.id === outNode.id)?.width).toBe(4)
      for (const wire of after.wires) {
        expect(wire.width).toBe(4)
      }
    })

    it('does NOT touch entities in a disconnected component', () => {
      const store = useCircuitStore.getState()
      const a = store.addInputNode('a', { x: 0, y: 0, z: 0 }, 1)
      const notA = store.addGate('Not', { x: 4, y: 0, z: 0 })
      store.addWire(
        { type: 'input', entityId: a.id },
        { type: 'gate', entityId: notA.id, pinId: notA.inputs[0].id },
        []
      )
      // Separate, unconnected circuit
      const b = store.addInputNode('b', { x: 0, y: 0, z: 4 }, 1)
      const notB = store.addGate('Not', { x: 4, y: 0, z: 4 })
      store.addWire(
        { type: 'input', entityId: b.id },
        { type: 'gate', entityId: notB.id, pinId: notB.inputs[0].id },
        []
      )

      store.updateInputNodeWidth(a.id, 4)

      const after = useCircuitStore.getState()
      expect(after.inputNodes.find((n) => n.id === b.id)?.width).toBe(1)
      expect(after.gates.find((g) => g.id === notB.id)?.width).toBe(1)
    })

    // PR #107 review feedback (Copilot). The width cascade was added in
    // P05-13 to push a node-width change across the wire graph so that
    // homogeneous primitives (Not, And, …) widen along with the input node
    // and the simulation engine stops clamping signals to width 1. With
    // the chip registry, mixed-width chips (Mux16, Mux4Way16, Or8Way, …)
    // carry per-pin widths from the chip definition; bulk-rewriting them
    // to a single width would silently corrupt the chip schema (e.g. set
    // Mux16.sel.width=16 when the user widens an input node feeding
    // Mux16.a). Cascade must respect the declared per-pin schema.
    it('does not clobber Mux16 sel.width=1 during width cascade', () => {
      const store = useCircuitStore.getState()
      const wide = store.addInputNode('data', { x: 0, y: 0, z: 0 }, 1)
      const mux = store.addGate('Mux16', { x: 4, y: 0, z: 0 })
      store.addWire(
        { type: 'input', entityId: wide.id },
        { type: 'gate', entityId: mux.id, pinId: mux.inputs[0].id },
        []
      )

      // User opts in to widening the input node to 16-bit. The cascade
      // should NOT rewrite Mux16.sel from 1 to 16.
      store.updateInputNodeWidth(wide.id, 16)

      const after = useCircuitStore.getState().gates.find((g) => g.id === mux.id)!
      const widthByName = Object.fromEntries(
        after.inputs.map((p) => [p.name, p.width])
      )
      expect(widthByName.sel).toBe(1)
    })
  })

  describe('updateOutputNodeWidth — width cascade', () => {
    it('cascades width backwards through the connected component', () => {
      const store = useCircuitStore.getState()
      const inNode = store.addInputNode('in', { x: 0, y: 0, z: 0 }, 1)
      const not = store.addGate('Not', { x: 4, y: 0, z: 0 })
      const outNode = store.addOutputNode('out', { x: 8, y: 0, z: 0 }, 1)
      store.addWire(
        { type: 'input', entityId: inNode.id },
        { type: 'gate', entityId: not.id, pinId: not.inputs[0].id },
        []
      )
      store.addWire(
        { type: 'gate', entityId: not.id, pinId: not.outputs[0].id },
        { type: 'output', entityId: outNode.id },
        []
      )

      store.updateOutputNodeWidth(outNode.id, 8)

      const after = useCircuitStore.getState()
      expect(after.outputNodes.find((n) => n.id === outNode.id)?.width).toBe(8)
      expect(after.gates.find((g) => g.id === not.id)?.width).toBe(8)
      expect(after.inputNodes.find((n) => n.id === inNode.id)?.width).toBe(8)
    })
  })

  // B-003: dragging an input node wired to an INNER pin of a dense multi-input
  // chip used to drop the wire — the re-route threw and the catch silently left
  // stale/orphaned segments. With the Stage-1 routing fix the re-route succeeds,
  // and even on a genuine failure the wire's segments must be preserved.
  describe('updateInputNodePosition — preserves wires to multi-input chips (B-003)', () => {
    function wireInputToPin(
      nodeName: string,
      nodePos: Position,
      chipName: string,
      gatePos: Position,
      pinIndex: number,
    ) {
      const store = useCircuitStore.getState()
      const node = store.addInputNode(nodeName, nodePos)
      const gate = store.addGate(chipName, gatePos)
      const pin = gate.inputs[pinIndex]

      // Compute the node→pin path the same way the live wiring flow does.
      const pinOffset = calculateNodePinPosition('input')
      const nodePinPos: Position = {
        x: nodePos.x + pinOffset.x,
        y: 0.2,
        z: nodePos.z + pinOffset.z,
      }
      const s = useCircuitStore.getState()
      const gatePinPos = s.getPinWorldPosition(gate.id, pin.id)!
      const gatePinOri = s.getPinOrientation(gate.id, pin.id)!
      const path = calculateWirePath(
        nodePinPos,
        { type: 'pin', pin: gatePinPos, orientation: { direction: gatePinOri } },
        { direction: { x: 1, y: 0, z: 0 } },
        s.gates,
        {},
      )
      store.addWire(
        { type: 'input', entityId: node.id },
        { type: 'gate', entityId: gate.id, pinId: pin.id },
        path.segments,
      )
      return { node, gate, pin }
    }

    it('keeps and re-routes the wire when dragging a node wired to a Mux4Way16 inner pin', () => {
      // Inner pin (index 2 = "c") is the one the old router could not reach.
      const { node } = wireInputToPin('a', { x: -8, y: 0, z: 0 }, 'Mux4Way16', { x: 0, y: 0, z: 0 }, 2)

      const before = useCircuitStore.getState().wires
      expect(before).toHaveLength(1)
      const wireId = before[0].id

      store_updateInputNodePosition(node.id, { x: -8, y: 0, z: 4 })

      const after = useCircuitStore.getState().wires
      // Wire must still exist and still carry a non-empty segment path.
      const wire = after.find((w) => w.id === wireId)
      expect(wire).toBeDefined()
      expect(wire!.segments.length).toBeGreaterThan(0)
    })

    it('preserves prior segments if a re-route somehow fails (no orphaning)', () => {
      const { node } = wireInputToPin('a', { x: -8, y: 0, z: 0 }, 'Mux4Way16', { x: 0, y: 0, z: 0 }, 3)

      const wireBefore = useCircuitStore.getState().wires[0]
      const wireId = wireBefore.id
      expect(wireBefore.segments.length).toBeGreaterThan(0)

      store_updateInputNodePosition(node.id, { x: -4, y: 0, z: 0 })

      const wireAfter = useCircuitStore.getState().wires.find((w) => w.id === wireId)
      expect(wireAfter).toBeDefined()
      // Never left with zero segments (orphaned).
      expect(wireAfter!.segments.length).toBeGreaterThan(0)
    })
  })
})

// M3: node↔bus re-route when the NODE moves (bus endpoint must be resolved)
describe('recalculateWiresForNode — bus endpoint (M3)', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      inputNodes: [],
      outputNodes: [],
      junctions: [],
      wires: [],
      gates: [],
      busComponents: [],
      selectedNodeId: null,
      selectedNodeType: null,
    })
  })

  it('re-routes a node→bus wire (non-empty) when the input node moves', () => {
    const inputNode = useCircuitStore.getState().addInputNode('a', { x: 0, y: 0, z: 0 }, 4)
    const splitter = useCircuitStore.getState().placeBusSplitter(4, { x: 6, y: 0, z: 0 })!
    const busPinPos = useCircuitStore.getState().getPinWorldPosition(splitter.id, 'in')!

    // Add a wire from the input node to the bus splitter's 'in' pin
    useCircuitStore.getState().addWire(
      { type: 'input', entityId: inputNode.id },
      { type: 'bus', entityId: splitter.id, pinId: 'in' },
      [{ start: { x: 0.35, y: 0.2, z: 0 }, end: { x: busPinPos.x, y: 0.2, z: busPinPos.z }, type: 'horizontal' }],
    )

    const before = JSON.stringify(useCircuitStore.getState().wires[0].segments)

    // Move the input node to trigger re-route
    useCircuitStore.getState().updateInputNodePosition(inputNode.id, { x: 0, y: 0, z: 4 })

    const after = useCircuitStore.getState().wires[0].segments
    expect(after.length).toBeGreaterThan(0)
    expect(JSON.stringify(after)).not.toBe(before)
  })
})

// Helper to call the store action by name (keeps the test readable).
function store_updateInputNodePosition(nodeId: string, position: Position) {
  useCircuitStore.getState().updateInputNodePosition(nodeId, position)
}
