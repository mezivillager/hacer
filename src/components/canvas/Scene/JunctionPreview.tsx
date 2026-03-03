import { useCircuitStore } from '@/store/circuitStore'
import { semanticColors } from '@/theme'
import { findNearestWire } from '@/utils/wireHitTest'
import { findWireCorners } from '@/utils/wirePosition'
import { JUNCTION_CONFIG } from '@/nodes/config/nodeConfig'
import type { Position } from '@/store/types'

/**
 * Maximum distance from cursor to wire corner to show preview (in world units).
 */
const PREVIEW_THRESHOLD = 0.3

/**
 * Calculate 3D distance between two positions.
 *
 * @param a - First position
 * @param b - Second position
 * @returns Euclidean distance
 */
function distance3D(a: Position, b: Position): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * JunctionPreview - Shows a preview when cursor is near a valid wire corner during junction placement.
 * Subscribes to junctionPlacementMode and junctionPreviewPosition.
 *
 * The preview appears as a semi-transparent sphere at the nearest valid wire corner
 * when the cursor is within PREVIEW_THRESHOLD distance.
 */
export function JunctionPreview() {
  const junctionPlacementMode = useCircuitStore((s) => s.junctionPlacementMode)
  const previewPosition = useCircuitStore((s) => s.junctionPreviewPosition)
  const wires = useCircuitStore((s) => s.wires)

  const isActive = junctionPlacementMode === true && previewPosition !== null

  if (!isActive || !previewPosition) return null

  // Find nearest wire to preview position
  const nearestWireId = findNearestWire(previewPosition, wires, 0.5)

  if (!nearestWireId) return null

  // Get the wire and find its corners
  const wire = wires.find((w) => w.id === nearestWireId)
  if (!wire) return null

  const corners = findWireCorners(wire)
  if (corners.length === 0) return null

  // Find nearest corner to preview position
  let nearestCorner: Position | null = null
  let minCornerDistance = Infinity

  for (const corner of corners) {
    const distance = distance3D(previewPosition, corner)

    if (distance < minCornerDistance) {
      minCornerDistance = distance
      nearestCorner = corner
    }
  }

  // Only show preview if nearest corner is within threshold
  if (!nearestCorner || minCornerDistance > PREVIEW_THRESHOLD) {
    return null
  }

  // Render preview as semi-transparent sphere
  const previewColor = semanticColors.success

  return (
    <mesh position={[nearestCorner.x, nearestCorner.y, nearestCorner.z]}>
      <sphereGeometry args={[JUNCTION_CONFIG.radius * 1.2, JUNCTION_CONFIG.segments, JUNCTION_CONFIG.segments]} />
      <meshStandardMaterial
        color={previewColor}
        transparent
        opacity={0.6}
        emissive={previewColor}
        emissiveIntensity={0.3}
      />
    </mesh>
  )
}
