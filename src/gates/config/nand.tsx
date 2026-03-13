// NAND gate configuration
import { materials } from '@/theme'
import {
  COMMON_DIMENSIONS,
} from './common'
import { NAND_COLORS } from './nand-constants'
import { calculateNandPinPositions } from './nand-helpers'

/**
 * Negation bubble component for the NAND gate.
 * The bubble is positioned just to the right of the gate body.
 */
export function NandBubble() {
  const { bubbleCenterX } = calculateNandPinPositions()
  return (
    <mesh position={[bubbleCenterX, 0, 0]}>
      <sphereGeometry args={[COMMON_DIMENSIONS.BUBBLE_RADIUS, 16, 16]} />
      <meshStandardMaterial
        color={NAND_COLORS.body}
        metalness={materials.gate.metalness}
        roughness={materials.gate.roughness}
      />
    </mesh>
  )
}
