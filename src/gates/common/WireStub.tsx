import { memo } from 'react'
import { colors, materials } from '@/theme'

interface WireStubProps {
  position: [number, number, number]
}

function WireStubComponent({ position }: WireStubProps) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
      <meshStandardMaterial
        color={colors.gate.wireStub}
        metalness={materials.wireStub.metalness}
        roughness={materials.wireStub.roughness}
      />
    </mesh>
  )
}

export const WireStub = memo(WireStubComponent)
WireStub.displayName = 'WireStub'
