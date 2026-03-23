// InputNode3D - Visual representation of a circuit input node
import { useState, useRef } from 'react'
import { Group } from 'three'
import { Text } from '@react-three/drei'
import { useCircuitStore } from '@/store/circuitStore'
import { colors, materials } from '@/theme'
import { NODE_DIMENSIONS, NODE_COLORS, INPUT_NODE_CONFIG, calculateNodePinPosition } from '../config'
import { useNodeDrag } from '@/hooks/useNodeDrag'
import type { Position, Rotation } from '@/store/types'
import { formatSignalLabel, isSignalHigh } from '@/simulation/signalDisplay'

interface InputNode3DProps {
  /** Unique identifier for the input node */
  id: string
  /** Display name for the input (e.g., 'a', 'b', 'sel') */
  name: string
  /** Position in 3D space */
  position: Position
  /** Rotation in 3D space */
  rotation: Rotation
  /** Current input value */
  value: number
  /** Whether this node is selected */
  selected?: boolean
  /** Whether the output is connected to a wire */
  outputConnected?: boolean
  /** Click handler for the node body (selects the node) */
  onClick?: () => void
  /** Handler for toggling the input value (shift+click) */
  onToggle?: () => void
  /** Click handler for the output pin */
  onPinClick?: (nodeId: string, worldPosition: { x: number; y: number; z: number }) => void
}

/**
 * InputNode3D renders a cube-shaped circuit input node with a 0/1 label
 * and output pin. Click selects; shift+click toggles value; drag to move.
 *
 * @param props - Input node properties
 * @returns React Three Fiber group element
 */
export function InputNode3D({
  id,
  name: _name,
  position,
  rotation,
  value,
  selected = false,
  outputConnected: _outputConnected = false,
  onClick,
  onToggle,
  onPinClick,
}: InputNode3DProps) {
  const groupRef = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)

  const placementMode = useCircuitStore((s) => s.placementMode)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  const nodePlacementMode = useCircuitStore((s) => s.nodePlacementMode)
  const isJunctionPlacement = useCircuitStore((s) => s.junctionPlacementMode) !== null

  const canDrag = placementMode === null && nodePlacementMode === null && !isJunctionPlacement && wiringFrom === null

  const { isDragging, shouldAllowClick, onPointerDown, onPointerMove, onPointerUp, onPointerLeave } = useNodeDrag(id, 'input')

  const high = isSignalHigh(value)

  const bodyColor = selected
    ? NODE_COLORS.input.selected
    : hovered
      ? (high ? NODE_COLORS.input.hoverOn : NODE_COLORS.input.hoverOff)
      : (high ? NODE_COLORS.input.bodyOn : NODE_COLORS.input.bodyOff)

  const pinColor = high ? colors.pin.active : colors.pin.inactive
  const pinPos = calculateNodePinPosition('input')

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onPinClick) {
      const worldPos = {
        x: position.x + pinPos.x,
        y: position.y + pinPos.y,
        z: position.z + pinPos.z,
      }
      onPinClick(id, worldPos)
    }
  }

  const handleBodyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!shouldAllowClick()) return
    if (e.shiftKey && onToggle) {
      onToggle()
    } else if (onClick) {
      onClick()
    }
  }

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
    >
      <mesh
        onClick={handleBodyClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => { setHovered(false); if (canDrag && !isDragging) onPointerLeave() }}
        onPointerDown={canDrag ? onPointerDown : undefined}
        onPointerMove={canDrag ? onPointerMove : undefined}
        onPointerUp={canDrag ? onPointerUp : undefined}
      >
        <boxGeometry args={INPUT_NODE_CONFIG.geometry.args} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={materials.gate.metalness}
          roughness={materials.gate.roughness}
          transparent={isDragging}
          opacity={isDragging ? 0.7 : 1}
        />
      </mesh>

      <Text
        position={INPUT_NODE_CONFIG.text.position}
        rotation={[Math.PI, 0, 0]}
        fontSize={INPUT_NODE_CONFIG.text.fontSize}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {formatSignalLabel(value)}
      </Text>

      <mesh
        position={[pinPos.x, pinPos.y, pinPos.z]}
        onClick={handlePinClick}
      >
        <sphereGeometry args={[NODE_DIMENSIONS.PIN_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color={pinColor}
          emissive={pinColor}
          emissiveIntensity={high ? 0.5 : 0.2}
          metalness={materials.pin.metalness}
          roughness={materials.pin.roughness}
        />
      </mesh>
    </group>
  )
}
InputNode3D.displayName = 'InputNode3D'
