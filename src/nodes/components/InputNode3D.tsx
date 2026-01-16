// InputNode3D - Visual representation of a circuit input node
import { useState, useRef } from 'react'
import { Group } from 'three'
import { Text } from '@react-three/drei'
import { colors, materials } from '@/theme'
import { NODE_DIMENSIONS, NODE_COLORS, INPUT_NODE_CONFIG, calculateNodePinPosition } from '../config'
import type { Position, Rotation } from '@/store/types'

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
  value: boolean
  /** Whether this node is selected */
  selected?: boolean
  /** Whether the output is connected to a wire */
  outputConnected?: boolean
  /** Click handler for the node body */
  onClick?: () => void
  /** Click handler for toggling the input value */
  onToggle?: () => void
  /** Click handler for the output pin */
  onPinClick?: (nodeId: string, worldPosition: { x: number; y: number; z: number }) => void
}

/**
 * InputNode3D renders a circuit input node with a label and output pin.
 * The node can be clicked to toggle its value.
 *
 * @param props - Input node properties
 * @returns React Three Fiber group element
 */
export function InputNode3D({
  id,
  name,
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

  // Body color based on state
  const bodyColor = selected
    ? NODE_COLORS.input.selected
    : hovered
      ? NODE_COLORS.input.hover
      : NODE_COLORS.input.body

  // Pin color based on value
  const pinColor = value ? colors.pin.active : colors.pin.inactive

  // Calculate pin position
  const pinPos = calculateNodePinPosition('input')

  // Handle pin click
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

  // Handle body click
  // Shift+click toggles value, regular click selects
  const handleBodyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
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
      {/* Main body */}
      <mesh
        onClick={handleBodyClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={INPUT_NODE_CONFIG.geometry.args} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={materials.gate.metalness}
          roughness={materials.gate.roughness}
        />
      </mesh>

      {/* Name label on top face */}
      <Text
        position={INPUT_NODE_CONFIG.text.position}
        rotation={[Math.PI, 0, 0]}
        fontSize={INPUT_NODE_CONFIG.text.fontSize}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {name}
      </Text>

      {/* Output pin (right side) */}
      <mesh
        position={[pinPos.x, pinPos.y, pinPos.z]}
        onClick={handlePinClick}
      >
        <sphereGeometry args={[NODE_DIMENSIONS.PIN_RADIUS, 16, 16]} />
        <meshStandardMaterial
          color={pinColor}
          emissive={pinColor}
          emissiveIntensity={value ? 0.5 : 0.2}
          metalness={materials.pin.metalness}
          roughness={materials.pin.roughness}
        />
      </mesh>
    </group>
  )
}
InputNode3D.displayName = 'InputNode3D'
