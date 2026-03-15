import { useCircuitStore } from '@/store/circuitStore'
import { semanticColors } from '@/theme'
import { JUNCTION_CONFIG } from '@/nodes/config/nodeConfig'

/**
 * JunctionPreview - Shows a preview when cursor is near a valid wire corner during junction placement.
 * Subscribes to junctionPlacementMode and junctionPreviewPosition.
 *
 * The preview position and wireId are computed by the updateJunctionPreviewPosition action,
 * which stores the snapped corner position (not raw cursor position) and associated wireId.
 * This component simply renders at the stored position when it is non-null.
 */
export function JunctionPreview() {
  const junctionPlacementMode = useCircuitStore((s) => s.junctionPlacementMode)
  const previewPosition = useCircuitStore((s) => s.junctionPreviewPosition)
  const previewWireId = useCircuitStore((s) => s.junctionPreviewWireId)
  const wires = useCircuitStore((s) => s.wires)

  const previewWireExists = previewWireId !== null && wires.some((w) => w.id === previewWireId)
  const isActive = junctionPlacementMode === true && previewPosition !== null && previewWireExists

  if (!isActive || !previewPosition) return null

  // Render preview as semi-transparent sphere at the snapped corner position
  const previewColor = semanticColors.success

  return (
    <mesh position={[previewPosition.x, previewPosition.y, previewPosition.z]}>
      <sphereGeometry args={[JUNCTION_CONFIG.radius * 1.5, JUNCTION_CONFIG.segments, JUNCTION_CONFIG.segments]} />
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
