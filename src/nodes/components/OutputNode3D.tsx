// OutputNode3D - Visual representation of a circuit output node
import { useState, useRef } from 'react'
import { Group } from 'three'
import { colors, materials } from '@/theme'
import { NODE_DIMENSIONS, NODE_COLORS, OUTPUT_NODE_CONFIG, calculateNodePinPosition } from '../config'
import type { Position, Rotation } from '@/store/types'
import type { DragBinding } from '@/gates/types'
import { formatSignalLabel, isSignalHigh } from '@/simulation/signalDisplay'
import { FloatingLabel } from '@/components/canvas/FloatingLabel'
import { LABEL_GEOMETRY } from '@/components/canvas/labelGeometry'

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
  /** Bit width of the output (1 for single bit, >1 for bus) */
  width: number
  /** Whether this node is selected */
  selected?: boolean
  /** Whether the input is connected to a wire */
  inputConnected?: boolean
  /** Click handler for the node body */
  onClick?: () => void
  /** Click handler for the input pin */
  onPinClick?: (nodeId: string, worldPosition: { x: number; y: number; z: number }) => void
  /** Whether a wire is being drawn; the hovered pin is highlighted. */
  isWiring?: boolean
  /** Called with the node id when the pointer enters the pin, and with null when it leaves. */
  onPinHover?: (nodeId: string | null) => void
  canDrag?: boolean
  drag?: DragBinding
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
  width,
  selected = false,
  inputConnected: _inputConnected = false,
  onClick,
  onPinClick,
  isWiring = false,
  onPinHover,
  canDrag = false,
  drag,
}: OutputNode3DProps) {
  const groupRef = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  const [pinHovered, setPinHovered] = useState(false)

  const isDragging = drag?.isDragging ?? false

  const high = isSignalHigh(value)

  // Body color based on state
  const bodyColor = selected
    ? NODE_COLORS.output.selected
    : hovered
      ? (high ? NODE_COLORS.output.hoverOn : NODE_COLORS.output.hoverOff)
      : (high ? NODE_COLORS.output.bodyOn : NODE_COLORS.output.bodyOff)

  // Pin color based on value and hover state (highlight when wiring and hovered)
  const pinColor = pinHovered && isWiring
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

  const handlePinPointerOver = () => {
    setPinHovered(true)
    onPinHover?.(id)
  }

  const handlePinPointerOut = () => {
    setPinHovered(false)
    onPinHover?.(null)
  }

  // Handle body click
  const handleBodyClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (drag && !drag.shouldAllowClick()) return
    if (onClick) {
      onClick()
    }
  }

  return (
    <>
      <group
        ref={groupRef}
        position={[position.x, position.y, position.z]}
        rotation={[rotation.x, rotation.y, rotation.z]}
      >
        {/* Main body */}
        <mesh
          onClick={handleBodyClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => { setHovered(false); if (canDrag && !isDragging) drag?.onPointerLeave() }}
          onPointerDown={canDrag ? drag?.onPointerDown : undefined}
          onPointerMove={canDrag ? drag?.onPointerMove : undefined}
          onPointerUp={canDrag ? drag?.onPointerUp : undefined}
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

      {/* Label lives outside the rotated group so offsetY is world-space up. */}
      <FloatingLabel
        position={[position.x, position.y, position.z]}
        text={`${name}: ${formatSignalLabel(value, width)}`}
        offsetY={LABEL_GEOMETRY.NODE.offsetY}
      />
    </>
  )
}
OutputNode3D.displayName = 'OutputNode3D'
