// XOR gate configuration
import { materials } from '@/theme'
import { XOR_COLORS } from './xor-constants'

/**
 * Extra curved line component that distinguishes XOR from OR gate.
 * This line is positioned to the left of the main shield shape.
 */
export function XorLine() {
  return (
    <mesh position={[-0.65, 0, 0]}>
      <boxGeometry args={[0.05, 0.7, 0.4]} />
      <meshStandardMaterial
        color={XOR_COLORS.body}
        metalness={materials.gate.metalness}
        roughness={materials.gate.roughness}
      />
    </mesh>
  )
}
