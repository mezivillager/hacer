/**
 * useDestinationPin Hook Tests
 *
 * Tests for destination pin resolution hook that handles both gate and node destinations.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { useDestinationPin } from './useDestinationPin'

// Helper to get store state
const getState = () => useCircuitStore.getState()

describe('useDestinationPin', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      gates: [],
      wires: [],
      outputNodes: [],
      wiringFrom: null,
    })
  })

  it('returns null when wiring is not active', () => {
    const result = useDestinationPin(null)
    expect(result).toBe(null)
  })

  it('returns cursor destination when no pin destination is set', () => {
    useCircuitStore.setState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0, z: 0 },
        previewEndPosition: { x: 5, y: 0.2, z: 0 },
        destinationGateId: null,
        destinationPinId: null,
        destinationNodeId: null,
        destinationNodeType: null,
        segments: null,
        source: { type: 'gate', gateId: 'gate-1', pinId: 'pin-1', pinType: 'output' },
      },
    })

    const wiringFrom = getState().wiringFrom
    const result = useDestinationPin(wiringFrom)

    expect(result).not.toBe(null)
    expect(result?.destination.type).toBe('cursor')
    expect(result?.destination.pos).toEqual({ x: 5, y: 0.2, z: 0 })
  })

  it('returns node pin destination when output node is set as destination', () => {
    const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

    useCircuitStore.setState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0, z: 0 },
        previewEndPosition: { x: 5, y: 0.2, z: 0 },
        destinationGateId: null,
        destinationPinId: null,
        destinationNodeId: outputNode.id,
        destinationNodeType: 'output',
        segments: null,
        source: { type: 'gate', gateId: 'gate-1', pinId: 'pin-1', pinType: 'output' },
      },
    })

    const wiringFrom = getState().wiringFrom
    const result = useDestinationPin(wiringFrom)

    expect(result).not.toBe(null)
    expect(result?.destination.type).toBe('pin')
    // Output node pin is on left side
    // bodyHalfWidth = 0.3, pinRadius = 0.1, so pinOffset = 0.4
    // Pin position = node.x + (-0.4) = 8 - 0.4 = 7.6
    expect(result?.destination.pin.x).toBeCloseTo(7.6, 1)
    expect(result?.destination.pin.y).toBe(0)
    expect(result?.destination.pin.z).toBe(0)
    // Orientation should point left
    expect(result?.destination.orientation.direction.x).toBe(-1)
    expect(result?.destination.orientation.direction.y).toBe(0)
    expect(result?.destination.orientation.direction.z).toBe(0)
    expect(result?.destinationGateId).toBeUndefined()
  })

  it('returns gate pin destination when gate pin is set as destination', () => {
    const gate = getState().addGate('NAND', { x: 2, y: 0, z: 0 })

    useCircuitStore.setState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0, z: 0 },
        previewEndPosition: { x: 5, y: 0.2, z: 0 },
        destinationGateId: gate.id,
        destinationPinId: gate.inputs[0].id,
        destinationNodeId: null,
        destinationNodeType: null,
        segments: null,
        source: { type: 'gate', gateId: 'gate-1', pinId: 'pin-1', pinType: 'output' },
      },
    })

    const wiringFrom = getState().wiringFrom
    const result = useDestinationPin(wiringFrom)

    expect(result).not.toBe(null)
    expect(result?.destination.type).toBe('pin')
    expect(result?.destinationGateId).toBe(gate.id)
  })

  it('prioritizes node destination over gate destination', () => {
    const gate = getState().addGate('NAND', { x: 2, y: 0, z: 0 })
    const outputNode = getState().addOutputNode('out', { x: 8, y: 0, z: 0 })

    useCircuitStore.setState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0, z: 0 },
        previewEndPosition: { x: 5, y: 0.2, z: 0 },
        destinationGateId: gate.id,
        destinationPinId: gate.inputs[0].id,
        destinationNodeId: outputNode.id,
        destinationNodeType: 'output',
        segments: null,
        source: { type: 'gate', gateId: 'gate-1', pinId: 'pin-1', pinType: 'output' },
      },
    })

    const wiringFrom = getState().wiringFrom
    const result = useDestinationPin(wiringFrom)

    // Should return node destination (checked first)
    expect(result).not.toBe(null)
    expect(result?.destination.type).toBe('pin')
    expect(result?.destinationGateId).toBeUndefined()
  })
})
