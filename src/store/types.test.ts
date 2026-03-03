/**
 * Store Types Tests
 *
 * Tests for the HDL-supporting circuit types including:
 * - InputNode, OutputNode, ConstantNode for circuit I/O
 * - Signal for logical wire connections with fan-out
 * - JunctionNode for visual wire branching
 */

import { describe, it, expect } from 'vitest'
import type {
  InputNode,
  OutputNode,
  ConstantNode,
  JunctionNode,
  Wire,
  WireEndpoint,
} from './types'

describe('Circuit Node Types', () => {
  describe('InputNode', () => {
    it('represents a circuit input with name and position', () => {
      const inputNode: InputNode = {
        id: 'input-a',
        name: 'a',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        value: false,
        width: 1,
      }

      expect(inputNode.id).toBe('input-a')
      expect(inputNode.name).toBe('a')
      expect(inputNode.width).toBe(1) // single bit
    })

    it('supports multi-bit bus inputs', () => {
      const busInput: InputNode = {
        id: 'input-data',
        name: 'data',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        value: false,
        width: 16, // 16-bit bus
      }

      expect(busInput.width).toBe(16)
    })
  })

  describe('OutputNode', () => {
    it('represents a circuit output with name and position', () => {
      const outputNode: OutputNode = {
        id: 'output-out',
        name: 'out',
        position: { x: 32, y: 0, z: 4 },
        rotation: { x: 0, y: 0, z: 0 },
        value: false,
        width: 1,
      }

      expect(outputNode.id).toBe('output-out')
      expect(outputNode.name).toBe('out')
    })
  })

  describe('ConstantNode', () => {
    it('represents a constant true value', () => {
      const trueNode: ConstantNode = {
        id: 'const-true',
        value: true,
        position: { x: -4, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
      }

      expect(trueNode.value).toBe(true)
    })

    it('represents a constant false value', () => {
      const falseNode: ConstantNode = {
        id: 'const-false',
        value: false,
        position: { x: -4, y: 0, z: 4 },
        rotation: { x: 0, y: 0, z: 0 },
      }

      expect(falseNode.value).toBe(false)
    })
  })

  describe('JunctionNode', () => {
    it('represents a wire branching point', () => {
      const junction: JunctionNode = {
        id: 'junction-1',
        position: { x: 4, y: 0.2, z: 4 },
        signalId: 'sig-a',
        wireIds: [],
      }

      expect(junction.signalId).toBe('sig-a')
      expect(junction.position.y).toBe(0.2) // wire height
    })
  })
})

describe('Wire Endpoint Types', () => {
  describe('WireEndpoint', () => {
    it('represents a gate pin endpoint', () => {
      const endpoint: WireEndpoint = {
        type: 'gate',
        entityId: 'nand-gate-1',
        pinId: 'out',
      }

      expect(endpoint.type).toBe('gate')
      expect(endpoint.pinId).toBe('out')
    })

    it('represents an input node endpoint', () => {
      const endpoint: WireEndpoint = {
        type: 'input',
        entityId: 'input-a',
      }

      expect(endpoint.type).toBe('input')
      expect(endpoint.pinId).toBeUndefined()
    })

    it('represents an output node endpoint', () => {
      const endpoint: WireEndpoint = {
        type: 'output',
        entityId: 'output-out',
      }

      expect(endpoint.type).toBe('output')
    })

    it('represents a constant endpoint', () => {
      const endpoint: WireEndpoint = {
        type: 'constant',
        entityId: 'const-true',
      }

      expect(endpoint.type).toBe('constant')
    })

    it('represents a junction endpoint', () => {
      const endpoint: WireEndpoint = {
        type: 'junction',
        entityId: 'junction-1',
      }

      expect(endpoint.type).toBe('junction')
    })
  })
})

describe('Wire Type', () => {
  describe('Wire with signalId', () => {
    it('represents a signal-based wire connection', () => {
      const wire: Wire = {
        id: 'wire-1',
        signalId: 'sig-a',
        from: { type: 'input', entityId: 'input-a' },
        to: { type: 'gate', entityId: 'not-1', pinId: 'in' },
        segments: [],
        crossesWireIds: [],
      }

      expect(wire.signalId).toBe('sig-a')
      expect(wire.from.type).toBe('input')
      expect(wire.to.type).toBe('gate')
    })

    it('supports wire from junction to destination (for fan-out)', () => {
      const branchWire: Wire = {
        id: 'wire-branch-1',
        signalId: 'sig-a',
        from: { type: 'junction', entityId: 'junction-1' },
        to: { type: 'gate', entityId: 'and-1', pinId: 'a' },
        segments: [],
        crossesWireIds: [],
      }

      expect(branchWire.from.type).toBe('junction')
    })

    it('supports wire from source to junction', () => {
      const trunkWire: Wire = {
        id: 'wire-trunk-1',
        signalId: 'sig-a',
        from: { type: 'input', entityId: 'input-a' },
        to: { type: 'junction', entityId: 'junction-1' },
        segments: [],
        crossesWireIds: [],
      }

      expect(trunkWire.to.type).toBe('junction')
    })
  })
})
