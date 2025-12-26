/**
 * Segment Creation and Manipulation Utilities
 * 
 * This module provides functions for:
 * - Creating entry/exit segments (pin ↔ section line)
 * - Manipulating and analyzing wire segments (combining, length calculation)
 * - Collecting segments from wire arrays
 */

import type { Position, PinOrientation, WireSegment } from './types'
import type { Wire } from '@/store/types'
import { SECTION_SIZE, WIRE_HEIGHT } from './types'

const TOLERANCE = 0.001

/**
 * Calculate exit segment from pin center to nearest section line.
 * The segment extends straight in the pin's facing direction until it hits a section line.
 * 
 * @param pinCenter - Pin center position
 * @param orientation - Pin orientation (direction the pin faces)
 * @returns Exit segment (from pin center to section line)
 */
export function calculateExitSegment(
  pinCenter: Position,
  orientation: PinOrientation
): WireSegment {
  const dir = orientation.direction
  const isHorizontal = Math.abs(dir.x) > Math.abs(dir.z)
  
  let sectionLinePos: Position
  
  if (isHorizontal) {
    // Pin faces horizontally - extend to nearest vertical section line (X-axis)
    // Determine direction: if pin faces positive X, move to next section line in that direction
    // If pin faces negative X, move to previous section line
    const targetX = dir.x > 0 
      ? Math.ceil(pinCenter.x / SECTION_SIZE) * SECTION_SIZE
      : Math.floor(pinCenter.x / SECTION_SIZE) * SECTION_SIZE
    
    sectionLinePos = {
      x: targetX,
      y: WIRE_HEIGHT,
      z: pinCenter.z,
    }
  } else {
    // Pin faces vertically - extend to nearest horizontal section line (Z-axis)
    // Determine direction: if pin faces positive Z, move to next section line in that direction
    // If pin faces negative Z, move to previous section line
    const targetZ = dir.z > 0
      ? Math.ceil(pinCenter.z / SECTION_SIZE) * SECTION_SIZE
      : Math.floor(pinCenter.z / SECTION_SIZE) * SECTION_SIZE
    
    sectionLinePos = {
      x: pinCenter.x,
      y: WIRE_HEIGHT,
      z: targetZ,
    }
  }
  
  return {
    start: { ...pinCenter, y: WIRE_HEIGHT },
    end: sectionLinePos,
    type: 'exit',
  }
}

/**
 * Calculate entry segment from nearest section line to pin center.
 * The segment extends from a section line straight toward the pin center.
 * This is the reverse of an exit segment.
 * 
 * @param pinCenter - Pin center position
 * @param orientation - Pin orientation (direction the pin faces)
 * @returns Entry segment (from section line to pin center)
 */
export function calculateEntrySegment(
  pinCenter: Position,
  orientation: PinOrientation
): WireSegment {
  const dir = orientation.direction
  const isHorizontal = Math.abs(dir.x) > Math.abs(dir.z)
  
  let sectionLinePos: Position
  
  if (isHorizontal) {
    // Pin faces horizontally - entry from vertical section line (X-axis)
    // Entry segment comes from the section line in the same direction the pin faces
    // This ensures the wire approaches the pin from the correct side (not through the gate)
    // Pin facing positive X (right) → entry from section line to the right (Math.ceil)
    // Pin facing negative X (left) → entry from section line to the left (Math.floor)
    const targetX = dir.x > 0
      ? Math.ceil(pinCenter.x / SECTION_SIZE) * SECTION_SIZE
      : Math.floor(pinCenter.x / SECTION_SIZE) * SECTION_SIZE
    
    // Project pin center onto the section line (keep pin's Z coordinate)
    sectionLinePos = {
      x: targetX,
      y: WIRE_HEIGHT,
      z: pinCenter.z,
    }
  } else {
    // Pin faces vertically - entry from horizontal section line (Z-axis)
    // Entry segment comes from the section line in the same direction the pin faces
    // This ensures the wire approaches the pin from the correct side (not through the gate)
    // Pin facing positive Z → entry from section line in positive Z direction (Math.ceil)
    // Pin facing negative Z → entry from section line in negative Z direction (Math.floor)
    const targetZ = dir.z > 0
      ? Math.ceil(pinCenter.z / SECTION_SIZE) * SECTION_SIZE
      : Math.floor(pinCenter.z / SECTION_SIZE) * SECTION_SIZE
    
    // Project pin center onto the section line (keep pin's X coordinate)
    sectionLinePos = {
      x: pinCenter.x,
      y: WIRE_HEIGHT,
      z: targetZ,
    }
  }
  
  return {
    start: sectionLinePos,
    end: { ...pinCenter, y: WIRE_HEIGHT },
    type: 'entry',
  }
}

/**
 * Calculate total length of all segments in a path.
 * 
 * @param segments - Array of wire segments
 * @returns Total length
 */
export function calculateTotalLength(segments: Array<{ start: Position; end: Position }>): number {
  return segments.reduce((sum, seg) => {
    const dx = seg.end.x - seg.start.x
    const dy = seg.end.y - seg.start.y
    const dz = seg.end.z - seg.start.z
    return sum + Math.sqrt(dx * dx + dy * dy + dz * dz)
  }, 0)
}

/**
 * Check if a segment is a routing segment (horizontal or vertical).
 * Entry and exit segments are not routing segments.
 * 
 * @param segment - Segment to check
 * @returns True if segment is horizontal or vertical
 */
function isRoutingSegment(segment: WireSegment): boolean {
  return segment.type === 'horizontal' || segment.type === 'vertical'
}

/**
 * Check if two segments are of the same routing type.
 * 
 * @param seg1 - First segment
 * @param seg2 - Second segment
 * @returns True if both are horizontal or both are vertical
 */
function areSameRoutingType(seg1: WireSegment, seg2: WireSegment): boolean {
  // Both must be routing segments
  if (!isRoutingSegment(seg1) || !isRoutingSegment(seg2)) {
    return false
  }
  
  // Check if both are horizontal or both are vertical
  const seg1IsHorizontal = seg1.type === 'horizontal' || Math.abs(seg1.start.z - seg1.end.z) < TOLERANCE
  const seg2IsHorizontal = seg2.type === 'horizontal' || Math.abs(seg2.start.z - seg2.end.z) < TOLERANCE
  
  return seg1IsHorizontal === seg2IsHorizontal
}

/**
 * Combine adjacent segments of the same type (horizontal or vertical) into single segments.
 * This removes backtracking and overlapping segments by creating combined segments from
 * the start of the first segment to the end of the last segment.
 * 
 * Entry and exit segments are preserved as-is and never combined.
 * 
 * @param segments - Array of wire segments
 * @returns Array of combined segments
 * 
 * @internal Exported for testing only
 */
export function combineAdjacentSegments(segments: WireSegment[]): WireSegment[] {
  if (segments.length === 0) {
    return []
  }
  
  if (segments.length === 1) {
    return [...segments]
  }
  
  const result: WireSegment[] = []
  let currentGroup: WireSegment[] = [segments[0]]
  
  for (let i = 1; i < segments.length; i++) {
    const currentSegment = segments[i]
    const lastGroupSegment = currentGroup[currentGroup.length - 1]
    
    // Check if we can combine: same routing type (routing algorithm ensures segments are adjacent)
    if (areSameRoutingType(lastGroupSegment, currentSegment)) {
      // Add to current group for combination
      currentGroup.push(currentSegment)
    } else {
      // Cannot combine - finalize current group and start new one
      if (currentGroup.length > 1) {
        // Combine the group: from first start to last end
        const firstSegment = currentGroup[0]
        const lastSegment = currentGroup[currentGroup.length - 1]
        
        result.push({
          start: firstSegment.start,
          end: lastSegment.end,
          type: firstSegment.type, // Preserve type (horizontal or vertical)
        })
      } else {
        // Single segment - add as-is
        result.push(currentGroup[0])
      }
      
      // Start new group with current segment
      currentGroup = [currentSegment]
    }
  }
  
  // Finalize the last group
  if (currentGroup.length > 1) {
    // Combine the group: from first start to last end
    const firstSegment = currentGroup[0]
    const lastSegment = currentGroup[currentGroup.length - 1]
    
    result.push({
      start: firstSegment.start,
      end: lastSegment.end,
      type: firstSegment.type, // Preserve type (horizontal or vertical)
    })
  } else {
    // Single segment - add as-is
    result.push(currentGroup[0])
  }
  
  return result
}

/**
 * Collect all wire segments from an array of wires.
 * Optionally filters wires before collecting segments.
 * 
 * @param wires - Array of wires to collect segments from
 * @param filterFn - Optional function to filter which wires to include
 * @returns Array of all wire segments from the filtered wires
 * 
 * @example
 * // Collect all segments from all wires
 * const allSegments = collectWireSegments(wires)
 * 
 * @example
 * // Collect segments from wires excluding specific ones
 * const otherSegments = collectWireSegments(wires, (wire) => 
 *   !connectedWires.some(cw => cw.id === wire.id)
 * )
 */
export function collectWireSegments(
  wires: Wire[],
  filterFn?: (wire: Wire) => boolean
): WireSegment[] {
  const segments: WireSegment[] = []
  
  for (const wire of wires) {
    // Apply filter if provided
    if (filterFn && !filterFn(wire)) {
      continue
    }
    
    // Collect segments from this wire if they exist
    if (wire.segments && wire.segments.length > 0) {
      segments.push(...wire.segments)
    }
  }
  
  return segments
}
