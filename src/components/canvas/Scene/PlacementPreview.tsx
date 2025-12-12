import { useCircuitStore } from '@/store/circuitStore'
import { colors } from '@/theme'
import { trackRender } from '@/utils/renderTracking'

/**
 * Placement preview - only renders when placementMode is active.
 * Subscribes to placementMode and placementPreviewPosition.
 */
export function PlacementPreview() {
  const placementMode = useCircuitStore((s) => s.placementMode)
  const previewPosition = useCircuitStore((s) => s.placementPreviewPosition)
  
  const isActive = placementMode !== null && previewPosition !== null
  
  trackRender('PlacementPreview', `active:${isActive}`)
  
  if (!isActive || !previewPosition) return null
  
  return (
    <group position={[previewPosition.x, 0.02, previewPosition.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.55, 32]} />
        <meshBasicMaterial color={colors.primary} transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.08, 16]} />
        <meshBasicMaterial color={colors.primary} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.2, 0.8, 0.4]} />
        <meshStandardMaterial
          color={colors.primary}
          transparent
          opacity={0.3}
          wireframe
        />
      </mesh>
    </group>
  )
}

