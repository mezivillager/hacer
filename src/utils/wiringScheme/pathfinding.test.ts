import { describe, it, expect } from 'vitest'
import type { Position } from './types'
import { SECTION_SIZE, WIRE_HEIGHT } from './types'
import { 
  findPathAlongSectionLines, 
  getReachableCorners,
  isOnSectionLine,
  checkCanReachDirectly,
  snapToNearestSectionLine,
} from './pathfinding'

describe('WiringScheme Pathfinding Module', () => {
  const createPosition = (x: number, y: number, z: number): Position => ({ x, y, z })

  describe('findPathAlongSectionLines', () => {
    it('finds direct path along horizontal section line', () => {
      const start = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(8, WIRE_HEIGHT, 0)

      const path = findPathAlongSectionLines(start, end)

      expect(path.length).toBeGreaterThan(0)
      // Path should start at start position
      expect(path[0].start.x).toBeCloseTo(start.x, 3)
      expect(path[0].start.z).toBeCloseTo(start.z, 3)
      // Path should end at end position
      const lastSegment = path[path.length - 1]
      expect(lastSegment.end.x).toBeCloseTo(end.x, 3)
      expect(lastSegment.end.z).toBeCloseTo(end.z, 3)
    })

    it('finds direct path along vertical section line', () => {
      const start = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(0, WIRE_HEIGHT, 8)

      const path = findPathAlongSectionLines(start, end)

      expect(path.length).toBeGreaterThan(0)
      expect(path[0].start.x).toBeCloseTo(start.x, 3)
      expect(path[0].start.z).toBeCloseTo(start.z, 3)
      const lastSegment = path[path.length - 1]
      expect(lastSegment.end.x).toBeCloseTo(end.x, 3)
      expect(lastSegment.end.z).toBeCloseTo(end.z, 3)
    })

    it('finds L-shaped path using section corners', () => {
      const start = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(4, WIRE_HEIGHT, 4)

      const path = findPathAlongSectionLines(start, end)

      expect(path.length).toBeGreaterThan(0)
      // Should go through corner at (0, 0) -> (4, 0) -> (4, 4) or (0, 0) -> (0, 4) -> (4, 4)
      expect(path[0].start.x).toBeCloseTo(start.x, 3)
      expect(path[0].start.z).toBeCloseTo(start.z, 3)
      const lastSegment = path[path.length - 1]
      expect(lastSegment.end.x).toBeCloseTo(end.x, 3)
      expect(lastSegment.end.z).toBeCloseTo(end.z, 3)
    })

    it('finds path using multiple section corners (longer path)', () => {
      const start = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(12, WIRE_HEIGHT, 12)

      const path = findPathAlongSectionLines(start, end)

      expect(path.length).toBeGreaterThan(0)
      // Should route through section corners
      expect(path[0].start.x).toBeCloseTo(start.x, 3)
      expect(path[0].start.z).toBeCloseTo(start.z, 3)
      const lastSegment = path[path.length - 1]
      expect(lastSegment.end.x).toBeCloseTo(end.x, 3)
      expect(lastSegment.end.z).toBeCloseTo(end.z, 3)
    })

    it('all segments are horizontal or vertical', () => {
      const start = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(8, WIRE_HEIGHT, 8)

      const path = findPathAlongSectionLines(start, end)

      for (const segment of path) {
        expect(['horizontal', 'vertical']).toContain(segment.type)
        
        // Horizontal segments should have same Z
        if (segment.type === 'horizontal') {
          expect(Math.abs(segment.start.z - segment.end.z)).toBeLessThan(0.001)
        }
        
        // Vertical segments should have same X
        if (segment.type === 'vertical') {
          expect(Math.abs(segment.start.x - segment.end.x)).toBeLessThan(0.001)
        }
      }
    })

    it('all segments are aligned to section lines', () => {
      const start = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(8, WIRE_HEIGHT, 8)

      const path = findPathAlongSectionLines(start, end)

      for (const segment of path) {
        // Start and end positions should be on section lines
        // X coordinates should be multiples of SECTION_SIZE
        const startXRemainder = Math.abs(segment.start.x % SECTION_SIZE)
        const endXRemainder = Math.abs(segment.end.x % SECTION_SIZE)
        expect(startXRemainder < 0.001 || Math.abs(startXRemainder - SECTION_SIZE) < 0.001).toBe(true)
        expect(endXRemainder < 0.001 || Math.abs(endXRemainder - SECTION_SIZE) < 0.001).toBe(true)
        
        // Z coordinates should be multiples of SECTION_SIZE
        const startZRemainder = Math.abs(segment.start.z % SECTION_SIZE)
        const endZRemainder = Math.abs(segment.end.z % SECTION_SIZE)
        expect(startZRemainder < 0.001 || Math.abs(startZRemainder - SECTION_SIZE) < 0.001).toBe(true)
        expect(endZRemainder < 0.001 || Math.abs(endZRemainder - SECTION_SIZE) < 0.001).toBe(true)
      }
    })

    it('segments connect properly (end of one is start of next)', () => {
      const start = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(8, WIRE_HEIGHT, 8)

      const path = findPathAlongSectionLines(start, end)

      for (let i = 0; i < path.length - 1; i++) {
        const current = path[i]
        const next = path[i + 1]
        
        expect(Math.abs(current.end.x - next.start.x)).toBeLessThan(0.001)
        expect(Math.abs(current.end.y - next.start.y)).toBeLessThan(0.001)
        expect(Math.abs(current.end.z - next.start.z)).toBeLessThan(0.001)
      }
    })

    it('all segments have Y coordinate at WIRE_HEIGHT', () => {
      const start = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(8, WIRE_HEIGHT, 8)

      const path = findPathAlongSectionLines(start, end)

      for (const segment of path) {
        expect(segment.start.y).toBe(WIRE_HEIGHT)
        expect(segment.end.y).toBe(WIRE_HEIGHT)
      }
    })

    it('returns empty path if start and end are the same', () => {
      const start = createPosition(4, WIRE_HEIGHT, 4)
      const end = createPosition(4, WIRE_HEIGHT, 4)

      const path = findPathAlongSectionLines(start, end)

      expect(path.length).toBe(0)
    })

    it('returns empty path if start and end are very close', () => {
      const start = createPosition(4, WIRE_HEIGHT, 4)
      const end = createPosition(4.0001, WIRE_HEIGHT, 4.0001)

      const path = findPathAlongSectionLines(start, end)

      expect(path.length).toBe(0)
    })

    it('throws error if start position is not on a section line', () => {
      const start = createPosition(1.5, WIRE_HEIGHT, 2.5) // Not on section line
      const end = createPosition(4, WIRE_HEIGHT, 4)

      expect(() => {
        findPathAlongSectionLines(start, end)
      }).toThrow(/not on a section line/)
    })

    it('uses greedy algorithm - moves to nearest corner that reduces distance', () => {
      const start = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(4, WIRE_HEIGHT, 4)

      const path = findPathAlongSectionLines(start, end)

      // Should move to a corner first (either (4,0) or (0,4))
      // Then move to end
      expect(path.length).toBeGreaterThanOrEqual(1)
      
      // Verify each step reduces distance to end
      for (let i = 0; i < path.length; i++) {
        const segment = path[i]
        const distanceAfter = Math.abs(segment.end.x - end.x) + Math.abs(segment.end.z - end.z)
        const distanceBefore = Math.abs(segment.start.x - end.x) + Math.abs(segment.start.z - end.z)
        
        // Distance should reduce (allow small epsilon for floating point)
        expect(distanceAfter).toBeLessThanOrEqual(distanceBefore + 0.001)
      }
    })

    it('handles negative coordinates correctly', () => {
      const start = createPosition(-4, WIRE_HEIGHT, -4)
      const end = createPosition(0, WIRE_HEIGHT, 0)

      const path = findPathAlongSectionLines(start, end)

      expect(path.length).toBeGreaterThan(0)
      expect(path[0].start.x).toBeCloseTo(start.x, 3)
      expect(path[0].start.z).toBeCloseTo(start.z, 3)
      const lastSegment = path[path.length - 1]
      expect(lastSegment.end.x).toBeCloseTo(end.x, 3)
      expect(lastSegment.end.z).toBeCloseTo(end.z, 3)
    })

    it('handles paths crossing origin', () => {
      const start = createPosition(-4, WIRE_HEIGHT, 0)
      const end = createPosition(4, WIRE_HEIGHT, 0)

      const path = findPathAlongSectionLines(start, end)

      expect(path.length).toBeGreaterThan(0)
      // Should route through origin (0, 0)
      expect(path[0].start.x).toBeCloseTo(start.x, 3)
      const lastSegment = path[path.length - 1]
      expect(lastSegment.end.x).toBeCloseTo(end.x, 3)
    })
  })

  describe('getReachableCorners', () => {
    describe('from section corner (intersection)', () => {
      it('returns exactly 4 corners, one SECTION_SIZE away in each direction', () => {
        const corner = createPosition(0, WIRE_HEIGHT, 0)
        const corners = getReachableCorners(corner)
        
        expect(corners).toHaveLength(4)
        
        // Verify all corners are exactly SECTION_SIZE away
        const expectedCorners = [
          { x: SECTION_SIZE, z: 0 },      // Right
          { x: -SECTION_SIZE, z: 0 },     // Left
          { x: 0, z: SECTION_SIZE },      // Forward
          { x: 0, z: -SECTION_SIZE },     // Back
        ]
        
        for (const expected of expectedCorners) {
          const found = corners.find(c => 
            Math.abs(c.x - expected.x) < 0.001 && 
            Math.abs(c.z - expected.z) < 0.001
          )
          expect(found).toBeDefined()
          expect(found?.y).toBe(WIRE_HEIGHT)
        }
      })
      
      it('works for corners at non-zero positions', () => {
        const corner = createPosition(8, WIRE_HEIGHT, 12)
        const corners = getReachableCorners(corner)
        
        expect(corners).toHaveLength(4)
        
        const expectedCorners = [
          { x: 8 + SECTION_SIZE, z: 12 },
          { x: 8 - SECTION_SIZE, z: 12 },
          { x: 8, z: 12 + SECTION_SIZE },
          { x: 8, z: 12 - SECTION_SIZE },
        ]
        
        for (const expected of expectedCorners) {
          const found = corners.find(c => 
            Math.abs(c.x - expected.x) < 0.001 && 
            Math.abs(c.z - expected.z) < 0.001
          )
          expect(found).toBeDefined()
        }
      })
      
      it('works for negative coordinates', () => {
        const corner = createPosition(-4, WIRE_HEIGHT, -8)
        const corners = getReachableCorners(corner)
        
        expect(corners).toHaveLength(4)
        
        const expectedCorners = [
          { x: -4 + SECTION_SIZE, z: -8 },
          { x: -4 - SECTION_SIZE, z: -8 },
          { x: -4, z: -8 + SECTION_SIZE },
          { x: -4, z: -8 - SECTION_SIZE },
        ]
        
        for (const expected of expectedCorners) {
          const found = corners.find(c => 
            Math.abs(c.x - expected.x) < 0.001 && 
            Math.abs(c.z - expected.z) < 0.001
          )
          expect(found).toBeDefined()
        }
      })
    })
    
    describe('from point on vertical section line (not at corner)', () => {
      it('returns exactly 2 corners - the two nearest along the line', () => {
        // Position at z=2 (on vertical line x=0, but z=2 is NOT a section line, so not a corner)
        const pos = createPosition(0, WIRE_HEIGHT, 2)
        const corners = getReachableCorners(pos)
        
        expect(corners).toHaveLength(2)
        
        // Should return corners at z=0 and z=4 (nearest section corners)
        const zValues = corners.map(c => c.z).sort((a, b) => a - b)
        expect(zValues[0]).toBeCloseTo(0, 3)
        expect(zValues[1]).toBeCloseTo(4, 3)
        
        // Both should be on same vertical line (x=0)
        expect(corners.every(c => Math.abs(c.x - 0) < 0.001)).toBe(true)
      })
      
      it('BUG FIX: returns nearest corners for z=6 (not z=4 and z=12)', () => {
        // This is the bug case - position at z=6
        // Nearest corners should be z=4 and z=8, NOT z=4 and z=12
        const pos = createPosition(0, WIRE_HEIGHT, 6)
        const corners = getReachableCorners(pos)
        
        expect(corners).toHaveLength(2)
        
        const zValues = corners.map(c => c.z).sort((a, b) => a - b)
        // Should be 4 and 8, not 4 and 12
        expect(zValues[0]).toBeCloseTo(4, 3)
        expect(zValues[1]).toBeCloseTo(8, 3)
        expect(zValues[1]).not.toBeCloseTo(12, 3) // Explicitly check it's not 12
      })
      
      it('returns nearest corners for various positions along vertical line', () => {
        const testCases = [
          { z: 1, expected: [0, 4] },      // Between 0 and 4
          { z: 2, expected: [0, 4] },      // Between 0 and 4
          { z: 3, expected: [0, 4] },      // Closer to 4
          { z: 5, expected: [4, 8] },      // Between 4 and 8
          { z: 6, expected: [4, 8] },      // The bug case
          { z: 7, expected: [4, 8] },      // Closer to 8
          { z: 9, expected: [8, 12] },      // Between 8 and 12
          { z: 10, expected: [8, 12] },    // Between 8 and 12
        ]
        
        for (const testCase of testCases) {
          const pos = createPosition(0, WIRE_HEIGHT, testCase.z)
          const corners = getReachableCorners(pos)
          
          expect(corners).toHaveLength(2)
          const zValues = corners.map(c => c.z).sort((a, b) => a - b)
          expect(zValues[0]).toBeCloseTo(testCase.expected[0], 3)
          expect(zValues[1]).toBeCloseTo(testCase.expected[1], 3)
        }
      })
      
      it('works for negative Z coordinates', () => {
        const pos = createPosition(0, WIRE_HEIGHT, -6)
        const corners = getReachableCorners(pos)
        
        expect(corners).toHaveLength(2)
        const zValues = corners.map(c => c.z).sort((a, b) => a - b)
        expect(zValues[0]).toBeCloseTo(-8, 3)
        expect(zValues[1]).toBeCloseTo(-4, 3)
      })
      
      it('works for vertical line at non-zero X', () => {
        const pos = createPosition(8, WIRE_HEIGHT, 6)
        const corners = getReachableCorners(pos)
        
        expect(corners).toHaveLength(2)
        // Should all be on x=8
        expect(corners.every(c => Math.abs(c.x - 8) < 0.001)).toBe(true)
        // Z should be 4 and 8
        const zValues = corners.map(c => c.z).sort((a, b) => a - b)
        expect(zValues[0]).toBeCloseTo(4, 3)
        expect(zValues[1]).toBeCloseTo(8, 3)
      })
    })
    
    describe('from point on horizontal section line (not at corner)', () => {
      it('returns exactly 2 corners - the two nearest along the line', () => {
        // Position at x=2 (on horizontal line z=0, but x=2 is NOT a section line, so not a corner)
        const pos = createPosition(2, WIRE_HEIGHT, 0)
        const corners = getReachableCorners(pos)
        
        expect(corners).toHaveLength(2)
        
        // Should return corners at x=0 and x=4 (nearest section corners)
        const xValues = corners.map(c => c.x).sort((a, b) => a - b)
        expect(xValues[0]).toBeCloseTo(0, 3)
        expect(xValues[1]).toBeCloseTo(4, 3)
        
        // Both should be on same horizontal line (z=0)
        expect(corners.every(c => Math.abs(c.z - 0) < 0.001)).toBe(true)
      })
      
      it('BUG FIX: returns nearest corners for x=6 (not x=4 and x=12)', () => {
        // Same bug case but for horizontal line
        const pos = createPosition(6, WIRE_HEIGHT, 0)
        const corners = getReachableCorners(pos)
        
        expect(corners).toHaveLength(2)
        
        const xValues = corners.map(c => c.x).sort((a, b) => a - b)
        // Should be 4 and 8, not 4 and 12
        expect(xValues[0]).toBeCloseTo(4, 3)
        expect(xValues[1]).toBeCloseTo(8, 3)
        expect(xValues[1]).not.toBeCloseTo(12, 3) // Explicitly check it's not 12
      })
      
      it('returns nearest corners for various positions along horizontal line', () => {
        const testCases = [
          { x: 1, expected: [0, 4] },
          { x: 2, expected: [0, 4] },
          { x: 3, expected: [0, 4] },
          { x: 5, expected: [4, 8] },
          { x: 6, expected: [4, 8] },      // The bug case
          { x: 7, expected: [4, 8] },
          { x: 9, expected: [8, 12] },
          { x: 10, expected: [8, 12] },
        ]
        
        for (const testCase of testCases) {
          const pos = createPosition(testCase.x, WIRE_HEIGHT, 0)
          const corners = getReachableCorners(pos)
          
          expect(corners).toHaveLength(2)
          const xValues = corners.map(c => c.x).sort((a, b) => a - b)
          expect(xValues[0]).toBeCloseTo(testCase.expected[0], 3)
          expect(xValues[1]).toBeCloseTo(testCase.expected[1], 3)
        }
      })
      
      it('works for negative X coordinates', () => {
        const pos = createPosition(-6, WIRE_HEIGHT, 0)
        const corners = getReachableCorners(pos)
        
        expect(corners).toHaveLength(2)
        const xValues = corners.map(c => c.x).sort((a, b) => a - b)
        expect(xValues[0]).toBeCloseTo(-8, 3)
        expect(xValues[1]).toBeCloseTo(-4, 3)
      })
      
      it('works for horizontal line at non-zero Z', () => {
        const pos = createPosition(6, WIRE_HEIGHT, 12)
        const corners = getReachableCorners(pos)
        
        expect(corners).toHaveLength(2)
        // Should all be on z=12
        expect(corners.every(c => Math.abs(c.z - 12) < 0.001)).toBe(true)
        // X should be 4 and 8
        const xValues = corners.map(c => c.x).sort((a, b) => a - b)
        expect(xValues[0]).toBeCloseTo(4, 3)
        expect(xValues[1]).toBeCloseTo(8, 3)
      })
    })
    
    describe('edge cases and boundary conditions', () => {
      it('handles position exactly at section line but not corner (vertical)', () => {
        // Position at (0, 2) - on vertical line x=0, but z=2 is NOT a section line
        // Section lines are at multiples of 4, so z=2 is between z=0 and z=4
        const pos = createPosition(0, WIRE_HEIGHT, 2)
        const corners = getReachableCorners(pos)
        
        expect(corners).toHaveLength(2)
        const zValues = corners.map(c => c.z).sort((a, b) => a - b)
        expect(zValues[0]).toBeCloseTo(0, 3)
        expect(zValues[1]).toBeCloseTo(4, 3)
      })
      
      it('handles position very close to corner (should still return 4 corners)', () => {
        // Position very close to corner but still detected as corner
        const pos = createPosition(0.0001, WIRE_HEIGHT, 0.0001)
        const corners = getReachableCorners(pos)
        
        // Should be detected as corner (both coordinates on section lines)
        expect(corners.length).toBeGreaterThanOrEqual(4)
      })
      
      it('all returned corners are on section lines', () => {
        const testPositions = [
          createPosition(0, WIRE_HEIGHT, 0),      // Corner
          createPosition(0, WIRE_HEIGHT, 6),       // Vertical line
          createPosition(6, WIRE_HEIGHT, 0),       // Horizontal line
          createPosition(8, WIRE_HEIGHT, 12),      // Corner
          createPosition(0, WIRE_HEIGHT, 10),     // Vertical line
        ]
        
        for (const pos of testPositions) {
          const corners = getReachableCorners(pos)
          
          for (const corner of corners) {
            // X should be on section line (multiple of SECTION_SIZE)
            const xRemainder = Math.abs(corner.x % SECTION_SIZE)
            expect(xRemainder < 0.001 || Math.abs(xRemainder - SECTION_SIZE) < 0.001).toBe(true)
            
            // Z should be on section line (multiple of SECTION_SIZE)
            const zRemainder = Math.abs(corner.z % SECTION_SIZE)
            expect(zRemainder < 0.001 || Math.abs(zRemainder - SECTION_SIZE) < 0.001).toBe(true)
            
            // Y should be WIRE_HEIGHT
            expect(corner.y).toBe(WIRE_HEIGHT)
          }
        }
      })
      
      it('corners are always SECTION_SIZE apart from each other (for non-corner positions)', () => {
        const testPositions = [
          createPosition(0, WIRE_HEIGHT, 6),   // Vertical line
          createPosition(6, WIRE_HEIGHT, 0),   // Horizontal line
          createPosition(0, WIRE_HEIGHT, 10),  // Vertical line
          createPosition(10, WIRE_HEIGHT, 0),  // Horizontal line
        ]
        
        for (const pos of testPositions) {
          const corners = getReachableCorners(pos)
          
          if (corners.length === 2) {
            // For positions on a line (not at corner), the two corners should be SECTION_SIZE apart
            const corner1 = corners[0]
            const corner2 = corners[1]
            
            // They should differ by exactly SECTION_SIZE in one coordinate
            const dx = Math.abs(corner1.x - corner2.x)
            const dz = Math.abs(corner1.z - corner2.z)
            
            // One should be 0, the other should be SECTION_SIZE
            const distance = Math.max(dx, dz)
            expect(distance).toBeCloseTo(SECTION_SIZE, 3)
          }
        }
      })
    })
  })
  
  describe('snapToNearestSectionLine', () => {
    it('returns position unchanged if already on a section line', () => {
      const onVerticalLine = createPosition(0, WIRE_HEIGHT, 2)
      const snapped = snapToNearestSectionLine(onVerticalLine)
      
      expect(snapped.x).toBeCloseTo(0, 3)
      expect(snapped.z).toBeCloseTo(2, 3)
      expect(snapped.y).toBe(WIRE_HEIGHT)
    })
    
    it('snaps to nearest horizontal line when horizontal is closer', () => {
      // Position at (1, 1.5) - NOT on any section line
      // Distance to z=0 (horizontal): 1.5
      // Distance to z=4 (horizontal): 2.5
      // Distance to x=0 (vertical): 1
      // Distance to x=4 (vertical): 3
      // Closest is vertical (x=0, distance 1), but test expects horizontal
      // Let's use a position where horizontal is clearly closer
      const pos = createPosition(1.5, WIRE_HEIGHT, 0.5) // Closer to z=0 (distance 0.5) than x=0 (distance 1.5)
      const snapped = snapToNearestSectionLine(pos)
      
      expect(snapped.x).toBeCloseTo(1.5, 3) // X unchanged
      expect(snapped.z).toBeCloseTo(0, 3) // Z snapped to nearest section line
      expect(snapped.y).toBe(WIRE_HEIGHT)
    })
    
    it('snaps to nearest vertical line when vertical is closer', () => {
      // Position at (0.5, 1.5) - NOT on any section line
      // Distance to x=0 (vertical): 0.5
      // Distance to x=4 (vertical): 3.5
      // Distance to z=0 (horizontal): 1.5
      // Distance to z=4 (horizontal): 2.5
      // Closest is vertical (x=0, distance 0.5)
      const pos = createPosition(0.5, WIRE_HEIGHT, 1.5)
      const snapped = snapToNearestSectionLine(pos)
      
      expect(snapped.x).toBeCloseTo(0, 3) // X snapped to nearest section line
      expect(snapped.z).toBeCloseTo(1.5, 3) // Z unchanged
      expect(snapped.y).toBe(WIRE_HEIGHT)
    })
    
    it('prefers horizontal line when distances are equal', () => {
      // Position at (2, 2) - NOT on any section line
      // nearestX = Math.round(2/4)*4 = Math.round(0.5)*4 = 1*4 = 4
      // nearestZ = Math.round(2/4)*4 = Math.round(0.5)*4 = 1*4 = 4
      // distToVertical = |2 - 4| = 2
      // distToHorizontal = |2 - 4| = 2
      // Since distToHorizontal <= distToVertical, prefers horizontal
      const pos = createPosition(2, WIRE_HEIGHT, 2)
      const snapped = snapToNearestSectionLine(pos)
      
      // Should prefer horizontal when distances are equal
      expect(snapped.x).toBeCloseTo(2, 3) // X unchanged
      expect(snapped.z).toBeCloseTo(4, 3) // Z snapped to nearest horizontal line (4, preferred when equal)
      expect(snapped.y).toBe(WIRE_HEIGHT)
    })
    
    it('snaps to correct section line for positions far from origin', () => {
      const pos = createPosition(9, WIRE_HEIGHT, 11)
      const snapped = snapToNearestSectionLine(pos)
      
      // Nearest X: 8 or 12 (9 is closer to 8)
      // Nearest Z: 8 or 12 (11 is closer to 12)
      // Distance to vertical (x=8): 1
      // Distance to horizontal (z=12): 1
      // Should prefer horizontal (equal distance)
      expect(snapped.x).toBeCloseTo(9, 3)
      expect(snapped.z).toBeCloseTo(12, 3)
    })
    
    it('handles negative coordinates correctly', () => {
      // Position at (-1.5, -2.5) - NOT on any section line
      // Nearest X: Math.round(-1.5/4)*4 = Math.round(-0.375)*4 = 0*4 = 0
      // Nearest Z: Math.round(-2.5/4)*4 = Math.round(-0.625)*4 = -1*4 = -4
      // Distance to vertical (x=0): 1.5
      // Distance to horizontal (z=-4): 1.5
      // When equal, prefers horizontal
      const pos = createPosition(-1.5, WIRE_HEIGHT, -2.5)
      const snapped = snapToNearestSectionLine(pos)
      
      // Should prefer horizontal when distances are equal
      expect(snapped.x).toBeCloseTo(-1.5, 3) // X unchanged
      expect(snapped.z).toBeCloseTo(-4, 3) // Z snapped to nearest horizontal line
    })
    
    it('always sets y coordinate to WIRE_HEIGHT', () => {
      const pos = createPosition(1, 999, 1) // Wrong y coordinate
      const snapped = snapToNearestSectionLine(pos)
      
      expect(snapped.y).toBe(WIRE_HEIGHT)
    })
    
    it('handles positions very close to section lines', () => {
      const pos = createPosition(0.0001, WIRE_HEIGHT, 0.0001)
      const snapped = snapToNearestSectionLine(pos)
      
      // Should detect as already on section line
      expect(snapped.x).toBeCloseTo(0.0001, 3)
      expect(snapped.z).toBeCloseTo(0.0001, 3)
    })
    
    it('handles positions exactly between two section lines', () => {
      // Position at (2, 2) - exactly between section lines at 0 and 4
      // Nearest X: Math.round(2/4)*4 = Math.round(0.5)*4 = 1*4 = 4
      // Nearest Z: Math.round(2/4)*4 = Math.round(0.5)*4 = 1*4 = 4
      // Distance to both: 2
      // Should prefer horizontal when equal
      const pos = createPosition(2, WIRE_HEIGHT, 2)
      const snapped = snapToNearestSectionLine(pos)
      
      // Equal distance to both, should prefer horizontal
      expect(snapped.x).toBeCloseTo(2, 3)
      expect(snapped.z).toBeCloseTo(4, 3) // Prefers horizontal when equal (snaps to 4)
    })
  })
  
  describe('isOnSectionLine', () => {
    it('returns true for positions exactly on section lines', () => {
      const testCases = [
        { pos: createPosition(0, WIRE_HEIGHT, 0), axis: 'x' as const, expected: true },
        { pos: createPosition(0, WIRE_HEIGHT, 0), axis: 'z' as const, expected: true },
        { pos: createPosition(4, WIRE_HEIGHT, 0), axis: 'x' as const, expected: true },
        { pos: createPosition(0, WIRE_HEIGHT, 4), axis: 'z' as const, expected: true },
        { pos: createPosition(8, WIRE_HEIGHT, 12), axis: 'x' as const, expected: true },
        { pos: createPosition(8, WIRE_HEIGHT, 12), axis: 'z' as const, expected: true },
        { pos: createPosition(-4, WIRE_HEIGHT, -8), axis: 'x' as const, expected: true },
        { pos: createPosition(-4, WIRE_HEIGHT, -8), axis: 'z' as const, expected: true },
      ]
      
      for (const testCase of testCases) {
        expect(isOnSectionLine(testCase.pos, testCase.axis)).toBe(testCase.expected)
      }
    })
    
    it('returns false for positions not on section lines', () => {
      const testCases = [
        { pos: createPosition(1, WIRE_HEIGHT, 0), axis: 'x' as const, expected: false },
        { pos: createPosition(0, WIRE_HEIGHT, 1), axis: 'z' as const, expected: false },
        { pos: createPosition(2, WIRE_HEIGHT, 3), axis: 'x' as const, expected: false },
        { pos: createPosition(2, WIRE_HEIGHT, 3), axis: 'z' as const, expected: false },
        { pos: createPosition(5, WIRE_HEIGHT, 6), axis: 'x' as const, expected: false },
        { pos: createPosition(5, WIRE_HEIGHT, 6), axis: 'z' as const, expected: false },
      ]
      
      for (const testCase of testCases) {
        expect(isOnSectionLine(testCase.pos, testCase.axis)).toBe(testCase.expected)
      }
    })
    
    it('handles floating point precision correctly', () => {
      // Positions very close to section lines should still be detected
      const closeToLine = createPosition(0.0001, WIRE_HEIGHT, 0.0001)
      expect(isOnSectionLine(closeToLine, 'x')).toBe(true)
      expect(isOnSectionLine(closeToLine, 'z')).toBe(true)
      
      // Positions slightly further away should not be detected
      const farFromLine = createPosition(0.002, WIRE_HEIGHT, 0.002)
      expect(isOnSectionLine(farFromLine, 'x')).toBe(false)
      expect(isOnSectionLine(farFromLine, 'z')).toBe(false)
    })
    
    it('handles negative coordinates correctly', () => {
      expect(isOnSectionLine(createPosition(-4, WIRE_HEIGHT, 0), 'x')).toBe(true)
      expect(isOnSectionLine(createPosition(0, WIRE_HEIGHT, -4), 'z')).toBe(true)
      expect(isOnSectionLine(createPosition(-3, WIRE_HEIGHT, 0), 'x')).toBe(false)
      expect(isOnSectionLine(createPosition(0, WIRE_HEIGHT, -3), 'z')).toBe(false)
    })
  })
  
  describe('checkCanReachDirectly', () => {
    it('returns true when destination is on same vertical line and within SECTION_SIZE', () => {
      const current = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(0, WIRE_HEIGHT, 2) // 2 units away, less than SECTION_SIZE (4)
      
      expect(checkCanReachDirectly(current, end)).toBe(true)
    })
    
    it('returns false when destination is on same vertical line but beyond SECTION_SIZE', () => {
      const current = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(0, WIRE_HEIGHT, 5) // 5 units away, more than SECTION_SIZE (4)
      
      expect(checkCanReachDirectly(current, end)).toBe(false)
    })
    
    it('returns true when destination is on same horizontal line and within SECTION_SIZE', () => {
      const current = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(2, WIRE_HEIGHT, 0) // 2 units away, less than SECTION_SIZE (4)
      
      expect(checkCanReachDirectly(current, end)).toBe(true)
    })
    
    it('returns false when destination is on same horizontal line but beyond SECTION_SIZE', () => {
      const current = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(5, WIRE_HEIGHT, 0) // 5 units away, more than SECTION_SIZE (4)
      
      expect(checkCanReachDirectly(current, end)).toBe(false)
    })
    
    it('returns false when destination is not on same section line', () => {
      const current = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(2, WIRE_HEIGHT, 2) // Different X and Z
      
      expect(checkCanReachDirectly(current, end)).toBe(false)
    })
    
    it('returns false when destination is on same horizontal line but different X and distance > SECTION_SIZE', () => {
      const current = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(5, WIRE_HEIGHT, 0) // Different X coordinate, distance > SECTION_SIZE
      
      expect(checkCanReachDirectly(current, end)).toBe(false)
    })
    
    it('returns true when destination is on same horizontal line and distance equals SECTION_SIZE', () => {
      const current = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(4, WIRE_HEIGHT, 0) // Same Z, distance = SECTION_SIZE
      
      expect(checkCanReachDirectly(current, end)).toBe(true)
    })
    
    it('returns false when destination is on same vertical line but different Z', () => {
      const current = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(0, WIRE_HEIGHT, 5) // Different Z coordinate, distance > SECTION_SIZE
      
      expect(checkCanReachDirectly(current, end)).toBe(false)
    })
    
    it('returns true when destination is on same vertical line and distance equals SECTION_SIZE', () => {
      const current = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(0, WIRE_HEIGHT, 4) // Same X, distance = SECTION_SIZE
      
      expect(checkCanReachDirectly(current, end)).toBe(true)
    })
    
    it('handles edge case: distance exactly equal to SECTION_SIZE', () => {
      const current = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(0, WIRE_HEIGHT, SECTION_SIZE) // Exactly SECTION_SIZE away
      
      // Should return true because distance can be up to and including SECTION_SIZE
      expect(checkCanReachDirectly(current, end)).toBe(true)
    })
    
    it('handles edge case: distance just under SECTION_SIZE', () => {
      const current = createPosition(0, WIRE_HEIGHT, 0)
      // Distance must be less than SECTION_SIZE - 0.001, so use a smaller value
      const end = createPosition(0, WIRE_HEIGHT, SECTION_SIZE - 0.002) // Just under threshold
      
      expect(checkCanReachDirectly(current, end)).toBe(true)
    })
    
    it('handles negative coordinates correctly', () => {
      const current = createPosition(0, WIRE_HEIGHT, -4)
      const end = createPosition(0, WIRE_HEIGHT, -6) // 2 units away (negative direction)
      
      expect(checkCanReachDirectly(current, end)).toBe(true)
      
      const end2 = createPosition(0, WIRE_HEIGHT, -9) // 5 units away
      expect(checkCanReachDirectly(current, end2)).toBe(false)
    })
  })
  
  describe('pathfinding edge cases and boundary conditions', () => {
    it('handles destination very close to start (should return empty path)', () => {
      const start = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(0.0001, WIRE_HEIGHT, 0.0001)
      
      const path = findPathAlongSectionLines(start, end)
      expect(path.length).toBe(0)
    })
    
    it('handles destination exactly at SECTION_SIZE distance on same line', () => {
      const start = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(0, WIRE_HEIGHT, SECTION_SIZE)
      
      const path = findPathAlongSectionLines(start, end)
      // Should route through a corner, not directly
      expect(path.length).toBeGreaterThan(0)
    })
    
    it('handles very long paths correctly', () => {
      const start = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(40, WIRE_HEIGHT, 40) // 10 section cells away
      
      const path = findPathAlongSectionLines(start, end)
      
      expect(path.length).toBeGreaterThan(0)
      expect(path[0].start.x).toBeCloseTo(start.x, 3)
      expect(path[0].start.z).toBeCloseTo(start.z, 3)
      const lastSegment = path[path.length - 1]
      expect(lastSegment.end.x).toBeCloseTo(end.x, 3)
      expect(lastSegment.end.z).toBeCloseTo(end.z, 3)
    })
    
    it('handles paths that require many corner turns', () => {
      const start = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(20, WIRE_HEIGHT, 20)
      
      const path = findPathAlongSectionLines(start, end)
      
      // Should route through multiple corners
      expect(path.length).toBeGreaterThan(2)
      
      // Verify path is valid
      for (let i = 0; i < path.length - 1; i++) {
        const current = path[i]
        const next = path[i + 1]
        expect(Math.abs(current.end.x - next.start.x)).toBeLessThan(0.001)
        expect(Math.abs(current.end.z - next.start.z)).toBeLessThan(0.001)
      }
    })
    
    it('never creates segments that go backwards (distance should always decrease)', () => {
      const start = createPosition(0, WIRE_HEIGHT, 0)
      const end = createPosition(12, WIRE_HEIGHT, 12)
      
      const path = findPathAlongSectionLines(start, end)
      
      let currentPos = start
      for (const segment of path) {
        const distanceBefore = Math.abs(currentPos.x - end.x) + Math.abs(currentPos.z - end.z)
        const distanceAfter = Math.abs(segment.end.x - end.x) + Math.abs(segment.end.z - end.z)
        
        // Distance should decrease (allow small epsilon for floating point)
        expect(distanceAfter).toBeLessThanOrEqual(distanceBefore + 0.001)
        
        currentPos = segment.end
      }
    })
  })
})

