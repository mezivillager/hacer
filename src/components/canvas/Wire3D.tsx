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
  // Guard against undefined positions
  if (!start || !end) return null
  
  const startVec = new Vector3(start.x, start.y, start.z)
  const endVec = new Vector3(end.x, end.y, end.z)
  
  // Calculate control points for a nice curve
  const midY = Math.max(start.y, end.y) + 0.3
  const midX = (start.x + end.x) / 2
  const midZ = (start.z + end.z) / 2
  
  // Create a smooth curve with control points
  const points = [
    startVec,
    new Vector3(start.x + 0.3, start.y, start.z),
    new Vector3(midX, midY, midZ),
    new Vector3(end.x - 0.3, end.y, end.z),
    endVec,
  ]
  
  const curve = new CatmullRomCurve3(points)
  const tubeRadius = isPreview ? 0.03 : 0.025
  
  const wireColor = isActive 
    ? colors.wire.active 
    : isPreview 
      ? colors.wire.preview 
      : color
  const emissiveIntensity = isActive ? 0.5 : isPreview ? 0.3 : 0
  
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
