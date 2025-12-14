import { useCircuitStore } from '@/store/circuitStore'
import { semanticColors } from '@/theme'
import { trackRender } from '@/utils/renderTracking'
import { worldToGrid, canPlaceGateAt } from '@/utils/grid'

/**
 * Placement preview - only renders when placementMode is active and position is valid.
 * Subscribes to placementMode and placementPreviewPosition.
 * Shows preview only for valid positions (no preview for invalid positions).
 */
export function PlacementPreview() {
  const placementMode = useCircuitStore((s) => s.placementMode)
  const previewPosition = useCircuitStore((s) => s.placementPreviewPosition)
  const gates = useCircuitStore((s) => s.gates)
  
  const isActive = placementMode !== null && previewPosition !== null
  
  trackRender('PlacementPreview', `active:${isActive}`)
  
  if (!isActive || !previewPosition) return null
  
  // Calculate validity: convert to grid position and check spacing
  const gridPos = worldToGrid(previewPosition)
  const isValid = canPlaceGateAt(gridPos, gates)
  
  // Only show preview for valid positions
  if (!isValid) return null
  
  // Valid position: show preview with success color
  const previewColor = semanticColors.success
  
  return (
    <group position={[previewPosition.x, 0.02, previewPosition.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.55, 32]} />
        <meshBasicMaterial color={previewColor} transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.08, 16]} />
        <meshBasicMaterial color={previewColor} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.2, 0.8, 0.4]} />
        <meshStandardMaterial
          color={previewColor}
          transparent
          opacity={0.3}
          wireframe
        />
      </mesh>
    </group>
  )
}

