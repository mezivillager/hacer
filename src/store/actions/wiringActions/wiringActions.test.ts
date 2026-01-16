import { describe, it, expect, beforeEach, vi } from 'vitest'
import { message } from 'antd'
import { useCircuitStore } from '../../circuitStore'

// Helper to get store state
const getState = () => useCircuitStore.getState()

// Mock Ant Design message
vi.mock('antd', () => ({
  message: {
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('wiringActions', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCircuitStore.setState({
      gates: [],
      wires: [],
      selectedGateId: null,
      simulationRunning: false,
      simulationSpeed: 100,
      placementMode: null,
      wiringFrom: null,
      // Node state fields
      inputNodes: [],
      outputNodes: [],
      constantNodes: [],
      junctions: [],
      nodePlacementMode: null,
      selectedNodeId: null,
      selectedNodeType: null,
    })
    vi.clearAllMocks()
  })

  describe('startWiring', () => {
    it('sets wiringFrom state', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })

      getState().startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )

      const wiringFrom = getState().wiringFrom
      expect(wiringFrom).not.toBe(null)
      expect(wiringFrom?.fromGateId).toBe(gate.id)
      expect(wiringFrom?.fromPinId).toBe(gate.outputs[0].id)
      expect(wiringFrom?.fromPinType).toBe('output')
      expect(wiringFrom?.fromPosition).toEqual({ x: 0.7, y: 0, z: 0 })
      expect(wiringFrom?.previewEndPosition).toBe(null)
      expect(wiringFrom?.destinationGateId).toBe(null)
      expect(wiringFrom?.destinationPinId).toBe(null)
      expect(wiringFrom?.segments).toBe(null)
      // Unified wiring also includes source info
      expect(wiringFrom?.source).toEqual({
        type: 'gate',
        gateId: gate.id,
        pinId: gate.outputs[0].id,
        pinType: 'output',
      })
    })

    it('clears placement mode', () => {
      useCircuitStore.setState({ placementMode: 'NAND' })
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })

      getState().startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )

      expect(getState().placementMode).toBe(null)
    })
  })

  describe('updateWirePreviewPosition', () => {
    it('updates preview position when wiring is active', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )

      getState().updateWirePreviewPosition({ x: 1, y: 2, z: 3 })

      expect(getState().wiringFrom?.previewEndPosition).toEqual({ x: 1, y: 2, z: 3 })
    })

    it('does nothing if wiring is not active', () => {
      getState().updateWirePreviewPosition({ x: 1, y: 2, z: 3 })

      expect(getState().wiringFrom).toBe(null)
    })
  })

  describe('cancelWiring', () => {
    it('clears wiringFrom state', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      getState().startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )

      getState().cancelWiring()

      expect(getState().wiringFrom).toBe(null)
    })
  })

  describe('completeWiring', () => {
    it('creates wire when connecting output to input', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })

      getState().startWiring(
        gate1.id, gate1.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      // Set segments (normally done by WirePreview)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' },
          ]
        }
      })
      getState().completeWiring(gate2.id, gate2.inputs[0].id, 'input')

      expect(getState().wires).toHaveLength(1)
      expect(getState().wires[0].from.entityId).toBe(gate1.id)
      expect(getState().wires[0].to.entityId).toBe(gate2.id)
      expect(getState().wiringFrom).toBe(null)
    })

    it('rejects connection between same pin types', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })

      getState().startWiring(
        gate1.id, gate1.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      getState().completeWiring(gate2.id, gate2.outputs[0].id, 'output')

      expect(getState().wires).toHaveLength(0)
      expect(message.warning).toHaveBeenCalledWith('Cannot connect same pin types')
      expect(getState().wiringFrom).toBe(null)
    })

    it('rejects connection to same gate', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })

      getState().startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      getState().completeWiring(gate.id, gate.inputs[0].id, 'input')

      expect(getState().wires).toHaveLength(0)
      expect(message.warning).toHaveBeenCalledWith('Cannot connect gate to itself')
      expect(getState().wiringFrom).toBe(null)
    })

    it('rejects duplicate wire', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })

      // Create first wire
      getState().startWiring(
        gate1.id, gate1.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      // Set segments (normally done by WirePreview)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' },
          ]
        }
      })
      getState().completeWiring(gate2.id, gate2.inputs[0].id, 'input')
      expect(getState().wires).toHaveLength(1)

      // Try to create duplicate
      getState().startWiring(
        gate1.id, gate1.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      // Set segments for duplicate attempt
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' },
          ]
        }
      })
      getState().completeWiring(gate2.id, gate2.inputs[0].id, 'input')

      expect(getState().wires).toHaveLength(1)
      expect(message.warning).toHaveBeenCalledWith('Wire already exists')
    })

    it('normalizes wire direction (input to output)', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })

      getState().startWiring(
        gate1.id, gate1.inputs[0].id, 'input',
        { x: -0.7, y: 0, z: 0 }
      )
      // Set segments (normally done by WirePreview)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 0, z: 0 }, type: 'horizontal' },
          ]
        }
      })
      getState().completeWiring(gate2.id, gate2.outputs[0].id, 'output')

      expect(getState().wires).toHaveLength(1)
      // Should be normalized to output -> input
      expect(getState().wires[0].from.entityId).toBe(gate2.id)
      expect(getState().wires[0].to.entityId).toBe(gate1.id)
    })

    it('shows warning message when no wiringFrom state', () => {
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })

      getState().completeWiring(gate2.id, gate2.inputs[0].id, 'input')

      expect(getState().wires).toHaveLength(0)
      expect(message.warning).toHaveBeenCalledWith('No active wiring operation')
    })

    it('resolves crossings by adding arc segments', () => {
      const WIRE_HEIGHT = 0.2
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 4, y: 0, z: 0 })
      const gate3 = getState().addGate('NAND', { x: 2, y: 0, z: 4 })

      // Create first wire (horizontal at z=4, crossing point at x=4)
      getState().startWiring(
        gate1.id, gate1.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            {
              start: { x: 0, y: WIRE_HEIGHT, z: 4 },
              end: { x: 8, y: WIRE_HEIGHT, z: 4 },
              type: 'horizontal',
            },
          ]
        }
      })
      getState().completeWiring(gate2.id, gate2.inputs[0].id, 'input')
      expect(getState().wires).toHaveLength(1)

      // Create second wire (vertical at x=4, should cross first wire)
      getState().startWiring(
        gate3.id, gate3.outputs[0].id, 'output',
        { x: 2.7, y: 0, z: 4 }
      )
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            {
              start: { x: 4, y: WIRE_HEIGHT, z: 0 },
              end: { x: 4, y: WIRE_HEIGHT, z: 8 },
              type: 'vertical',
            },
          ]
        }
      })
      getState().completeWiring(gate2.id, gate2.inputs[0].id, 'input')

      expect(getState().wires).toHaveLength(2)
      // Second wire should have arc segments
      const secondWire = getState().wires[1]
      const hasArcSegment = secondWire.segments.some((s) => s.type === 'arc')
      expect(hasArcSegment).toBe(true)
    })

    it('handles very short segments gracefully by skipping arc creation', () => {
      const gate1 = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('NAND', { x: 2, y: 0, z: 0 })

      // Create first wire
      getState().startWiring(
        gate1.id, gate1.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 0, y: 0.2, z: 4 }, end: { x: 8, y: 0.2, z: 4 }, type: 'horizontal' },
          ]
        }
      })
      getState().completeWiring(gate2.id, gate2.inputs[0].id, 'input')
      expect(getState().wires).toHaveLength(1)

      // Create second wire with very short segment - arc creation is skipped but wire is still created
      getState().startWiring(
        gate2.id, gate2.outputs[0].id, 'output',
        { x: 2.7, y: 0, z: 0 }
      )
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          // Very short segment that crosses - arc is skipped but wire is created
          state.wiringFrom.segments = [
            { start: { x: 4, y: 0.2, z: 3.99 }, end: { x: 4, y: 0.2, z: 4.01 }, type: 'vertical' },
          ]
        }
      })
      getState().completeWiring(gate1.id, gate1.inputs[0].id, 'input')

      // Wire should be created (arc is skipped for short segments)
      expect(getState().wires).toHaveLength(2)
      // The second wire should have no arc (too short)
      const secondWire = getState().wires[1]
      const hasArc = secondWire.segments.some((s) => s.type === 'arc')
      expect(hasArc).toBe(false)
    })
  })

  describe('startWiringFromNode', () => {
    it('sets wiringFrom state with node source', () => {
      getState().startWiringFromNode('input-a', 'input', { x: 0.5, y: 0.2, z: 0 })

      const wiringFrom = getState().wiringFrom
      expect(wiringFrom).not.toBe(null)
      expect(wiringFrom?.source?.type).toBe('input')
      expect(wiringFrom?.source?.nodeId).toBe('input-a')
    })

    it('sets wiringFrom state for constant node', () => {
      getState().startWiringFromNode('const-1', 'constant', { x: 0.5, y: 0.2, z: 0 })

      const wiringFrom = getState().wiringFrom
      expect(wiringFrom).not.toBe(null)
      expect(wiringFrom?.source?.type).toBe('constant')
    })

    it('rejects output nodes as wire sources', () => {
      getState().startWiringFromNode('output-out', 'output', { x: 0, y: 0, z: 0 })

      expect(getState().wiringFrom).toBe(null)
      expect(message.warning).toHaveBeenCalledWith('Can only start wiring from input or constant nodes')
    })

    it('clears placement modes', () => {
      useCircuitStore.setState({ placementMode: 'NAND', nodePlacementMode: 'INPUT' })

      getState().startWiringFromNode('input-a', 'input', { x: 0, y: 0, z: 0 })

      expect(getState().placementMode).toBe(null)
      expect(getState().nodePlacementMode).toBe(null)
    })
  })

  describe('completeWiringToNode', () => {
    it('rejects non-output nodes as destinations', () => {
      // Start wiring from input
      getState().startWiringFromNode('input-a', 'input', { x: 0, y: 0, z: 0 })

      getState().completeWiringToNode('input-b', 'input')

      expect(message.warning).toHaveBeenCalledWith('Can only complete wiring to output nodes')
    })

    it('clears wiring state after completion to output', () => {
      getState().startWiringFromNode('input-a', 'input', { x: 0, y: 0, z: 0 })

      getState().completeWiringToNode('output-out', 'output')

      expect(getState().wiringFrom).toBe(null)
    })

    it('shows warning when no wiringFrom state', () => {
      getState().completeWiringToNode('output-out', 'output')

      expect(message.warning).toHaveBeenCalledWith('No active wiring operation')
    })

    it('creates signal wire from input node to output node', () => {
      // Create actual nodes in store
      const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

      // Start wiring from input node
      getState().startWiringFromNode(inputNode.id, 'input', { x: 0.5, y: 0.2, z: 0 })

      // Set wire segments (normally done by WirePreview)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 0.5, y: 0.2, z: 0 }, end: { x: 7.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })

      // Complete wiring to output node
      getState().completeWiringToNode(outputNode.id, 'output')

      // Verify wire was created (using unified wire system)
      const wires = getState().wires
      expect(wires).toHaveLength(1)
      expect(wires[0].from.type).toBe('input')
      expect(wires[0].from.entityId).toBe(inputNode.id)
      expect(wires[0].to.type).toBe('output')
      expect(wires[0].to.entityId).toBe(outputNode.id)
    })

    it('creates signal wire from constant node to output node', () => {
      const constNode = getState().addConstantNode(true, { x: 0, y: 0, z: 0 })
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

      getState().startWiringFromNode(constNode.id, 'constant', { x: 0.5, y: 0.2, z: 0 })

      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 0.5, y: 0.2, z: 0 }, end: { x: 7.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })

      getState().completeWiringToNode(outputNode.id, 'output')

      const wires = getState().wires
      expect(wires).toHaveLength(1)
      expect(wires[0].from.type).toBe('constant')
      expect(wires[0].from.entityId).toBe(constNode.id)
    })

    it('uses segments from wiringFrom state', () => {
      const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 })
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 4 })

      getState().startWiringFromNode(inputNode.id, 'input', { x: 0.5, y: 0.2, z: 0 })

      const testSegments = [
        { start: { x: 0.5, y: 0.2, z: 0 }, end: { x: 4, y: 0.2, z: 0 }, type: 'horizontal' as const },
        { start: { x: 4, y: 0.2, z: 0 }, end: { x: 4, y: 0.2, z: 4 }, type: 'vertical' as const },
        { start: { x: 4, y: 0.2, z: 4 }, end: { x: 7.5, y: 0.2, z: 4 }, type: 'horizontal' as const },
      ]

      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = testSegments
        }
      })

      getState().completeWiringToNode(outputNode.id, 'output')

      const wires = getState().wires
      expect(wires[0].segments).toEqual(testSegments)
    })

    it('warns when source info is missing', () => {
      // Manually create invalid wiringFrom state without source
      useCircuitStore.setState({
        wiringFrom: {
          fromGateId: '',
          fromPinId: '',
          fromPinType: 'output',
          fromPosition: { x: 0, y: 0, z: 0 },
          previewEndPosition: null,
          destinationGateId: null,
          destinationPinId: null,
          segments: null,
          // source is undefined
        },
      })

      getState().completeWiringToNode('output-out', 'output')

      expect(message.warning).toHaveBeenCalledWith('Invalid wiring source')
    })
  })

  describe('setDestinationNode', () => {
    it('sets destination node when wiring is active', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

      // Start wiring from gate
      getState().startWiring(gate.id, gate.outputs[0].id, 'output', { x: 0.7, y: 0, z: 0 })

      // Set destination node
      getState().setDestinationNode(outputNode.id, 'output')

      const wiringFrom = getState().wiringFrom
      expect(wiringFrom?.destinationNodeId).toBe(outputNode.id)
      expect(wiringFrom?.destinationNodeType).toBe('output')
      // Gate destination should be cleared
      expect(wiringFrom?.destinationGateId).toBe(null)
      expect(wiringFrom?.destinationPinId).toBe(null)
    })

    it('clears destination node when set to null', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

      getState().startWiring(gate.id, gate.outputs[0].id, 'output', { x: 0.7, y: 0, z: 0 })
      getState().setDestinationNode(outputNode.id, 'output')

      // Clear destination
      getState().setDestinationNode(null, null)

      const wiringFrom = getState().wiringFrom
      expect(wiringFrom?.destinationNodeId).toBe(null)
      expect(wiringFrom?.destinationNodeType).toBe(null)
    })

    it('clears segments when destination changes', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const outputNode1 = getState().addOutputNode('out1', { x: 8, y: 0, z: 0 })
      const outputNode2 = getState().addOutputNode('out2', { x: 10, y: 0, z: 0 })

      getState().startWiring(gate.id, gate.outputs[0].id, 'output', { x: 0.7, y: 0, z: 0 })

      // Set segments
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 0.7, y: 0.2, z: 0 }, end: { x: 7.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })

      // Change destination - segments should be cleared
      getState().setDestinationNode(outputNode1.id, 'output')
      expect(getState().wiringFrom?.segments).toBe(null)

      getState().setDestinationNode(outputNode2.id, 'output')
      expect(getState().wiringFrom?.segments).toBe(null)
    })

    it('does nothing when wiring is not active', () => {
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

      // No wiring active
      getState().setDestinationNode(outputNode.id, 'output')

      // Should not crash, but wiringFrom should be null
      expect(getState().wiringFrom).toBe(null)
    })
  })

  describe('completeWiringToNode with gate source', () => {
    it('creates wire from gate output to output node', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

      // Start wiring from gate output
      getState().startWiring(gate.id, gate.outputs[0].id, 'output', { x: 0.7, y: 0, z: 0 })

      // Set segments (normally done by WirePreview)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 0.7, y: 0.2, z: 0 }, end: { x: 7.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })

      // Complete wiring to output node
      getState().completeWiringToNode(outputNode.id, 'output')

      const wires = getState().wires
      expect(wires).toHaveLength(1)
      expect(wires[0].from.type).toBe('gate')
      expect(wires[0].from.entityId).toBe(gate.id)
      expect(wires[0].from.pinId).toBe(gate.outputs[0].id)
      expect(wires[0].to.type).toBe('output')
      expect(wires[0].to.entityId).toBe(outputNode.id)
      expect(getState().wiringFrom).toBe(null)
    })

    it('prevents duplicate wires from same gate output to same output node', () => {
      const gate = getState().addGate('NAND', { x: 0, y: 0, z: 0 })
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

      // Create first wire
      getState().startWiring(gate.id, gate.outputs[0].id, 'output', { x: 0.7, y: 0, z: 0 })
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 0.7, y: 0.2, z: 0 }, end: { x: 7.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })
      getState().completeWiringToNode(outputNode.id, 'output')

      // Try to create duplicate
      getState().startWiring(gate.id, gate.outputs[0].id, 'output', { x: 0.7, y: 0, z: 0 })
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 0.7, y: 0.2, z: 0 }, end: { x: 7.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })
      getState().completeWiringToNode(outputNode.id, 'output')

      // Should still only have one wire
      expect(getState().wires).toHaveLength(1)
      expect(message.warning).toHaveBeenCalledWith('Wire already exists')
    })
  })
})
