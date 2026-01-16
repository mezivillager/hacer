// ConstantNode3D - Visual representation of a constant value node (true/false)
import { useState, useRef } from 'react'
import { Group } from 'three'
import { Text } from '@react-three/drei'
import { colors, materials } from '@/theme'
import { NODE_DIMENSIONS, NODE_COLORS, CONSTANT_NODE_CONFIG, calculateNodePinPosition } from '../config'
import type { Position, Rotation } from '@/store/types'

interface ConstantNode3DProps {
  /** Unique identifier for the constant node */
  id: string
  /** Position in 3D space */
  position: Position
  /** Rotation in 3D space */
  rotation: Rotation
  /** The constant value (true or false) */
  value: boolean
  /** Whether this node is selected */
  selected?: boolean
  /** Whether the output is connected to a wire */
  outputConnected?: boolean
  /** Click handler for the node body */
  onClick?: () => void
  /** Click handler for the output pin */
  onPinClick?: (nodeId: string, worldPosition: { x: number; y: number; z: number }) => void
}

/**
 * ConstantNode3D renders a constant value node with a label and output pin.
 * Constants are immutable - they always output true or false.
 *
 * @param props - Constant node properties
 * @returns React Three Fiber group element
 */
export function ConstantNode3D({
  id,
  position,
  rotation,
  value,
  selected = false,
  outputConnected: _outputConnected = false,
  onClick,
  onPinClick,
}: ConstantNode3DProps) {
  const groupRef = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)

  // Body color based on state: selected > hovered > value-based
  const bodyColor = selected
    ? NODE_COLORS.constant.selected
    : hovered
      ? NODE_COLORS.constant.hover
      : value
        ? colors.pin.active
        : NODE_COLORS.constant.body

  // Pin color based on value
  const pinColor = value ? colors.pin.active : colors.pin.inactive

  // Calculate pin position (output pin on right side)
  const pinPos = calculateNodePinPosition('constant')

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

  // Label text: "1" for true, "0" for false
  const labelText = value ? '1' : '0'

  // Handle body click
  const handleBodyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onClick) {
      onClick()
    }
  }

  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      rotation={[rotation.x, rotation.y, rotation.z]}
    >
      {/* Main body (smaller than input/output nodes) */}
      <mesh
        onClick={handleBodyClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={CONSTANT_NODE_CONFIG.geometry.args} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={materials.gate.metalness}
          roughness={materials.gate.roughness}
        />
      </mesh>

      {/* Value label on top face */}
      <Text
        position={CONSTANT_NODE_CONFIG.text.position}
        rotation={[Math.PI, 0, 0]}
        fontSize={CONSTANT_NODE_CONFIG.text.fontSize}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {labelText}
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
ConstantNode3D.displayName = 'ConstantNode3D'
