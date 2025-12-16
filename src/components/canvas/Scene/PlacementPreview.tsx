import { useCircuitStore } from '@/store/circuitStore'
import { semanticColors } from '@/theme'
import { trackRender } from '@/utils/renderTracking'
import { worldToGrid, canPlaceGateAt } from '@/utils/grid'

/**
 * Placement preview - renders when placementMode is active or during drag, and position is valid.
 * Subscribes to placementMode, placementPreviewPosition, and selectedGateId.
 * Shows preview only for valid positions (no preview for invalid positions).
 */
export function PlacementPreview() {
  const placementMode = useCircuitStore((s) => s.placementMode)
  const previewPosition = useCircuitStore((s) => s.placementPreviewPosition)
  const isDragActive = useCircuitStore((s) => s.isDragActive)
  const selectedGateId = useCircuitStore((s) => s.selectedGateId)
  
  // Active during placement mode OR during active drag (preview set, no placement mode, and drag is active)
  const isPlacing = placementMode !== null && previewPosition !== null
  const isDragging = placementMode === null && previewPosition !== null && isDragActive
  const isActive = isPlacing || isDragging
  
  trackRender('PlacementPreview', `active:${isActive},placing:${isPlacing},dragging:${isDragging}`)
  
  if (!isActive || !previewPosition) return null
  
  // Get gates only when needed for validation (avoid subscribing to gates array to reduce re-renders)
  // eslint-disable-next-line react-compiler/react-compiler -- getState() is valid for reading without subscribing
  const gates = useCircuitStore.getState().gates
  
  // Calculate validity: convert to grid position and check spacing
  const gridPos = worldToGrid(previewPosition)
  // For drag, exclude the dragged gate (selected gate) from validation
  // For placement, validate against all gates
  const gatesForValidation = isDragging && selectedGateId 
    ? gates.filter(g => g.id !== selectedGateId)
    : gates
  const excludeGateId = isDragging && selectedGateId ? selectedGateId : undefined
  const isValid = canPlaceGateAt(gridPos, gatesForValidation, excludeGateId)
  
  // Only show preview for valid positions
  if (!isValid) return null
  
  // Valid position: show preview with success color
  const previewColor = semanticColors.success
  
  return (
    <group position={[previewPosition.x, 0.2, previewPosition.z]} rotation={[Math.PI / 2, 0, 0]}>
      {/* Preview rings - flat relative to parent (which is rotated 90° X) */}
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[0.5, 0.55, 32]} />
        <meshBasicMaterial color={previewColor} transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[0, 0, 0]}>
        <ringGeometry args={[0.05, 0.08, 16]} />
        <meshBasicMaterial color={previewColor} transparent opacity={0.9} />
      </mesh>
      {/* Preview gate outline */}
      <mesh position={[0, 0, 0]}>
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

