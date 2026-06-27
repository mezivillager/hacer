import { describe, it, expect, beforeEach, vi } from 'vitest'
import { notify } from '@/lib/notify'
import { useCircuitStore } from '../../circuitStore'

// Helper to get store state
const getState = () => useCircuitStore.getState()

vi.mock('@/lib/notify', () => ({
  notify: {
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
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
      junctions: [],
      nodePlacementMode: null,
      selectedNodeId: null,
      selectedNodeType: null,
    })
    vi.clearAllMocks()
  })

  describe('startWiring', () => {
    it('sets wiringFrom state', () => {
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })

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
      useCircuitStore.setState({ placementMode: 'Nand' })
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })

      getState().startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )

      expect(getState().placementMode).toBe(null)
    })
  })

  describe('updateWirePreviewPosition', () => {
    it('updates preview position when wiring is active', () => {
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
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
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
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
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 2, y: 0, z: 0 })

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
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 2, y: 0, z: 0 })

      getState().startWiring(
        gate1.id, gate1.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      getState().completeWiring(gate2.id, gate2.outputs[0].id, 'output')

      expect(getState().wires).toHaveLength(0)
      expect(notify.warning).toHaveBeenCalledWith('Cannot connect same pin types')
      expect(getState().wiringFrom).toBe(null)
    })

    it('rejects connection to same gate', () => {
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })

      getState().startWiring(
        gate.id, gate.outputs[0].id, 'output',
        { x: 0.7, y: 0, z: 0 }
      )
      getState().completeWiring(gate.id, gate.inputs[0].id, 'input')

      expect(getState().wires).toHaveLength(0)
      expect(notify.warning).toHaveBeenCalledWith('Cannot connect gate to itself')
      expect(getState().wiringFrom).toBe(null)
    })

    it('rejects duplicate wire', () => {
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 2, y: 0, z: 0 })

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
      expect(notify.warning).toHaveBeenCalledWith('Wire already exists')
    })

    it('normalizes wire direction (input to output)', () => {
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 2, y: 0, z: 0 })

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
      const gate2 = getState().addGate('Nand', { x: 2, y: 0, z: 0 })

      getState().completeWiring(gate2.id, gate2.inputs[0].id, 'input')

      expect(getState().wires).toHaveLength(0)
      expect(notify.warning).toHaveBeenCalledWith('No active wiring operation')
    })

    it('resolves crossings by adding arc segments', () => {
      const WIRE_HEIGHT = 0.2
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 4, y: 0, z: 0 })
      const gate3 = getState().addGate('Nand', { x: 2, y: 0, z: 4 })

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
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 2, y: 0, z: 0 })

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
      if (wiringFrom?.source?.type === 'input') {
        expect(wiringFrom.source.nodeId).toBe('input-a')
      }
    })

    it('rejects output nodes as wire sources', () => {
      getState().startWiringFromNode('output-out', 'output', { x: 0, y: 0, z: 0 })

      expect(getState().wiringFrom).toBe(null)
      expect(notify.warning).toHaveBeenCalledWith('Can only start wiring from input nodes')
    })

    it('clears placement modes', () => {
      useCircuitStore.setState({ placementMode: 'Nand', nodePlacementMode: 'INPUT' })

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

      expect(notify.warning).toHaveBeenCalledWith('Can only complete wiring to output nodes')
    })

    it('clears wiring state after completion to output', () => {
      const gate = getState().addGate('Nand', { x: 4, y: 0, z: 0 })
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })
      getState().startWiring(gate.id, gate.outputs[0].id, 'output', { x: 4.7, y: 0, z: 0 })
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 4.7, y: 0.2, z: 0 }, end: { x: 7.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })

      getState().completeWiringToNode(outputNode.id, 'output')

      expect(getState().wiringFrom).toBe(null)
    })

    it('shows warning when no wiringFrom state', () => {
      getState().completeWiringToNode('output-out', 'output')

      expect(notify.warning).toHaveBeenCalledWith('No active wiring operation')
    })

    it('creates input-to-output pass-through wire when widths match', () => {
      const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 }, 16)
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 }, 16)

      getState().startWiringFromNode(inputNode.id, 'input', { x: 0.5, y: 0.2, z: 0 })

      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 0.5, y: 0.2, z: 0 }, end: { x: 7.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })

      getState().completeWiringToNode(outputNode.id, 'output')

      expect(getState().wires).toHaveLength(1)
      const wire = getState().wires[0]
      expect(wire.from).toEqual({ type: 'input', entityId: inputNode.id })
      expect(wire.to).toEqual({ type: 'output', entityId: outputNode.id })
      expect(wire.width).toBe(16)
    })

    it('reports a recoverable error and clears wiring state when pass-through widths differ', () => {
      const inputNode = getState().addInputNode('a', { x: 0, y: 0, z: 0 }, 16)
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 }, 1)

      getState().startWiringFromNode(inputNode.id, 'input', { x: 0.5, y: 0.2, z: 0 })

      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 0.5, y: 0.2, z: 0 }, end: { x: 7.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })

      expect(() => getState().completeWiringToNode(outputNode.id, 'output')).not.toThrow()

      expect(getState().wires).toHaveLength(0)
      expect(getState().wiringFrom).toBe(null)
      expect(notify.error).toHaveBeenCalledWith(
        'Cannot complete wire: Direct input-to-output pass-through requires matching widths (source=16, destination=1)'
      )
    })

    it('uses segments from wiringFrom state', () => {
      const gate = getState().addGate('Nand', { x: 4, y: 0, z: 0 })
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 4 })

      getState().startWiring(gate.id, gate.outputs[0].id, 'output', { x: 4.7, y: 0, z: 0 })

      const testSegments = [
        { start: { x: 4.7, y: 0.2, z: 0 }, end: { x: 4, y: 0.2, z: 0 }, type: 'horizontal' as const },
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
          destinationNodeId: null,
          destinationNodeType: null,
          segments: null,
          // source is undefined
        },
      })

      getState().completeWiringToNode('output-out', 'output')

      expect(notify.warning).toHaveBeenCalledWith('Invalid wiring source')
    })
  })

  describe('setDestinationNode', () => {
    it('sets destination node when wiring is active', () => {
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
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
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
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
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
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
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
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
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
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
      expect(notify.warning).toHaveBeenCalledWith('Wire already exists')
    })
  })

  describe('startWiringFromJunction', () => {
    it('sets wiringFrom state with junction source', () => {
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 8, y: 0, z: 0 })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        [
          {
            start: { x: 0.7, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: 0 },
            type: 'exit',
          },
          {
            start: { x: 4, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: -4 },
            type: 'vertical',
          },
          {
            start: { x: 4, y: 0.2, z: -4 },
            end: { x: 8, y: 0.2, z: -4 },
            type: 'horizontal',
          },
          {
            start: { x: 8, y: 0.2, z: -4 },
            end: { x: 8.7, y: 0.2, z: -4 },
            type: 'entry',
          },
        ],
        [],
        'sig-test'
      )

      // Place junction at vertical/horizontal corner
      const junction = getState().placeJunctionOnWire({ x: 4, y: 0.2, z: -4 }, wire.id)

      getState().startWiringFromJunction(junction.id, junction.position)

      const wiringFrom = getState().wiringFrom
      expect(wiringFrom).not.toBe(null)
      expect(wiringFrom?.source?.type).toBe('junction')
      if (wiringFrom?.source?.type === 'junction') {
        expect(wiringFrom.source.junctionId).toBe(junction.id)
      }
      expect(wiringFrom?.destination?.type).toBe('junction')
      if (wiringFrom?.destination?.type === 'junction') {
        expect(wiringFrom.destination.originalWireId).toBe(wire.id)
        expect(wiringFrom.destination.sharedSegments).toBeDefined()
      }
    })

    it('warns when junction not found', () => {
      getState().startWiringFromJunction('non-existent', { x: 0, y: 0.2, z: 0 })

      expect(notify.warning).toHaveBeenCalledWith('Junction not found')
      expect(getState().wiringFrom).toBe(null)
    })

    it('warns when no wire passes through junction', () => {
      const junction = getState().addJunction('sig-test', { x: 4, y: 0.2, z: 0 })

      getState().startWiringFromJunction(junction.id, junction.position)

      expect(notify.warning).toHaveBeenCalledWith('No wire passes through this junction')
      expect(getState().wiringFrom).toBe(null)
    })

    // I2: startWiringFromJunction must accept a bus source
    it('I2 — accepts a junction on a bus-sourced wire and enables branching (no unsupported warning)', () => {
      const splitter = getState().placeBusSplitter(4, { x: 0, y: 0, z: 0 })!
      const gate1 = getState().addGate('Not', { x: 6, y: 0, z: 0 })

      // Create a wire from bus output to gate input (bus-sourced wire)
      const wire = getState().addWire(
        { type: 'bus', entityId: splitter.id, pinId: 'out0' },
        { type: 'gate', entityId: gate1.id, pinId: gate1.inputs[0].id },
        [
          { start: { x: 0.5, y: 0.2, z: 0 }, end: { x: 2, y: 0.2, z: 0 }, type: 'exit' },
          { start: { x: 2, y: 0.2, z: 0 }, end: { x: 2, y: 0.2, z: -2 }, type: 'vertical' },
          { start: { x: 2, y: 0.2, z: -2 }, end: { x: 5.5, y: 0.2, z: -2 }, type: 'horizontal' },
          { start: { x: 5.5, y: 0.2, z: -2 }, end: { x: 5.5, y: 0.2, z: 0 }, type: 'entry' },
        ],
        [],
        'sig-bus-out0',
      )

      // Place junction at a corner on the wire
      const junction = getState().placeJunctionOnWire({ x: 2, y: 0.2, z: -2 }, wire.id)

      // Start wiring from the junction — must NOT warn "Unsupported wire source type"
      getState().startWiringFromJunction(junction.id, junction.position)

      expect(notify.warning).not.toHaveBeenCalledWith('Unsupported wire source type for junction wiring')
      expect(getState().wiringFrom).not.toBeNull()
      expect(getState().wiringFrom?.source?.type).toBe('junction')
    })

    it('traces back through junctions to find ultimate source', () => {
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 8, y: 0, z: 0 })
      const gate3 = getState().addGate('Nand', { x: 16, y: 0, z: 0 })

      // Create first wire: gate1 -> gate2 with perpendicular segments
      const wire1 = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        [
          {
            start: { x: 0.7, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: 0 },
            type: 'exit',
          },
          {
            start: { x: 4, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: -4 },
            type: 'vertical',
          },
          {
            start: { x: 4, y: 0.2, z: -4 },
            end: { x: 8, y: 0.2, z: -4 },
            type: 'horizontal',
          },
          {
            start: { x: 8, y: 0.2, z: -4 },
            end: { x: 8.7, y: 0.2, z: -4 },
            type: 'entry',
          },
        ],
        [],
        'sig-test'
      )

      // Place junction on wire1 at vertical/horizontal corner
      const junction1 = getState().placeJunctionOnWire({ x: 4, y: 0.2, z: -4 }, wire1.id)

      // Create branch wire from junction1 to gate3
      getState().startWiringFromJunction(junction1.id, junction1.position)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            {
              start: { x: 4, y: 0.2, z: -4 },
              end: { x: 8, y: 0.2, z: -4 },
              type: 'horizontal',
            },
            {
              start: { x: 8, y: 0.2, z: -4 },
              end: { x: 8, y: 0.2, z: -8 },
              type: 'vertical',
            },
            {
              start: { x: 8, y: 0.2, z: -8 },
              end: { x: 15.5, y: 0.2, z: -8 },
              type: 'horizontal',
            },
          ]
        }
      })
      getState().completeWiringFromJunction(gate3.id, gate3.inputs[0].id, 'input')

      const wire2 = getState().wires.find((w) => w.to.entityId === gate3.id)
      expect(wire2).toBeDefined()
      expect(wire2?.from.type).toBe('gate')
      expect(wire2?.from.entityId).toBe(gate1.id) // Should trace back to gate1

      // Place junction2 on wire2 at horizontal/vertical corner
      // wire2 segments: [exit, vertical, horizontal(4→8,z=-4), vertical(8,z=-4→-8), horizontal(8→15.5,z=-8)]
      const junction2 = getState().placeJunctionOnWire({ x: 8, y: 0.2, z: -4 }, wire2!.id)

      // Wire from junction2 - should trace back to gate1
      getState().startWiringFromJunction(junction2.id, junction2.position)

      const wiringFrom = getState().wiringFrom
      expect(wiringFrom).not.toBe(null)
      expect(wiringFrom?.fromGateId).toBe(gate1.id) // Should trace back to gate1
      expect(wiringFrom?.source?.type).toBe('junction')
      if (wiringFrom?.source?.type === 'junction') {
        expect(wiringFrom.source.junctionId).toBe(junction2.id)
      }
    })
  })

  describe('completeWiringFromJunctionToNode', () => {
    it('creates branch wire from junction to output node', () => {
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 8, y: 0, z: 0 })
      const outputNode = getState().addOutputNode('out', { x: 12, y: 0, z: 0 })

      // Create wire with perpendicular segments
      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        [
          {
            start: { x: 0.7, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: 0 },
            type: 'exit',
          },
          {
            start: { x: 4, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: -4 },
            type: 'vertical',
          },
          {
            start: { x: 4, y: 0.2, z: -4 },
            end: { x: 8, y: 0.2, z: -4 },
            type: 'horizontal',
          },
          {
            start: { x: 8, y: 0.2, z: -4 },
            end: { x: 8.7, y: 0.2, z: -4 },
            type: 'entry',
          },
        ],
        [],
        'sig-test'
      )

      // Place junction at vertical/horizontal corner
      const junction = getState().placeJunctionOnWire({ x: 4, y: 0.2, z: -4 }, wire.id)

      // Start wiring from junction
      getState().startWiringFromJunction(junction.id, junction.position)

      // Set segments manually (normally done by WirePreview)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            {
              start: { x: 4, y: 0.2, z: -4 },
              end: { x: 11.6, y: 0.2, z: -4 },
              type: 'horizontal',
            },
          ]
        }
      })

      // Complete wiring to output node
      getState().completeWiringFromJunctionToNode(outputNode.id, 'output')

      const wires = getState().wires
      expect(wires).toHaveLength(2) // Original wire + branch wire

      const branchWire = wires.find((w) => w.to.type === 'output' && w.to.entityId === outputNode.id)
      expect(branchWire).toBeDefined()
      expect(branchWire?.from.type).toBe('gate')
      expect(branchWire?.from.entityId).toBe(gate1.id) // Starts at original wire's start
      expect(branchWire?.signalId).toBe('sig-test')
      expect(getState().wiringFrom).toBe(null)

      // Junction should track the new wire
      const updatedJunction = getState().junctions.find((j) => j.id === junction.id)
      expect(updatedJunction?.wireIds).toContain(branchWire!.id)
    })

    it('warns when source is not a junction', () => {
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

      // Start normal wiring (not from junction)
      const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      getState().startWiring(gate.id, gate.outputs[0].id, 'output', { x: 0.7, y: 0.2, z: 0 })

      getState().completeWiringFromJunctionToNode(outputNode.id, 'output')

      expect(notify.warning).toHaveBeenCalledWith('Wiring source is not a junction')
      expect(getState().wiringFrom).toBe(null)
    })

    it('warns when node type is not output', () => {
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 8, y: 0, z: 0 })
      const inputNode = getState().addInputNode('in', { x: 12, y: 0, z: 0 })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        [
          {
            start: { x: 0.7, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: 0 },
            type: 'exit',
          },
          {
            start: { x: 4, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: -4 },
            type: 'vertical',
          },
          {
            start: { x: 4, y: 0.2, z: -4 },
            end: { x: 8, y: 0.2, z: -4 },
            type: 'horizontal',
          },
          {
            start: { x: 8, y: 0.2, z: -4 },
            end: { x: 8.7, y: 0.2, z: -4 },
            type: 'entry',
          },
        ]
      )

      const junction = getState().placeJunctionOnWire({ x: 4, y: 0.2, z: -4 }, wire.id)
      getState().startWiringFromJunction(junction.id, junction.position)

      getState().completeWiringFromJunctionToNode(inputNode.id, 'input')

      expect(notify.warning).toHaveBeenCalledWith('Can only complete wiring to output nodes')
      expect(getState().wiringFrom).toBe(null)
    })
  })

  describe('completeWiringFromJunction', () => {
    it('creates branch wire from junction to gate', () => {
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 8, y: 0, z: 0 })
      const gate3 = getState().addGate('Nand', { x: 8, y: 0, z: 4 })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        [
          {
            start: { x: 0.7, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: 0 },
            type: 'exit',
          },
          {
            start: { x: 4, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: -4 },
            type: 'vertical',
          },
          {
            start: { x: 4, y: 0.2, z: -4 },
            end: { x: 8, y: 0.2, z: -4 },
            type: 'horizontal',
          },
          {
            start: { x: 8, y: 0.2, z: -4 },
            end: { x: 8.7, y: 0.2, z: -4 },
            type: 'entry',
          },
        ],
        [],
        'sig-test'
      )

      // Place junction at vertical/horizontal corner
      const junction = getState().placeJunctionOnWire({ x: 4, y: 0.2, z: -4 }, wire.id)

      getState().startWiringFromJunction(junction.id, junction.position)

      // Set segments manually (normally done by WirePreview)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            {
              start: { x: 4, y: 0.2, z: -4 },
              end: { x: 7.5, y: 0.2, z: 4 },
              type: 'horizontal',
            },
          ]
        }
      })

      getState().completeWiringFromJunction(gate3.id, gate3.inputs[0].id, 'input')

      const wires = getState().wires
      expect(wires).toHaveLength(2) // Original wire + branch wire

      const branchWire = wires.find((w) => w.to.entityId === gate3.id)
      expect(branchWire).toBeDefined()
      expect(branchWire?.from.type).toBe('gate')
      expect(branchWire?.from.entityId).toBe(gate1.id) // Starts at original wire's start
      expect(branchWire?.signalId).toBe('sig-test')
      expect(getState().wiringFrom).toBe(null)

      // Junction should track the new wire
      const updatedJunction = getState().junctions.find((j) => j.id === junction.id)
      expect(updatedJunction?.wireIds).toContain(branchWire!.id)
    })
  })

  describe('completeWiringFromJunctionToBus', () => {
    // Helper: create a wire with segments between gate1 output and gate2 input,
    // place a junction at the corner, and startWiringFromJunction.
    function setupJunctionWiring() {
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 8, y: 0, z: 0 })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        [
          { start: { x: 0.7, y: 0.2, z: 0 }, end: { x: 4, y: 0.2, z: 0 }, type: 'exit' },
          { start: { x: 4, y: 0.2, z: 0 }, end: { x: 4, y: 0.2, z: -4 }, type: 'vertical' },
          { start: { x: 4, y: 0.2, z: -4 }, end: { x: 8, y: 0.2, z: -4 }, type: 'horizontal' },
          { start: { x: 8, y: 0.2, z: -4 }, end: { x: 8.7, y: 0.2, z: -4 }, type: 'entry' },
        ],
        [],
        'sig-test',
      )

      // Place junction at the vertical/horizontal corner
      const junction = getState().placeJunctionOnWire({ x: 4, y: 0.2, z: -4 }, wire.id)
      getState().startWiringFromJunction(junction.id, junction.position)

      // Set new segments from the junction toward the bus destination
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            { start: { x: 4, y: 0.2, z: -4 }, end: { x: 12, y: 0.2, z: -4 }, type: 'horizontal' },
          ]
        }
      })

      return { gate1, gate2, junction, wire }
    }

    it('creates a branch wire from junction to a bus INPUT pin', () => {
      const { gate1, junction } = setupJunctionWiring()
      // Use a joiner so `in0` is an input pin
      const joiner = getState().placeBusJoiner(4, { x: 12, y: 0, z: 0 })!

      getState().completeWiringFromJunctionToBus(joiner.id, 'in0')

      const wires = getState().wires
      // Original wire + branch wire
      expect(wires).toHaveLength(2)

      const branchWire = wires.find(
        (w) => w.to.type === 'bus' && w.to.entityId === joiner.id && w.to.pinId === 'in0',
      )
      expect(branchWire).toBeDefined()
      // Branch wire's from comes from the original wire's source (gate1 output)
      expect(branchWire!.from.type).toBe('gate')
      expect(branchWire!.from.entityId).toBe(gate1.id)
      // Segments are non-empty (shared + new)
      expect(branchWire!.segments.length).toBeGreaterThan(0)
      expect(getState().wiringFrom).toBeNull()

      // Junction should track the new wire
      const updatedJunction = getState().junctions.find((j) => j.id === junction.id)
      expect(updatedJunction?.wireIds).toContain(branchWire!.id)
    })

    it('rejects wiring from a junction to a bus OUTPUT pin', () => {
      setupJunctionWiring()
      // Use a splitter so `out0` is an output pin
      const splitter = getState().placeBusSplitter(4, { x: 12, y: 0, z: 0 })!

      getState().completeWiringFromJunctionToBus(splitter.id, 'out0')

      // No new wire should be created (only the original wire from setupJunctionWiring)
      expect(getState().wires).toHaveLength(1)
      expect(notify.warning).toHaveBeenCalledWith('Can only connect to bus input pins')
      expect(getState().wiringFrom).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('handles multiple branches from same junction', () => {
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 8, y: 0, z: 0 })
      const gate3 = getState().addGate('Nand', { x: 8, y: 0, z: 4 })
      const gate4 = getState().addGate('Nand', { x: 8, y: 0, z: 8 })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        [
          {
            start: { x: 0.7, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: 0 },
            type: 'exit',
          },
          {
            start: { x: 4, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: -4 },
            type: 'vertical',
          },
          {
            start: { x: 4, y: 0.2, z: -4 },
            end: { x: 8, y: 0.2, z: -4 },
            type: 'horizontal',
          },
          {
            start: { x: 8, y: 0.2, z: -4 },
            end: { x: 8.7, y: 0.2, z: -4 },
            type: 'entry',
          },
        ],
        [],
        'sig-test'
      )

      const junction = getState().placeJunctionOnWire({ x: 4, y: 0.2, z: -4 }, wire.id)

      // Create first branch
      getState().startWiringFromJunction(junction.id, junction.position)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            {
              start: { x: 4, y: 0.2, z: -4 },
              end: { x: 7.5, y: 0.2, z: 4 },
              type: 'horizontal',
            },
          ]
        }
      })
      getState().completeWiringFromJunction(gate3.id, gate3.inputs[0].id, 'input')

      // Create second branch from same junction
      getState().startWiringFromJunction(junction.id, junction.position)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            {
              start: { x: 4, y: 0.2, z: -4 },
              end: { x: 7.5, y: 0.2, z: 8 },
              type: 'horizontal',
            },
          ]
        }
      })
      getState().completeWiringFromJunction(gate4.id, gate4.inputs[0].id, 'input')

      // Should have original wire + 2 branch wires
      expect(getState().wires).toHaveLength(3)

      // Junction should track all wires
      const updatedJunction = getState().junctions.find((j) => j.id === junction.id)
      expect(updatedJunction?.wireIds).toHaveLength(3) // Original + 2 branches
    })

    it('handles nested junctions (junction on branch wire)', () => {
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 8, y: 0, z: 0 })
      const gate3 = getState().addGate('Nand', { x: 8, y: 0, z: 4 })
      const gate4 = getState().addGate('Nand', { x: 8, y: 0, z: 8 })

      // Create original wire with perpendicular segments
      const wire1 = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        [
          {
            start: { x: 0.7, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: 0 },
            type: 'exit',
          },
          {
            start: { x: 4, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: -4 },
            type: 'vertical',
          },
          {
            start: { x: 4, y: 0.2, z: -4 },
            end: { x: 8, y: 0.2, z: -4 },
            type: 'horizontal',
          },
          {
            start: { x: 8, y: 0.2, z: -4 },
            end: { x: 8.7, y: 0.2, z: -4 },
            type: 'entry',
          },
        ],
        [],
        'sig-test'
      )

      // Place first junction at vertical/horizontal corner
      const junction1 = getState().placeJunctionOnWire({ x: 4, y: 0.2, z: -4 }, wire1.id)

      // Create branch wire from junction1 to gate3 with perpendicular corners
      getState().startWiringFromJunction(junction1.id, junction1.position)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            {
              start: { x: 4, y: 0.2, z: -4 },
              end: { x: 6, y: 0.2, z: -4 },
              type: 'horizontal',
            },
            {
              start: { x: 6, y: 0.2, z: -4 },
              end: { x: 6, y: 0.2, z: 4 },
              type: 'vertical',
            },
            {
              start: { x: 6, y: 0.2, z: 4 },
              end: { x: 7.5, y: 0.2, z: 4 },
              type: 'horizontal',
            },
          ]
        }
      })
      getState().completeWiringFromJunction(gate3.id, gate3.inputs[0].id, 'input')

      // Find the branch wire
      const branchWire = getState().wires.find((w) => w.to.entityId === gate3.id)
      expect(branchWire).toBeDefined()

      // Place second junction on branch wire at horizontal/vertical corner
      const junction2 = getState().placeJunctionOnWire({ x: 6, y: 0.2, z: -4 }, branchWire!.id)

      // Create branch from junction2 to gate4
      getState().startWiringFromJunction(junction2.id, junction2.position)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            {
              start: { x: 6, y: 0.2, z: -4 },
              end: { x: 7.5, y: 0.2, z: 8 },
              type: 'horizontal',
            },
          ]
        }
      })
      getState().completeWiringFromJunction(gate4.id, gate4.inputs[0].id, 'input')

      // Should have original wire + 2 branch wires
      expect(getState().wires).toHaveLength(3)

      // Both branch wires should start at gate1 (original wire's start)
      const branchWire2 = getState().wires.find((w) => w.to.entityId === gate4.id)
      expect(branchWire2?.from.entityId).toBe(gate1.id)
    })

    it('handles junction at segment end (t === 1)', () => {
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 8, y: 0, z: 0 })
      const gate3 = getState().addGate('Nand', { x: 8, y: 0, z: 4 })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        [
          {
            start: { x: 0.7, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: 0 },
            type: 'exit',
          },
          {
            start: { x: 4, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: -4 },
            type: 'vertical',
          },
          {
            start: { x: 4, y: 0.2, z: -4 },
            end: { x: 8, y: 0.2, z: -4 },
            type: 'horizontal',
          },
          {
            start: { x: 8, y: 0.2, z: -4 },
            end: { x: 8.7, y: 0.2, z: -4 },
            type: 'entry',
          },
        ],
        [],
        'sig-test'
      )

      // Place junction at exit segment end (t === 1 on first segment)
      const junction = getState().placeJunctionOnWire({ x: 4, y: 0.2, z: 0 }, wire.id)

      getState().startWiringFromJunction(junction.id, junction.position)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            {
              start: { x: 4, y: 0.2, z: 0 },
              end: { x: 7.5, y: 0.2, z: 4 },
              type: 'horizontal',
            },
          ]
        }
      })
      getState().completeWiringFromJunction(gate3.id, gate3.inputs[0].id, 'input')

      const branchWire = getState().wires.find((w) => w.to.entityId === gate3.id)
      expect(branchWire).toBeDefined()
      expect(branchWire?.from.entityId).toBe(gate1.id)
    })

    it('handles junction at segment start (t === 0)', () => {
      const gate1 = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
      const gate2 = getState().addGate('Nand', { x: 8, y: 0, z: 0 })
      const gate3 = getState().addGate('Nand', { x: 8, y: 0, z: 4 })

      const wire = getState().addWire(
        { type: 'gate', entityId: gate1.id, pinId: gate1.outputs[0].id },
        { type: 'gate', entityId: gate2.id, pinId: gate2.inputs[0].id },
        [
          {
            start: { x: 0.7, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: 0 },
            type: 'exit',
          },
          {
            start: { x: 4, y: 0.2, z: 0 },
            end: { x: 4, y: 0.2, z: -4 },
            type: 'vertical',
          },
          {
            start: { x: 4, y: 0.2, z: -4 },
            end: { x: 8, y: 0.2, z: -4 },
            type: 'horizontal',
          },
          {
            start: { x: 8, y: 0.2, z: -4 },
            end: { x: 8.7, y: 0.2, z: -4 },
            type: 'entry',
          },
        ],
        [],
        'sig-test'
      )

      // Place junction at horizontal/entry boundary (last corner before entry)
      const junction = getState().placeJunctionOnWire({ x: 8, y: 0.2, z: -4 }, wire.id)

      getState().startWiringFromJunction(junction.id, junction.position)
      useCircuitStore.setState((state) => {
        if (state.wiringFrom) {
          state.wiringFrom.segments = [
            {
              start: { x: 8, y: 0.2, z: -4 },
              end: { x: 7.5, y: 0.2, z: 4 },
              type: 'horizontal',
            },
          ]
        }
      })
      getState().completeWiringFromJunction(gate3.id, gate3.inputs[0].id, 'input')

      const branchWire = getState().wires.find((w) => w.to.entityId === gate3.id)
      expect(branchWire).toBeDefined()
      expect(branchWire?.from.entityId).toBe(gate1.id)
    })
  })

  describe('bus wiring', () => {
    it('wires a gate output to a splitter input (bus destination)', () => {
      const gate = getState().addGate('Not', { x: 0, y: 0, z: 0 })
      const splitter = getState().placeBusSplitter(4, { x: 4, y: 0, z: 0 })!

      getState().startWiring(gate.id, gate.outputs[0].id, 'output', { x: 0.7, y: 0.2, z: 0 })
      useCircuitStore.setState((s) => {
        if (s.wiringFrom) {
          s.wiringFrom.segments = [
            { start: { x: 0.7, y: 0.2, z: 0 }, end: { x: 3.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })
      getState().completeWiringToBus(splitter.id, 'in')

      expect(getState().wires).toHaveLength(1)
      expect(getState().wires[0].from).toEqual({ type: 'gate', entityId: gate.id, pinId: gate.outputs[0].id })
      expect(getState().wires[0].to).toEqual({ type: 'bus', entityId: splitter.id, pinId: 'in' })
      expect(getState().wires[0].segments.length).toBeGreaterThan(0)
      expect(getState().wiringFrom).toBe(null)
    })

    it('wires a splitter output to a gate input (bus source)', () => {
      const splitter = getState().placeBusSplitter(4, { x: 0, y: 0, z: 0 })!
      const gate = getState().addGate('Not', { x: 6, y: 0, z: 0 })

      getState().startWiringFromBus(splitter.id, 'out0', 'output', { x: 0.5, y: 0.2, z: 0 })
      useCircuitStore.setState((s) => {
        if (s.wiringFrom) {
          s.wiringFrom.segments = [
            { start: { x: 0.5, y: 0.2, z: 0 }, end: { x: 5.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })
      getState().completeWiringFromBusToGate(gate.id, gate.inputs[0].id, 'input')

      expect(getState().wires).toHaveLength(1)
      expect(getState().wires[0].from).toEqual({ type: 'bus', entityId: splitter.id, pinId: 'out0' })
      expect(getState().wires[0].to).toEqual({ type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id })
      // M3: bus→gate test must also assert non-empty segments (parity with gate→bus sibling above)
      expect(getState().wires[0].segments.length).toBeGreaterThan(0)
    })

    // M1: completeWiringFromBusToNode — currently untested path
    it('wires a splitter output to an output node (bus→node, M1)', () => {
      const splitter = getState().placeBusSplitter(4, { x: 0, y: 0, z: 0 })!
      const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

      getState().startWiringFromBus(splitter.id, 'out0', 'output', { x: 0.5, y: 0.2, z: 0 })
      useCircuitStore.setState((s) => {
        if (s.wiringFrom) {
          s.wiringFrom.segments = [
            { start: { x: 0.5, y: 0.2, z: 0 }, end: { x: 7.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })
      getState().completeWiringFromBusToNode(outputNode.id, 'output')

      expect(getState().wires).toHaveLength(1)
      expect(getState().wires[0].from).toEqual({ type: 'bus', entityId: splitter.id, pinId: 'out0' })
      expect(getState().wires[0].to).toEqual({ type: 'output', entityId: outputNode.id })
      expect(getState().wires[0].segments.length).toBeGreaterThan(0)
      expect(getState().wiringFrom).toBe(null)
    })

    // C1: pin-direction validation
    it('C1 — rejects output→output bus connection (no wire, warning)', () => {
      const splitter = getState().placeBusSplitter(4, { x: 4, y: 0, z: 0 })!
      const gate = getState().addGate('Not', { x: 0, y: 0, z: 0 })

      // Gate OUTPUT → splitter OUTPUT pin ('out0') — same direction, must be rejected
      getState().startWiring(gate.id, gate.outputs[0].id, 'output', { x: 0.7, y: 0.2, z: 0 })
      useCircuitStore.setState((s) => {
        if (s.wiringFrom) {
          s.wiringFrom.segments = [
            { start: { x: 0.7, y: 0.2, z: 0 }, end: { x: 3.5, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })
      getState().completeWiringToBus(splitter.id, 'out0')

      expect(getState().wires).toHaveLength(0)
      expect(notify.warning).toHaveBeenCalledWith('Cannot connect same pin types')
    })

    it('C1 — rejects input→input bus connection (no wire, warning)', () => {
      const joiner = getState().placeBusJoiner(4, { x: 6, y: 0, z: 0 })!
      const gate = getState().addGate('Not', { x: 0, y: 0, z: 0 })

      // Bus INPUT pin ('in0') → gate INPUT — same direction, must be rejected
      getState().startWiringFromBus(joiner.id, 'in0', 'input', { x: 6.5, y: 0.2, z: 0 })
      useCircuitStore.setState((s) => {
        if (s.wiringFrom) {
          s.wiringFrom.segments = [
            { start: { x: 6.5, y: 0.2, z: 0 }, end: { x: 0.7, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })
      getState().completeWiringFromBusToGate(gate.id, gate.inputs[0].id, 'input')

      expect(getState().wires).toHaveLength(0)
      expect(notify.warning).toHaveBeenCalledWith('Cannot connect same pin types')
    })

    it('C1 — wire started from bus INPUT to gate OUTPUT is oriented from=gate OUTPUT (correct swap)', () => {
      const joiner = getState().placeBusJoiner(4, { x: 6, y: 0, z: 0 })!
      const gate = getState().addGate('Not', { x: 0, y: 0, z: 0 })

      // Start from joiner INPUT 'in0', wire to gate OUTPUT — must swap so from=gate output
      getState().startWiringFromBus(joiner.id, 'in0', 'input', { x: 6.5, y: 0.2, z: 0 })
      useCircuitStore.setState((s) => {
        if (s.wiringFrom) {
          s.wiringFrom.segments = [
            { start: { x: 6.5, y: 0.2, z: 0 }, end: { x: 0.7, y: 0.2, z: 0 }, type: 'horizontal' },
          ]
        }
      })
      getState().completeWiringFromBusToGate(gate.id, gate.outputs[0].id, 'output')

      expect(getState().wires).toHaveLength(1)
      // After orientation fix: from=gate output (the signal source), to=bus input
      expect(getState().wires[0].from).toEqual({ type: 'gate', entityId: gate.id, pinId: gate.outputs[0].id })
      expect(getState().wires[0].to).toEqual({ type: 'bus', entityId: joiner.id, pinId: 'in0' })
    })

    // C2: self-connection guard
    it('C2 — rejects wiring two pins on the same bus component (self-connection)', () => {
      const splitter = getState().placeBusSplitter(4, { x: 0, y: 0, z: 0 })!

      // out0 (output) → 'in' (input) on same splitter — different directions but same entity
      getState().startWiringFromBus(splitter.id, 'out0', 'output', { x: 0.5, y: 0.2, z: 0 })
      useCircuitStore.setState((s) => {
        if (s.wiringFrom) {
          s.wiringFrom.segments = [
            { start: { x: 0.5, y: 0.2, z: 0 }, end: { x: 0.5, y: 0.2, z: 0.2 }, type: 'vertical' },
          ]
        }
      })
      getState().completeWiringToBus(splitter.id, 'in')

      expect(getState().wires).toHaveLength(0)
      expect(notify.warning).toHaveBeenCalledWith('Cannot connect gate to itself')
    })

    // M5: setDestinationBus computes routed segments synchronously so
    // completeWiringToBus works on the canvas without test-only manual seeding.
    describe('setDestinationBus (M5)', () => {
      it('records bus destination and computes routed segments synchronously', () => {
        const gate = getState().addGate('Not', { x: 0, y: 0, z: 0 })
        const splitter = getState().placeBusSplitter(4, { x: 6, y: 0, z: 0 })!
        const gateOutputPos = getState().getPinWorldPosition(gate.id, gate.outputs[0].id)!

        // Start wiring (no segments yet)
        getState().startWiring(gate.id, gate.outputs[0].id, 'output', gateOutputPos)
        expect(getState().wiringFrom?.segments).toBeNull()

        // setDestinationBus should compute segments synchronously
        getState().setDestinationBus(splitter.id, 'in')

        const wiringFrom = getState().wiringFrom
        expect(wiringFrom?.destination).toEqual({ type: 'bus', busId: splitter.id, pinId: 'in' })
        expect(wiringFrom?.segments).not.toBeNull()
        expect(wiringFrom?.segments?.length).toBeGreaterThan(0)
      })

      it('setDestinationBus + completeWiringToBus creates a routed wire without manual seeding', () => {
        const gate = getState().addGate('Not', { x: 0, y: 0, z: 0 })
        const splitter = getState().placeBusSplitter(4, { x: 6, y: 0, z: 0 })!
        const gateOutputPos = getState().getPinWorldPosition(gate.id, gate.outputs[0].id)!

        getState().startWiring(gate.id, gate.outputs[0].id, 'output', gateOutputPos)
        // Production path: set destination (computes segments) then complete
        getState().setDestinationBus(splitter.id, 'in')
        getState().completeWiringToBus(splitter.id, 'in')

        expect(getState().wires).toHaveLength(1)
        const wire = getState().wires[0]
        expect(wire.from).toEqual({ type: 'gate', entityId: gate.id, pinId: gate.outputs[0].id })
        expect(wire.to).toEqual({ type: 'bus', entityId: splitter.id, pinId: 'in' })
        expect(wire.segments.length).toBeGreaterThan(0)
        expect(getState().wiringFrom).toBeNull()
      })
    })
  })
})
