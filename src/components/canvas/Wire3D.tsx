import { Line } from '@react-three/drei'
import { colors } from '@/theme'
import type { WireSegment, WirePath } from '@/utils/wiringScheme/types'
import { WIRE_HEIGHT, HOP_HEIGHT } from '@/utils/wiringScheme/types'
import type { GateInstance } from '@/store/types'

interface Wire3DProps {
  start: { x: number; y: number; z: number } | null
  end: { x: number; y: number; z: number } | null
  startOrientation?: { x: number; y: number; z: number } | null
  endOrientation?: { x: number; y: number; z: number } | null
  gates?: GateInstance[] // Gates to avoid in routing
  sourceGateId?: string // Source gate ID (to exclude from avoidance for entry/exit segments)
  destinationGateId?: string // Destination gate ID (to exclude from avoidance for entry/exit segments)
  existingWires?: Array<{ id: string; segments: WireSegment[] }> | WireSegment[] // Not used in new scheme, kept for compatibility
  precomputedPath?: WirePath // Pre-calculated path (required - no fallback)
  color?: string
  isActive?: boolean
  isPreview?: boolean
}

export function Wire3D({
  start,
  end,
  startOrientation,
  endOrientation,
  gates: _gates = [],
  sourceGateId,
  destinationGateId,
  existingWires: _existingWires = [], // Not used in new scheme
  precomputedPath,
  color: _color = colors.gate.wireStub,
  isActive = false,
  isPreview = false
}: Wire3DProps) {
  // Guard against undefined positions
  if (!start || !end) return null

  // Precomputed path is required - no fallback calculation
  if (!precomputedPath) {
    // Defensive measure: if precomputedPath is missing, it's a bug in path calculation
    // Return null instead of throwing to prevent component crash
    // The error should be handled upstream where the path is calculated
    console.error('[Wire3D] precomputedPath is required but not provided', {
      start,
      end,
      startOrientation,
      endOrientation,
      sourceGateId,
      destinationGateId,
    })
    return null
  }

  const pathSegments: WireSegment[] = precomputedPath.segments

  // Wire color - use reddish copper for default and preview (same color)
  const wireColor = isActive
    ? colors.wire.active
    : colors.wire.default // Always use copper for non-active wires (default and preview)

  /**
   * Generate points along a semi-circular arc.
   * Arc starts and ends at WIRE_HEIGHT, peaks at HOP_HEIGHT in the middle.
   * Uses proper parametric equations for a perfect semi-circle.
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

    // Generate points along the semi-circle using parametric equations
    // For a perfect semi-circle, we use parametric equations where:
    // - t goes from 0 to π (semi-circle)
    // - x/z follows a circular path: center ± radius * cos(π - t)
    // - y follows a sinusoidal path: WIRE_HEIGHT + (HOP_HEIGHT - WIRE_HEIGHT) * sin(t)
    const numPoints = 30 // Number of points for smooth curve
    for (let i = 0; i <= numPoints; i++) {
      const t = (i / numPoints) * Math.PI // t goes from 0 to π

      // Parametric equations for perfect semi-circle:
      // At t=0: x/z = center - radius, y = WIRE_HEIGHT
      // At t=π/2: x/z = center, y = HOP_HEIGHT (peak)
      // At t=π: x/z = center + radius, y = WIRE_HEIGHT
      let x: number
      let z: number
      const y = WIRE_HEIGHT + (HOP_HEIGHT - WIRE_HEIGHT) * Math.sin(t)

      if (isHorizontal) {
        // Horizontal arc: x varies in a circle, z is constant
        // x(t) = center.x + radius * cos(π - t)
        // This gives: x(0) = center.x - radius, x(π) = center.x + radius
        x = center.x + radius * Math.cos(Math.PI - t)
        z = center.z
      } else {
        // Vertical arc: z varies in a circle, x is constant
        // z(t) = center.z + radius * cos(π - t)
        // This gives: z(0) = center.z - radius, z(π) = center.z + radius
        x = center.x
        z = center.z + radius * Math.cos(Math.PI - t)
      }

      points.push([x, y, z])
    }

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
            lineWidth={1}
            transparent
            opacity={isPreview ? 0.7 : 1}
          />
        )
      })}
    </>
  )
}
