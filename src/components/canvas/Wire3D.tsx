import { Line } from '@react-three/drei'
import { colors } from '@/theme'
import type { WireSegment, WirePath } from '@/utils/wiringScheme/types'
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
    const errorMsg = `Wire3D: precomputedPath is required but not provided. Start: ${JSON.stringify(start)}, End: ${JSON.stringify(end)}`
    console.error(errorMsg)
    console.error('Wire3D props:', { start, end, startOrientation, endOrientation, sourceGateId, destinationGateId })
    throw new Error(errorMsg)
  }
  
  const pathSegments: WireSegment[] = precomputedPath.segments
  
  // Wire color - use reddish copper for default and preview (same color)
  const wireColor = isActive 
    ? colors.wire.active 
    : colors.wire.default // Always use copper for non-active wires (default and preview)
  
  // Render segments as lines (no thickness, elegant look like grid lines)
  return (
    <>
      {pathSegments.map((segment, index) => {
        {
          // Regular segments: simple straight line
          const points: Array<[number, number, number]> = [
            [segment.start.x, segment.start.y, segment.start.z],
            [segment.end.x, segment.end.y, segment.end.z],
          ]
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
        }
      })}
    </>
  )
}
