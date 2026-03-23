import { ThreeEvent } from '@react-three/fiber'
import { materials } from '@/theme'

interface GatePinProps {
  id: string
  pinId: string
  position: [number, number, number]
  color: string
  isWiring: boolean
  isHovered: boolean
  isConnected: boolean
  value: number
  pinType: 'input' | 'output'
  onPinClick: (pinId: string, pinType: 'input' | 'output', localOffset: [number, number, number], isConnected: boolean) => (e: ThreeEvent<MouseEvent>) => void
  onPointerMove: (localOffset: [number, number, number]) => (e: ThreeEvent<PointerEvent>) => void
  onPointerOver: () => void
  onPointerOut: () => void
}

export function GatePin({
  pinId,
  position,
  color,
  isWiring,
  isHovered,
  isConnected,
  value,
  pinType,
  onPinClick,
  onPointerMove,
  onPointerOver,
  onPointerOut,
}: GatePinProps) {
  const radius = isWiring && isHovered ? 0.13 : 0.1
  const emissiveIntensity = isConnected && value === 1 ? 0.5 : isHovered ? 0.3 : 0.1

  return (
    <mesh
      position={position}
      onClick={onPinClick(pinId, pinType, position, isConnected)}
      onPointerMove={onPointerMove(position)}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        metalness={materials.pin.metalness}
        roughness={materials.pin.roughness}
      />
    </mesh>
  )
}
GatePin.displayName = 'GatePin'
