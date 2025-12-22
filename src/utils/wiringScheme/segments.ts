/**
 * Entry and Exit Segment Calculation
 * 
 * Calculates segments that extend from pin centers to nearest section lines.
 * Entry segments connect from section line to pin center (for input pins).
 * Exit segments connect from pin center to section line (for output pins).
 */

import type { Position, PinOrientation, WireSegment } from './types'
import { SECTION_SIZE, WIRE_HEIGHT } from './types'

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

