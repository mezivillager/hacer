// NOT gate configuration
import { materials } from '@/theme'
import { NOT_COLORS } from './not-constants'
import { calculateNotPinPositions, NOT_DIMENSIONS } from './not-helpers'

/**
 * Negation bubble component for the NOT gate.
 * The bubble is positioned at the tip of the triangle.
 */
export function NotBubble() {
  const { bubbleCenterX } = calculateNotPinPositions()
  return (
    <mesh position={[bubbleCenterX, 0, 0]}>
      <sphereGeometry args={[NOT_DIMENSIONS.bubbleRadius, 16, 16]} />
      <meshStandardMaterial
        color={NOT_COLORS.body}
        metalness={materials.gate.metalness}
        roughness={materials.gate.roughness}
      />
    </mesh>
  )
}
