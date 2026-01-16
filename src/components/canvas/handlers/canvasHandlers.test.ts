/**
 * Canvas Handlers Tests
 *
 * Tests for canvas interaction handlers including node click handling.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import {
  handleNodeClick,
  handleInputNodeToggle,
  handleGateClick,
  handleNodePinClick,
  handlePinClick,
} from './canvasHandlers'

// Helper to get store state
const getState = () => useCircuitStore.getState()

describe('Canvas Handlers', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCircuitStore.setState({
      gates: [],
      wires: [],
      selectedGateId: null,
      selectedWireId: null,
      wiringFrom: null,
      inputNodes: [],
      outputNodes: [],
      constantNodes: [],
      selectedNodeId: null,
      selectedNodeType: null,
    })
  })

  describe('handleNodeClick', () => {
    it('selects a node when not wiring', () => {
      handleNodeClick('node-1', 'input')

      expect(getState().selectedNodeId).toBe('node-1')
      expect(getState().selectedNodeType).toBe('input')
    })

    it('selects output nodes', () => {
      handleNodeClick('out-1', 'output')

      expect(getState().selectedNodeId).toBe('out-1')
      expect(getState().selectedNodeType).toBe('output')
    })

    it('selects constant nodes', () => {
      handleNodeClick('const-1', 'constant')

      expect(getState().selectedNodeId).toBe('const-1')
      expect(getState().selectedNodeType).toBe('constant')
    })

    it('does not select when wiring is active', () => {
      // Set up wiring state
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
      getState().startWiring(gate.id, gate.outputs[0].id, 'output', { x: 0.5, y: 0.2, z: 0 })

      handleNodeClick('node-1', 'input')

      expect(getState().selectedNodeId).toBe(null)
    })

    it('clears gate selection when selecting a node', () => {
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
      getState().selectGate(gate.id)
      expect(getState().selectedGateId).toBe(gate.id)

      handleNodeClick('node-1', 'input')

      expect(getState().selectedGateId).toBe(null)
      expect(getState().selectedNodeId).toBe('node-1')
    })
  })

  describe('handleInputNodeToggle', () => {
    it('toggles input node value from false to true', () => {
      const node = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
      expect(node.value).toBe(false)

      handleInputNodeToggle(node.id)

      const updated = getState().inputNodes.find(n => n.id === node.id)
      expect(updated?.value).toBe(true)
    })

    it('toggles input node value from true to false', () => {
      const node = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
      getState().updateInputNodeValue(node.id, true)

      handleInputNodeToggle(node.id)

      const updated = getState().inputNodes.find(n => n.id === node.id)
      expect(updated?.value).toBe(false)
    })

    it('does nothing for non-existent node', () => {
      handleInputNodeToggle('non-existent')

      // Should not throw, just do nothing
      expect(getState().inputNodes).toHaveLength(0)
    })
  })

  describe('handleGateClick', () => {
    it('selects a gate when not wiring', () => {
      const gate = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })

      handleGateClick(gate.id)

      expect(getState().selectedGateId).toBe(gate.id)
    })

    it('does not select when wiring is active', () => {
      const gate1 = getState().addGate('NAND', { x: 2, y: 0.2, z: 2 })
      const gate2 = getState().addGate('AND', { x: 6, y: 0.2, z: 2 })
      getState().startWiring(gate1.id, gate1.outputs[0].id, 'output', { x: 0.5, y: 0.2, z: 0 })

      handleGateClick(gate2.id)

      expect(getState().selectedGateId).toBe(null)
    })
  })

  describe('handleNodePinClick', () => {
    it('starts wiring from input node pin', () => {
      const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })

      handleNodePinClick(inputNode.id, 'input', { x: 0.5, y: 0.2, z: 0 })

      const wiringFrom = getState().wiringFrom
      expect(wiringFrom).not.toBe(null)
      expect(wiringFrom?.source?.type).toBe('input')
      expect(wiringFrom?.source?.nodeId).toBe(inputNode.id)
    })

    it('starts wiring from constant node pin', () => {
      const constNode = getState().addConstantNode(true, { x: 0, y: 0, z: 0 })

      handleNodePinClick(constNode.id, 'constant', { x: 0.5, y: 0.2, z: 0 })

      const wiringFrom = getState().wiringFrom
      expect(wiringFrom).not.toBe(null)
      expect(wiringFrom?.source?.type).toBe('constant')
    })

    it('does not start wiring from output node pin', () => {
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

      handleNodePinClick(outputNode.id, 'output', { x: 7.5, y: 0.2, z: 0 })

      // Output nodes cannot be wire sources
      expect(getState().wiringFrom).toBe(null)
    })

    it('completes wiring to output node pin', () => {
      const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

      // Start wiring from input node
      handleNodePinClick(inputNode.id, 'input', { x: 0.5, y: 0.2, z: 0 })
      expect(getState().wiringFrom).not.toBe(null)

      // Set segments (normally done by WirePreview)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 0.5, y: 0.2, z: 0 }, end: { x: 7.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })

      // Complete wiring to output node
      handleNodePinClick(outputNode.id, 'output', { x: 7.5, y: 0.2, z: 0 })

      expect(getState().wiringFrom).toBe(null)
      expect(getState().wires).toHaveLength(1)
    })

    it('does not complete wiring to input node pin', () => {
      const inputNode1 = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
      const inputNode2 = getState().addInputNode('b', { x: 0, y: 0, z: 4 })

      // Start wiring from input node
      handleNodePinClick(inputNode1.id, 'input', { x: 0.5, y: 0.2, z: 0 })
      expect(getState().wiringFrom).not.toBe(null)

      // Try to complete wiring to another input node - should not work
      handleNodePinClick(inputNode2.id, 'input', { x: 0.5, y: 0.2, z: 4 })

      // Wiring should still be active (not completed)
      expect(getState().wiringFrom).not.toBe(null)
      expect(getState().wires).toHaveLength(0)
    })

    it('completes wiring from gate output to output node pin', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

      // Start wiring from gate output pin
      handlePinClick(gate.id, gate.outputs[0].id, 'output', { x: 0.7, y: 0.2, z: 0 })
      expect(getState().wiringFrom).not.toBe(null)

      // Set segments (normally done by WirePreview)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 0.7, y: 0.2, z: 0 }, end: { x: 7.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })

      // Complete wiring to output node pin
      handleNodePinClick(outputNode.id, 'output', { x: 7.5, y: 0.2, z: 0 })

      expect(getState().wiringFrom).toBe(null)
      expect(getState().wires).toHaveLength(1)
      const wire = getState().wires[0]
      expect(wire.from.type).toBe('gate')
      expect(wire.from.entityId).toBe(gate.id)
      expect(wire.from.pinId).toBe(gate.outputs[0].id)
      expect(wire.to.type).toBe('output')
      expect(wire.to.entityId).toBe(outputNode.id)
    })
  })
})
