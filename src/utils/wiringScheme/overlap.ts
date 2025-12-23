/**
 * Wire Segment Overlap Detection
 * 
 * This module provides functions to detect when wire segments overlap
 * on the same section lines. Used to prevent wires from overlapping during pathfinding.
 */

import type { WireSegment } from './types'

const TOLERANCE = 0.001

/**
 * Check if two segments are on the same section line.
 * 
 * Two segments are on the same line if:
 * - Both are horizontal (same z coordinate)
 * - Both are vertical (same x coordinate)
 * 
 * @param segment1 - First segment
 * @param segment2 - Second segment
 * @returns True if segments are on the same section line
 */
export function areSegmentsOnSameSectionLine(segment1: WireSegment, segment2: WireSegment): boolean {
  // Check if both are horizontal (same z coordinate)
  const bothHorizontal = 
    Math.abs(segment1.start.z - segment1.end.z) < TOLERANCE &&
    Math.abs(segment2.start.z - segment2.end.z) < TOLERANCE
  
  if (bothHorizontal) {
    // For horizontal segments, z coordinates must match
    return Math.abs(segment1.start.z - segment2.start.z) < TOLERANCE
  }
  
  // Check if both are vertical (same x coordinate)
  const bothVertical = 
    Math.abs(segment1.start.x - segment1.end.x) < TOLERANCE &&
    Math.abs(segment2.start.x - segment2.end.x) < TOLERANCE
  
  if (bothVertical) {
    // For vertical segments, x coordinates must match
    return Math.abs(segment1.start.x - segment2.start.x) < TOLERANCE
  }
  
  // One is horizontal and one is vertical - not on same line
  return false
}

/**
 * Check if two 1D coordinate ranges overlap.
 * 
 * Handles ranges in either direction (min can be > max if segment is reversed).
 * Assumes both ranges represent segments (non-zero length).
 * 
 * Algorithm: If the total length of the two segments is greater than the span
 * (distance from min of all coordinates to max of all coordinates), then they overlap.
 * 
 * Overlap rules:
 * - Wires cannot share corners (endpoint-to-endpoint touching is overlap)
 * - Any touching (endpoints, interior points, crossings) IS overlap
 * 
 * @param min1 - Minimum coordinate of first range
 * @param max1 - Maximum coordinate of first range
 * @param min2 - Minimum coordinate of second range
 * @param max2 - Maximum coordinate of second range
 * @returns True if ranges overlap (including endpoint touches)
 */
export function coordinateRangesOverlap(
  min1: number,
  max1: number,
  min2: number,
  max2: number
): boolean {
  // Normalize ranges (handle reversed segments)
  const range1Min = Math.min(min1, max1)
  const range1Max = Math.max(min1, max1)
  const range2Min = Math.min(min2, max2)
  const range2Max = Math.max(min2, max2)
  
  // Calculate total length of both segments
  const length1 = range1Max - range1Min
  const length2 = range2Max - range2Min
  const totalLength = length1 + length2
  
  // Calculate span: distance from minimum of all coordinates to maximum of all coordinates
  const minCoord = Math.min(range1Min, range2Min)
  const maxCoord = Math.max(range1Max, range2Max)
  const span = maxCoord - minCoord
  
  // If total length > span, segments overlap (they share some space)
  // If total length = span, segments touch at endpoints (still overlap - wires can't share corners)
  // If total length < span, segments don't overlap (gap between them)
  return totalLength > span - TOLERANCE
}

/**
 * Check if two wire segments overlap.
 * 
 * Two segments overlap if:
 * 1. They are on the same section line (horizontal or vertical)
 * 2. Their coordinate ranges overlap along that line
 * 
 * Edge cases handled:
 * - Exact segment matches
 * - One segment completely contained within another
 * - Segments that touch at endpoints (counts as overlap)
 * - Zero-length segments
 * - Reversed segments (start > end)
 * 
 * @param segment1 - First segment
 * @param segment2 - Second segment
 * @returns True if segments overlap
 */
export function segmentsOverlap(segment1: WireSegment, segment2: WireSegment): boolean {
  // First check if segments are on the same section line
  if (!areSegmentsOnSameSectionLine(segment1, segment2)) {
    return false
  }
  
  // Determine if segments are horizontal or vertical
  const isHorizontal = Math.abs(segment1.start.z - segment1.end.z) < TOLERANCE
  
  if (isHorizontal) {
    // Horizontal segments: check x coordinate ranges
    return coordinateRangesOverlap(
      segment1.start.x,
      segment1.end.x,
      segment2.start.x,
      segment2.end.x
    )
  } else {
    // Vertical segments: check z coordinate ranges
    return coordinateRangesOverlap(
      segment1.start.z,
      segment1.end.z,
      segment2.start.z,
      segment2.end.z
    )
  }
}

/**
 * Check if a potential segment would overlap with any existing segments.
 * 
 * @param potentialSegment - The segment to check
 * @param existingSegments - Array of existing wire segments
 * @returns True if potential segment overlaps with any existing segment
 */
export function wouldOverlapWithExisting(
  potentialSegment: WireSegment,
  existingSegments: WireSegment[]
): boolean {
  return existingSegments.some(existing => segmentsOverlap(potentialSegment, existing))
}

