import { describe, it, expect } from 'vitest'
import { findNearestWire } from './wireHitTest'
import type { Wire } from '@/store/types'
import { WIRE_HEIGHT, HOP_HEIGHT, HOP_RADIUS } from './wiringScheme/types'

describe('wireHitTest', () => {
  describe('findNearestWire', () => {
    it('returns null when no wires provided', () => {
      const result = findNearestWire({ x: 0, y: 0, z: 0 }, [], 0.5)
      expect(result).toBe(null)
    })

    it('returns null when point is too far from any wire', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [
          {
            start: { x: 0, y: WIRE_HEIGHT, z: 0 },
            end: { x: 4, y: WIRE_HEIGHT, z: 0 },
            type: 'horizontal',
          },
        ],
        crossesWireIds: [],
      }

      const result = findNearestWire({ x: 10, y: WIRE_HEIGHT, z: 10 }, [wire], 0.5)
      expect(result).toBe(null)
    })

    it('finds wire with horizontal segment near point', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [
          {
            start: { x: 0, y: WIRE_HEIGHT, z: 0 },
            end: { x: 4, y: WIRE_HEIGHT, z: 0 },
            type: 'horizontal',
          },
        ],
        crossesWireIds: [],
      }

      const result = findNearestWire({ x: 2, y: WIRE_HEIGHT, z: 0.3 }, [wire], 0.5)
      expect(result).toBe('wire-1')
    })

    it('finds wire with vertical segment near point', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [
          {
            start: { x: 0, y: WIRE_HEIGHT, z: 0 },
            end: { x: 0, y: WIRE_HEIGHT, z: 4 },
            type: 'vertical',
          },
        ],
        crossesWireIds: [],
      }

      const result = findNearestWire({ x: 0.3, y: WIRE_HEIGHT, z: 2 }, [wire], 0.5)
      expect(result).toBe('wire-1')
    })

    it('finds wire with entry segment near point', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [
          {
            start: { x: 0.5, y: WIRE_HEIGHT, z: 0 },
            end: { x: 2, y: WIRE_HEIGHT, z: 0 },
            type: 'entry',
          },
        ],
        crossesWireIds: [],
      }

      const result = findNearestWire({ x: 1.2, y: WIRE_HEIGHT, z: 0.3 }, [wire], 0.5)
      expect(result).toBe('wire-1')
    })

    it('finds wire with exit segment near point', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [
          {
            start: { x: 0, y: WIRE_HEIGHT, z: 0 },
            end: { x: 2, y: WIRE_HEIGHT, z: 0 },
            type: 'exit',
          },
        ],
        crossesWireIds: [],
      }

      const result = findNearestWire({ x: 1, y: WIRE_HEIGHT, z: 0.3 }, [wire], 0.5)
      expect(result).toBe('wire-1')
    })

    it('finds wire with arc segment near point', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [
          {
            start: { x: 2, y: WIRE_HEIGHT, z: 0 },
            end: { x: 4, y: WIRE_HEIGHT, z: 0 },
            type: 'arc',
            arcCenter: { x: 3, y: WIRE_HEIGHT, z: 0 },
            arcRadius: HOP_RADIUS,
          },
        ],
        crossesWireIds: [],
      }

      // Point near the arc midpoint (should be at HOP_HEIGHT)
      const result = findNearestWire({ x: 3, y: HOP_HEIGHT - 0.1, z: 0 }, [wire], 0.5)
      expect(result).toBe('wire-1')
    })

    it('returns nearest wire when multiple wires are near point', () => {
      const wire1: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [
          {
            start: { x: 0, y: WIRE_HEIGHT, z: 0 },
            end: { x: 4, y: WIRE_HEIGHT, z: 0 },
            type: 'horizontal',
          },
        ],
        crossesWireIds: [],
      }

      const wire2: Wire = {
        id: 'wire-2',
        from: { type: 'gate', entityId: 'gate-2', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-3', pinId: 'pin-2' },
        segments: [
          {
            start: { x: 2, y: WIRE_HEIGHT, z: 0 },
            end: { x: 2, y: WIRE_HEIGHT, z: 4 },
            type: 'vertical',
          },
        ],
        crossesWireIds: [],
      }

      // Point closer to wire2
      const result = findNearestWire({ x: 2.1, y: WIRE_HEIGHT, z: 2 }, [wire1, wire2], 0.5)
      expect(result).toBe('wire-2')
    })

    it('handles wire with multiple segments', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [
          {
            start: { x: 0, y: WIRE_HEIGHT, z: 0 },
            end: { x: 2, y: WIRE_HEIGHT, z: 0 },
            type: 'horizontal',
          },
          {
            start: { x: 2, y: WIRE_HEIGHT, z: 0 },
            end: { x: 2, y: WIRE_HEIGHT, z: 4 },
            type: 'vertical',
          },
        ],
        crossesWireIds: [],
      }

      // Point near second segment
      const result = findNearestWire({ x: 2.2, y: WIRE_HEIGHT, z: 2 }, [wire], 0.5)
      expect(result).toBe('wire-1')
    })

    it('respects threshold distance', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [
          {
            start: { x: 0, y: WIRE_HEIGHT, z: 0 },
            end: { x: 4, y: WIRE_HEIGHT, z: 0 },
            type: 'horizontal',
          },
        ],
        crossesWireIds: [],
      }

      // Point just outside threshold
      const result = findNearestWire({ x: 2, y: WIRE_HEIGHT, z: 0.6 }, [wire], 0.5)
      expect(result).toBe(null)
    })

    it('handles point at different Y coordinate (height)', () => {
      const wire: Wire = {
        id: 'wire-1',
        from: { type: 'gate', entityId: 'gate-1', pinId: 'pin-1' },
        to: { type: 'gate', entityId: 'gate-2', pinId: 'pin-2' },
        segments: [
          {
            start: { x: 0, y: WIRE_HEIGHT, z: 0 },
            end: { x: 4, y: WIRE_HEIGHT, z: 0 },
            type: 'horizontal',
          },
        ],
        crossesWireIds: [],
      }

      // Point at ground level but close horizontally
      const result = findNearestWire({ x: 2, y: 0, z: 0.3 }, [wire], 0.5)
      expect(result).toBe('wire-1')
    })
  })
})



