// JunctionNode3D - Visual representation of a wire branch point
import { colors, materials } from '@/theme'
import { JUNCTION_CONFIG } from '../config'
import type { Position } from '@/store/types'
import { isSignalHigh } from '@/simulation/signalDisplay'

interface JunctionNode3DProps {
  /** Unique identifier for the junction */
  id: string
  /** Position in 3D space */
  position: Position
  /** Current signal value passing through the junction */
  value: number
  /** Click handler for the junction */
  onClick?: () => void
}

/**
 * JunctionNode3D renders a small sphere at wire branch points.
 * The sphere color reflects the current signal value.
 *
 * Junctions are intentionally unlabelled: they're tap points on a shared
 * net, not user-meaningful entities, and a per-junction label adds noise
 * without distinguishing one tap from another. The wire/output node it
 * branches off of is the carrier of name + value display.
 *
 * @param props - Junction node properties
 * @returns React Three Fiber mesh element
 */
export function JunctionNode3D({ id: _id, position, value, onClick }: JunctionNode3DProps) {
  const high = isSignalHigh(value)
  const color = high ? colors.pin.active : colors.pin.inactive

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onClick) {
      onClick()
    }
  }

  return (
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
  )
}
JunctionNode3D.displayName = 'JunctionNode3D'
