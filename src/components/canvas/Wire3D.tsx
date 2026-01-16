import { Line } from '@react-three/drei'
import { colors } from '@/theme'
import type { WireSegment, WirePath } from '@/utils/wiringScheme/types'
import { WIRE_HEIGHT, HOP_HEIGHT } from '@/utils/wiringScheme/types'

interface Wire3DProps {
  /** Start position (for validation only - actual path uses segments) */
  start: { x: number; y: number; z: number } | null
  /** End position (for validation only - actual path uses segments) */
  end: { x: number; y: number; z: number } | null
  /** Pre-calculated path with segments (required) */
  precomputedPath?: WirePath
  /** Whether the wire is carrying an active (high) signal */
  isActive?: boolean
  /** Whether the wire is being previewed during wiring operation */
  isPreview?: boolean
  /** Whether the wire is selected */
  isSelected?: boolean
}

/**
 * Wire3D renders a wire as a series of line segments.
 * Supports arc segments for wire crossings (hops).
 *
 * @param props - Wire properties
 * @returns React Three Fiber element or null if invalid
 */
export function Wire3D({
  start,
  end,
  precomputedPath,
  isActive = false,
  isPreview = false,
  isSelected = false
}: Wire3DProps) {
  // Guard against undefined positions
  if (!start || !end) return null

  // Precomputed path is required - no fallback calculation
  if (!precomputedPath) {
    // Defensive measure: if precomputedPath is missing, it's a bug in path calculation
    // Return null instead of throwing to prevent component crash
    console.error('[Wire3D] precomputedPath is required but not provided', {
      start,
      end,
    })
    return null
  }

  const pathSegments: WireSegment[] = precomputedPath.segments

  // Wire color - use selected color if selected, otherwise use active/inactive based on signal
  const wireColor = isSelected
    ? colors.wire.selected
    : isActive
      ? colors.wire.active
      : colors.wire.default // Always use copper for non-active wires (default and preview)

  /**
   * Generate points along a semi-circular arc.
   * Arc starts and ends at WIRE_HEIGHT, peaks at HOP_HEIGHT in the middle.
   * Uses proper parametric equations for a perfect semi-circle.
   *
   * IMPORTANT: The first and last points are forced to match segment.start and segment.end
   * exactly to ensure the arc connects properly to the cut points, eliminating gaps
   * where the original segment might show through.
   */
  const generateArcPoints = (segment: WireSegment): Array<[number, number, number]> => {
    if (segment.type !== 'arc' || !segment.arcCenter || segment.arcRadius === undefined) {
      // Fallback to straight line if arc metadata missing
      return [
        [segment.start.x, segment.start.y, segment.start.z],
        [segment.end.x, segment.end.y, segment.end.z],
      ]
    }

    const center = segment.arcCenter
    const radius = segment.arcRadius
    const points: Array<[number, number, number]> = []

    // Determine arc orientation from start/end points
    const isHorizontal = Math.abs(segment.start.z - segment.end.z) < 0.001

    // CRITICAL: Force first point to match segment.start exactly
    // This ensures the arc connects exactly to the cut point, eliminating gaps
    points.push([segment.start.x, segment.start.y, segment.start.z])

    // Calculate the actual offsets from center for start and end
    // This accounts for segment direction and boundary adjustments
    const startOffset = isHorizontal
      ? segment.start.x - center.x
      : segment.start.z - center.z
    const endOffset = isHorizontal
      ? segment.end.x - center.x
      : segment.end.z - center.z

    // For a semi-circular arc, determine the starting angle based on direction
    // The arc should span exactly π radians
    // If going from negative to positive offset: start at π, end at 0
    // If going from positive to negative offset: start at 0, end at π
    const isIncreasing = startOffset < endOffset
    const startAngle = isIncreasing ? Math.PI : 0
    const endAngle = isIncreasing ? 0 : Math.PI

    // Generate intermediate points along the semi-circle using parametric equations
    // For a perfect semi-circle, we use parametric equations where:
    // - t goes from 0 to π (semi-circle)
    // - angle interpolates from startAngle to endAngle
    // - y follows a sinusoidal path: WIRE_HEIGHT + (HOP_HEIGHT - WIRE_HEIGHT) * sin(t)
    const numPoints = 30 // Number of points for smooth curve
    // Generate intermediate points (skip first and last)
    for (let i = 1; i < numPoints; i++) {
      const t = (i / numPoints) * Math.PI // t goes from 0 to π

      // Interpolate angle from startAngle to endAngle
      const angle = startAngle + (endAngle - startAngle) * (t / Math.PI)

      // Calculate position on circle at this angle
      // Use the actual radius (which may differ slightly from HOP_RADIUS due to boundary adjustments)
      const offset = radius * Math.cos(angle)

      let x: number
      let z: number
      const y = WIRE_HEIGHT + (HOP_HEIGHT - WIRE_HEIGHT) * Math.sin(t)

      if (isHorizontal) {
        // Horizontal arc: x varies in a circle, z is constant
        x = center.x + offset
        z = center.z
      } else {
        // Vertical arc: z varies in a circle, x is constant
        x = center.x
        z = center.z + offset
      }

      points.push([x, y, z])
    }

    // CRITICAL: Force last point to match segment.end exactly
    // This ensures the arc connects exactly to the cut point, eliminating gaps
    points.push([segment.end.x, segment.end.y, segment.end.z])

    return points
  }

  // Render segments as lines (no thickness, elegant look like grid lines)
  return (
    <>
      {pathSegments.map((segment, index) => {
        let points: Array<[number, number, number]>

        if (segment.type === 'arc') {
          // Arc segments: generate curved points
          points = generateArcPoints(segment)
        } else {
          // Regular segments: simple straight line
          points = [
            [segment.start.x, segment.start.y, segment.start.z],
            [segment.end.x, segment.end.y, segment.end.z],
          ]
        }

        return (
          <Line
            key={`segment-${index}`}
            points={points}
            color={wireColor}
            lineWidth={isSelected ? 3 : 1}
            transparent
            opacity={isPreview ? 0.7 : 1}
          />
        )
      })}
    </>
  )
}
