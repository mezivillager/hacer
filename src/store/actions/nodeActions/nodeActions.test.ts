/**
 * Node Actions Tests
 *
 * Tests for input/output node management actions.
 * These nodes are essential for HDL-style circuits with chip-level I/O.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '../../circuitStore'
import type { Position } from '../../types'

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
      expect(node.value).toBe(0)
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
      const gate = store.addGate('NOT', { x: 4, y: 0.2, z: 0 })

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
      const gate = store.addGate('AND', { x: 4, y: 0.2, z: 0 })

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
      const gate = store.addGate('NOT', { x: 0, y: 0.2, z: 0 })
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
})
