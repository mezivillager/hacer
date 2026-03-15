import { describe, it, expect, vi } from 'vitest'
import { computeJunctionRelocations } from './junctionUtils'
import type { CircuitStore, JunctionNode, Wire } from '../types'

describe('junctionUtils', () => {
  describe('computeJunctionRelocations', () => {
    it('relocates junction to nearest corner when current position is invalid', () => {
      const junction: JunctionNode = {
        id: 'j1',
        position: { x: 5, y: 0, z: 5 },
        signalId: 's1',
        wireIds: ['w1', 'w2'],
      }

      const trunkWire: Wire = {
        id: 'w1',
        from: { type: 'gate', entityId: 'g1', pinId: 'p1' },
        to: { type: 'gate', entityId: 'g2', pinId: 'p2' },
        segments: [
          { type: 'horizontal', start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } },
          { type: 'vertical', start: { x: 10, y: 0, z: 0 }, end: { x: 10, y: 0, z: 10 } },
        ],
        crossesWireIds: [],
      }

      const mockStore = {
        junctions: [junction],
        wires: [trunkWire],
        outputNodes: [],
      } as unknown as CircuitStore

      const get = () => mockStore
      const getPinWorldPosition = vi.fn()
      const recalculatedWireIds = new Set(['w1'])

      const result = computeJunctionRelocations(recalculatedWireIds, get, getPinWorldPosition)

      expect(result.updates).toHaveLength(1)
      expect(result.updates[0].id).toBe('j1')
      // Corners are (0,0,0) - from exit/entry implicit or overlap.
      // areSegmentsPerpendicular('horizontal', 'vertical') is true.
      // Corner at (10,0,0) is added.
      expect(result.updates[0].position.x).toBe(10)
      expect(result.updates[0].position.z).toBe(0)
    })

    it('removes junction if trunk wire has no corners', () => {
      const junction: JunctionNode = {
        id: 'j1',
        position: { x: 5, y: 0, z: 5 },
        signalId: 's1',
        wireIds: ['w1'],
      }

      const trunkWire: Wire = {
        id: 'w1',
        from: { type: 'gate', entityId: 'g1', pinId: 'p1' },
        to: { type: 'gate', entityId: 'g2', pinId: 'p2' },
        segments: [], // No segments
        crossesWireIds: [],
      }

      const mockStore = {
        junctions: [junction],
        wires: [trunkWire],
      } as unknown as CircuitStore

      const get = () => mockStore
      const result = computeJunctionRelocations(new Set(['w1']), get, vi.fn())

      expect(result.removals).toContain('j1')
    })

    it('keeps junction if current position is still a valid corner', () => {
      const junction: JunctionNode = {
        id: 'j1',
        position: { x: 10, y: 0, z: 0 },
        signalId: 's1',
        wireIds: ['w1'],
      }

      const trunkWire: Wire = {
        id: 'w1',
        from: { type: 'gate', entityId: 'g1', pinId: 'p1' },
        to: { type: 'gate', entityId: 'g2', pinId: 'p2' },
        segments: [
          { type: 'horizontal', start: { x: 0, y: 0, z: 0 }, end: { x: 10, y: 0, z: 0 } },
          { type: 'vertical', start: { x: 10, y: 0, z: 0 }, end: { x: 10, y: 0, z: 10 } },
        ],
        crossesWireIds: [],
      }

      const mockStore = {
        junctions: [junction],
        wires: [trunkWire],
      } as unknown as CircuitStore

      const get = () => mockStore
      const result = computeJunctionRelocations(new Set(['w1']), get, vi.fn())

      expect(result.updates).toHaveLength(0)
      expect(result.removals).toHaveLength(0)
    })
  })
})
