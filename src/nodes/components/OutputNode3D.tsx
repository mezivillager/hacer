// OutputNode3D - Visual representation of a circuit output node
import { useState, useRef } from 'react'
import { Group } from 'three'
import { Text } from '@react-three/drei'
import { colors, materials } from '@/theme'
import { NODE_DIMENSIONS, NODE_COLORS, OUTPUT_NODE_CONFIG, calculateNodePinPosition } from '../config'
import { useCircuitStore, circuitActions } from '@/store/circuitStore'
import { useNodeDrag } from '@/hooks/useNodeDrag'
import type { Position, Rotation } from '@/store/types'
import { formatSignalLabel, isSignalHigh } from '@/simulation/signalDisplay'

interface OutputNode3DProps {
  /** Unique identifier for the output node */
  id: string
  /** Display name for the output (e.g., 'out') */
  name: string
  /** Position in 3D space */
  position: Position
  /** Rotation in 3D space */
  rotation: Rotation
  /** Current output value (computed from circuit) */
  value: number
  /** Whether this node is selected */
  selected?: boolean
  /** Whether the input is connected to a wire */
  inputConnected?: boolean
  /** Click handler for the node body */
  onClick?: () => void
  /** Click handler for the input pin */
  onPinClick?: (nodeId: string, worldPosition: { x: number; y: number; z: number }) => void
}

/**
 * OutputNode3D renders a circuit output node with a label and input pin.
 * The value is computed from the connected signal, not toggleable.
 *
 * @param props - Output node properties
 * @returns React Three Fiber group element
 */
export function OutputNode3D({
  id,
  name,
  position,
  rotation,
  value,
  selected = false,
  inputConnected: _inputConnected = false,
  onClick,
  onPinClick,
}: OutputNode3DProps) {
  const groupRef = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  const [pinHovered, setPinHovered] = useState(false)

  // Check if wiring is active
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  const placementMode = useCircuitStore((s) => s.placementMode)
  const nodePlacementMode = useCircuitStore((s) => s.nodePlacementMode)
  const isJunctionPlacement = useCircuitStore((s) => s.junctionPlacementMode) !== null

  const isWiringMode = wiringFrom !== null
  const canDrag = placementMode === null && nodePlacementMode === null && !isJunctionPlacement && !isWiringMode

  const { isDragging, shouldAllowClick, onPointerDown, onPointerMove, onPointerUp, onPointerLeave } = useNodeDrag(id, 'output')

  const high = isSignalHigh(value)

  // Body color based on state
  const bodyColor = selected
    ? NODE_COLORS.output.selected
    : hovered
      ? (high ? NODE_COLORS.output.hoverOn : NODE_COLORS.output.hoverOff)
      : (high ? NODE_COLORS.output.bodyOn : NODE_COLORS.output.bodyOff)

  // Pin color based on value and hover state (highlight when wiring and hovered)
  const pinColor = pinHovered && isWiringMode
    ? colors.primary
    : (high ? colors.wire.active : colors.wire.default)

  // Calculate pin position (input pin on left side)
  const pinPos = calculateNodePinPosition('output')

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

  // Handle pin hover - set destination when wiring is active
  const handlePinPointerOver = () => {
    setPinHovered(true)
    if (isWiringMode) {
      circuitActions.setDestinationNode(id, 'output')
    }
  }

  // Handle pin pointer out - clear destination when wiring is active
  const handlePinPointerOut = () => {
    setPinHovered(false)
    if (isWiringMode) {
      circuitActions.setDestinationNode(null, null)
    }
  }

  // Handle body click
  const handleBodyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!shouldAllowClick()) return
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
      {/* Main body */}
      <mesh
        onClick={handleBodyClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => { setHovered(false); if (canDrag && !isDragging) onPointerLeave() }}
        onPointerDown={canDrag ? onPointerDown : undefined}
        onPointerMove={canDrag ? onPointerMove : undefined}
        onPointerUp={canDrag ? onPointerUp : undefined}
      >
        <boxGeometry args={OUTPUT_NODE_CONFIG.geometry.args} />
        <meshStandardMaterial
          color={bodyColor}
          metalness={materials.gate.metalness}
          roughness={materials.gate.roughness}
          transparent={isDragging}
          opacity={isDragging ? 0.7 : 1}
        />
      </mesh>

      <Text
        position={[
          OUTPUT_NODE_CONFIG.text.position[0],
          OUTPUT_NODE_CONFIG.text.position[1] + 0.18,
          OUTPUT_NODE_CONFIG.text.position[2],
        ]}
        rotation={[Math.PI, 0, 0]}
        fontSize={0.12}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {name}
      </Text>

      <Text
        position={OUTPUT_NODE_CONFIG.text.position}
        rotation={[Math.PI, 0, 0]}
        fontSize={OUTPUT_NODE_CONFIG.text.fontSize}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {formatSignalLabel(value)}
      </Text>

      {/* Input pin (left side) */}
      <mesh
        position={[pinPos.x, pinPos.y, pinPos.z]}
        onClick={handlePinClick}
        onPointerOver={handlePinPointerOver}
        onPointerOut={handlePinPointerOut}
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
OutputNode3D.displayName = 'OutputNode3D'
