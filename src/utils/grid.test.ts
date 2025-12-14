import { describe, it, expect } from 'vitest'
import {
  worldToGrid,
  gridToWorld,
  snapToGrid,
  canPlaceGateAt,
} from './grid'
import type { Position, GateInstance } from '@/store/types'

describe('grid utilities', () => {
  describe('worldToGrid', () => {
    it('converts world positions to grid coordinates correctly', () => {
      expect(worldToGrid({ x: 0, y: 0, z: 0 })).toEqual({ row: 0, col: 0 })
      expect(worldToGrid({ x: 2, y: 0, z: 0 })).toEqual({ row: 0, col: 1 })
      expect(worldToGrid({ x: 0, y: 0, z: 2 })).toEqual({ row: 1, col: 0 })
      expect(worldToGrid({ x: 4, y: 0, z: 4 })).toEqual({ row: 2, col: 2 })
    })

    it('rounds to nearest grid cell', () => {
      expect(worldToGrid({ x: 0.9, y: 0, z: 0.9 })).toEqual({ row: 0, col: 0 })
      expect(worldToGrid({ x: 1.1, y: 0, z: 1.1 })).toEqual({ row: 1, col: 1 })
      expect(worldToGrid({ x: 2.9, y: 0, z: 2.9 })).toEqual({ row: 1, col: 1 })
      expect(worldToGrid({ x: 3.1, y: 0, z: 3.1 })).toEqual({ row: 2, col: 2 })
    })

    it('handles negative coordinates', () => {
      expect(worldToGrid({ x: -2, y: 0, z: -2 })).toEqual({ row: -1, col: -1 })
      expect(worldToGrid({ x: -1.9, y: 0, z: -1.9 })).toEqual({ row: -1, col: -1 })
      // -1.1 / 2.0 = -0.55, Math.round(-0.55) = -1
      expect(worldToGrid({ x: -1.1, y: 0, z: -1.1 })).toEqual({ row: -1, col: -1 })
      // -0.4 / 2.0 = -0.2, Math.round(-0.2) = 0 (normalized from -0)
      expect(worldToGrid({ x: -0.4, y: 0, z: -0.4 })).toEqual({ row: 0, col: 0 })
    })
  })

  describe('gridToWorld', () => {
    it('converts grid coordinates to world positions', () => {
      expect(gridToWorld({ row: 0, col: 0 })).toEqual({ x: 0, y: 0, z: 0 })
      expect(gridToWorld({ row: 0, col: 1 })).toEqual({ x: 2, y: 0, z: 0 })
      expect(gridToWorld({ row: 1, col: 0 })).toEqual({ x: 0, y: 0, z: 2 })
      expect(gridToWorld({ row: 2, col: 2 })).toEqual({ x: 4, y: 0, z: 4 })
    })

    it('always sets y to 0', () => {
      const result = gridToWorld({ row: 5, col: 5 })
      expect(result.y).toBe(0)
    })

    it('handles negative grid coordinates', () => {
      expect(gridToWorld({ row: -1, col: -1 })).toEqual({ x: -2, y: 0, z: -2 })
      expect(gridToWorld({ row: -2, col: 1 })).toEqual({ x: 2, y: 0, z: -4 })
    })
  })

  describe('snapToGrid', () => {
    it('snaps positions to grid centers', () => {
      expect(snapToGrid({ x: 0.5, y: 0, z: 0.5 })).toEqual({ x: 0, y: 0, z: 0 })
      expect(snapToGrid({ x: 1.1, y: 0, z: 1.1 })).toEqual({ x: 2, y: 0, z: 2 })
      expect(snapToGrid({ x: 2.9, y: 0, z: 2.9 })).toEqual({ x: 2, y: 0, z: 2 })
      expect(snapToGrid({ x: 3.1, y: 0, z: 3.1 })).toEqual({ x: 4, y: 0, z: 4 })
    })

    it('preserves Y coordinate', () => {
      expect(snapToGrid({ x: 0.5, y: 0.4, z: 0.5 })).toEqual({ x: 0, y: 0.4, z: 0 })
      expect(snapToGrid({ x: 1.1, y: 1.5, z: 1.1 })).toEqual({ x: 2, y: 1.5, z: 2 })
      expect(snapToGrid({ x: 2.9, y: -0.2, z: 2.9 })).toEqual({ x: 2, y: -0.2, z: 2 })
    })

    it('maintains round-trip consistency', () => {
      const positions: Position[] = [
        { x: 0, y: 0, z: 0 },
        { x: 2, y: 0, z: 2 },
        { x: -2, y: 0, z: -2 },
        { x: 4, y: 0, z: 4 },
        { x: 1.5, y: 0, z: 1.5 },
        { x: -1.5, y: 0, z: -1.5 },
      ]

      for (const pos of positions) {
        const snapped = snapToGrid(pos)
        const gridPos = worldToGrid(snapped)
        const backToWorld = gridToWorld(gridPos)
        expect(snapped).toEqual(backToWorld)
      }
    })
  })

  describe('canPlaceGateAt', () => {
    const createGate = (id: string, position: Position): GateInstance => ({
      id,
      type: 'NAND',
      position,
      rotation: { x: Math.PI / 2, y: 0, z: 0 }, // Flat orientation
      inputs: [],
      outputs: [],
      selected: false,
    })

    it('prevents placement on section lines', () => {
      // Section lines occur when either row OR col is even
      // Section intersections occur when both row AND col are even
      expect(canPlaceGateAt({ row: 0, col: 0 }, [])).toBe(false) // Section intersection (both even)
      expect(canPlaceGateAt({ row: 2, col: 2 }, [])).toBe(false) // Section intersection (both even)
      expect(canPlaceGateAt({ row: 4, col: 4 }, [])).toBe(false) // Section intersection (both even)
      expect(canPlaceGateAt({ row: -2, col: -2 }, [])).toBe(false) // Section intersection (both even)
      
      // Section lines (one even, one odd)
      expect(canPlaceGateAt({ row: 0, col: 1 }, [])).toBe(false) // Even row, odd col - section line
      expect(canPlaceGateAt({ row: 1, col: 0 }, [])).toBe(false) // Odd row, even col - section line
      expect(canPlaceGateAt({ row: 2, col: 1 }, [])).toBe(false) // Even row, odd col - section line
      expect(canPlaceGateAt({ row: 1, col: 2 }, [])).toBe(false) // Odd row, even col - section line
      
      // Valid positions (not on section lines - both must be odd)
      expect(canPlaceGateAt({ row: 1, col: 1 }, [])).toBe(true) // Both odd
      expect(canPlaceGateAt({ row: 3, col: 1 }, [])).toBe(true) // Both odd
      expect(canPlaceGateAt({ row: 1, col: 3 }, [])).toBe(true) // Both odd
      expect(canPlaceGateAt({ row: -1, col: -1 }, [])).toBe(true) // Both odd
    })

    it('allows placement when no gates exist', () => {
      // Use position not on section line (both row and col must be odd)
      const result = canPlaceGateAt({ row: 1, col: 1 }, [])
      expect(result).toBe(true)
    })

    it('prevents placement in same cell', () => {
      // Gate at valid position (both odd)
      const gate = createGate('gate1', { x: 2, y: 0, z: 2 }) // grid (1, 1)
      const result = canPlaceGateAt({ row: 1, col: 1 }, [gate])
      expect(result).toBe(false)
    })

    it('prevents placement in adjacent cells (spacing = 1)', () => {
      // Gate at valid position (not on section line)
      const gate = createGate('gate1', { x: 2, y: 0, z: 0 }) // grid (0, 1)
      
      // Same row, adjacent column
      expect(canPlaceGateAt({ row: 0, col: 0 }, [gate])).toBe(false) // Adjacent, but also on section line
      expect(canPlaceGateAt({ row: 0, col: 2 }, [gate])).toBe(false)
      
      // Same column, adjacent row
      expect(canPlaceGateAt({ row: 1, col: 1 }, [gate])).toBe(false)
      expect(canPlaceGateAt({ row: -1, col: 1 }, [gate])).toBe(false)
      
      // Diagonal adjacent
      expect(canPlaceGateAt({ row: 1, col: 0 }, [gate])).toBe(false)
      expect(canPlaceGateAt({ row: 1, col: 2 }, [gate])).toBe(false)
    })

    it('allows placement when spacing > 1', () => {
      // Gate at valid position (both odd)
      const gate = createGate('gate1', { x: 2, y: 0, z: 2 }) // grid (1, 1)
      
      // Two cells away (use positions where both row and col are odd)
      expect(canPlaceGateAt({ row: 1, col: 5 }, [gate])).toBe(true) // 4 cells away, both odd
      expect(canPlaceGateAt({ row: 5, col: 1 }, [gate])).toBe(true) // 4 cells away, both odd
      expect(canPlaceGateAt({ row: 3, col: 3 }, [gate])).toBe(true) // 2 cells away, both odd
      
      // Mixed: one axis > 1, other = 1 (should allow, but both must be odd)
      expect(canPlaceGateAt({ row: 3, col: 1 }, [gate])).toBe(true) // rowDiff=2 > 1, both odd
      expect(canPlaceGateAt({ row: 1, col: 3 }, [gate])).toBe(true) // colDiff=2 > 1, both odd
    })

    it('handles excludeGateId parameter correctly', () => {
      // Use valid positions (both odd)
      const gate1 = createGate('gate1', { x: 2, y: 0, z: 2 }) // grid (1, 1)
      // Place gate2 far enough away so it doesn't interfere
      const gate2 = createGate('gate2', { x: 6, y: 0, z: 6 }) // grid (3, 3)
      
      // Cannot place at gate1's position normally
      expect(canPlaceGateAt({ row: 1, col: 1 }, [gate1, gate2])).toBe(false)
      
      // Can place at gate1's position if excluding gate1 (useful for dragging)
      expect(canPlaceGateAt({ row: 1, col: 1 }, [gate1, gate2], 'gate1')).toBe(true)
      
      // Still cannot place at gate2's position even when excluding gate1
      expect(canPlaceGateAt({ row: 3, col: 3 }, [gate1, gate2], 'gate1')).toBe(false)
    })

    it('handles multiple existing gates', () => {
      // Use valid positions (both odd)
      const gates = [
        createGate('gate1', { x: 2, y: 0, z: 2 }), // grid (1, 1)
        createGate('gate2', { x: 6, y: 0, z: 2 }), // grid (1, 3)
        createGate('gate3', { x: 2, y: 0, z: 6 }), // grid (3, 1)
      ]
      
      // Cannot place near any gate (must be odd positions, but adjacent)
      expect(canPlaceGateAt({ row: 1, col: 3 }, gates)).toBe(false) // Adjacent to gate2
      expect(canPlaceGateAt({ row: 3, col: 1 }, gates)).toBe(false) // Adjacent to gate3
      expect(canPlaceGateAt({ row: 1, col: 1 }, gates)).toBe(false) // Same as gate1
      
      // Can place far from all gates (use positions where both row and col are odd and far from all gates)
      expect(canPlaceGateAt({ row: 5, col: 5 }, gates)).toBe(true) // Far enough, both odd
      expect(canPlaceGateAt({ row: -1, col: -1 }, gates)).toBe(true) // Far enough, both odd
    })

    it('handles negative grid positions', () => {
      // Use valid position (both odd)
      const gate = createGate('gate1', { x: -2, y: 0, z: -2 }) // grid (-1, -1)
      
      expect(canPlaceGateAt({ row: -1, col: -1 }, [gate])).toBe(false) // Same cell
      // Adjacent means both rowDiff <= 1 AND colDiff <= 1
      // Position (-3, -1): rowDiff = 2, colDiff = 0
      // Since rowDiff = 2 > 1, the spacing check passes (not adjacent)
      // But we need both row and col to be odd, so (-3, -1) is valid
      expect(canPlaceGateAt({ row: -3, col: -1 }, [gate])).toBe(true) // Not adjacent (rowDiff = 2 > 1), both odd
      expect(canPlaceGateAt({ row: -3, col: -3 }, [gate])).toBe(true) // Far enough, both odd
    })
  })
})

