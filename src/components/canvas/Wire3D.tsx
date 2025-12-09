import { useMemo } from 'react'
import { Vector3, CatmullRomCurve3 } from 'three'
import { colors, materials } from '@/theme'

interface Wire3DProps {
  start: { x: number; y: number; z: number } | null
  end: { x: number; y: number; z: number } | null
  color?: string
  isActive?: boolean
  isPreview?: boolean
}

export function Wire3D({ 
  start, 
  end, 
  color = colors.gate.wireStub,
  isActive = false,
  isPreview = false 
}: Wire3DProps) {
  // Create safe values for hooks (hooks must always be called)
  const safeStart = start ?? { x: 0, y: 0, z: 0 }
  const safeEnd = end ?? { x: 0, y: 0, z: 0 }
  
  const curve = useMemo(() => {
    const startVec = new Vector3(safeStart.x, safeStart.y, safeStart.z)
    const endVec = new Vector3(safeEnd.x, safeEnd.y, safeEnd.z)
    
    // Calculate control points for a nice curve
    const midY = Math.max(safeStart.y, safeEnd.y) + 0.3
    const midX = (safeStart.x + safeEnd.x) / 2
    const midZ = (safeStart.z + safeEnd.z) / 2
    
    // Create a smooth curve with control points
    const points = [
      startVec,
      new Vector3(safeStart.x + 0.3, safeStart.y, safeStart.z),
      new Vector3(midX, midY, midZ),
      new Vector3(safeEnd.x - 0.3, safeEnd.y, safeEnd.z),
      endVec,
    ]
    
    return new CatmullRomCurve3(points)
  }, [safeStart.x, safeStart.y, safeStart.z, safeEnd.x, safeEnd.y, safeEnd.z])
  
  const tubeRadius = useMemo(() => {
    return isPreview ? 0.03 : 0.025
  }, [isPreview])
  
  const wireColor = isActive 
    ? colors.wire.active 
    : isPreview 
      ? colors.wire.preview 
      : color
  const emissiveIntensity = isActive ? 0.5 : isPreview ? 0.3 : 0
  
  // Guard against undefined positions - return null AFTER hooks
  if (!start || !end) return null
  
  return (
    <mesh>
      <tubeGeometry 
        args={[curve, 32, tubeRadius, 8, false]} 
      />
      <meshStandardMaterial
        color={wireColor}
        emissive={wireColor}
        emissiveIntensity={emissiveIntensity}
        metalness={materials.pin.metalness}
        roughness={materials.pin.roughness}
        transparent={isPreview}
        opacity={isPreview ? 0.7 : 1}
      />
    </mesh>
  )
}
