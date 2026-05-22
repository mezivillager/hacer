// JunctionNode3D - Visual representation of a wire branch point
import { colors, materials } from '@/theme'
import { JUNCTION_CONFIG } from '../config'
import type { Position } from '@/store/types'
import { isSignalHigh } from '@/simulation/signalDisplay'
import { FloatingLabel } from '@/components/canvas/FloatingLabel'
import { LABEL_GEOMETRY } from '@/components/canvas/labelGeometry'

interface JunctionNode3DProps {
  /** Unique identifier for the junction */
  id: string
  /** Position in 3D space */
  position: Position
  /** Current signal value passing through the junction */
  value: number
  /** Signal name (truncated if long) shown above the junction */
  signalId?: string
  /** Click handler for the junction */
  onClick?: () => void
}

/**
 * JunctionNode3D renders a small sphere at wire branch points.
 * The sphere color reflects the current signal value.
 *
 * @param props - Junction node properties
 * @returns React Three Fiber mesh element
 */
export function JunctionNode3D({ id: _id, position, value, signalId, onClick }: JunctionNode3DProps) {
  const high = isSignalHigh(value)
  const color = high ? colors.pin.active : colors.pin.inactive

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onClick) {
      onClick()
    }
  }

  const labelText = signalId
    ? (signalId.length > 8 ? signalId.slice(0, 6) + '\u2026' : signalId)
    : ''

  return (
    <>
      <group position={[position.x, position.y, position.z]}>
        <mesh onClick={handleClick}>
          <sphereGeometry args={[JUNCTION_CONFIG.radius, JUNCTION_CONFIG.segments, JUNCTION_CONFIG.segments]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={high ? 0.5 : 0.2}
            metalness={materials.pin.metalness}
            roughness={materials.pin.roughness}
          />
        </mesh>
      </group>
      <FloatingLabel
        position={[position.x, position.y, position.z]}
        text={labelText}
        offsetY={LABEL_GEOMETRY.JUNCTION.offsetY}
      />
    </>
  )
}
JunctionNode3D.displayName = 'JunctionNode3D'
