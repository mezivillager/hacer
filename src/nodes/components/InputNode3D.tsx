// InputNode3D - Visual representation of a circuit input node
import { useState, useRef } from 'react'
import { Group } from 'three'
import { colors, materials } from '@/theme'
import { NODE_DIMENSIONS, NODE_COLORS, INPUT_NODE_CONFIG, calculateNodePinPosition } from '../config'
import type { Position, Rotation } from '@/types/scene'
import type { DragBinding } from '@/gates/types'
import { formatSignalLabel, isSignalHigh } from '@/simulation/signalDisplay'
import { FloatingLabel } from '@/components/canvas/FloatingLabel'
import { LABEL_GEOMETRY } from '@/components/canvas/labelGeometry'

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
  /** Bit width of the input (1 for single bit, >1 for bus) */
  width: number
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
  canDrag?: boolean
  drag?: DragBinding
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
  name,
  position,
  rotation,
  value,
  width,
  selected = false,
  outputConnected: _outputConnected = false,
  onClick,
  onToggle,
  onPinClick,
  canDrag = false,
  drag,
}: InputNode3DProps) {
  const groupRef = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)

  const isDragging = drag?.isDragging ?? false

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
    if (drag && !drag.shouldAllowClick()) return
    if (e.shiftKey && onToggle) {
      onToggle()
    } else if (onClick) {
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
        <mesh
          onClick={handleBodyClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => { setHovered(false); if (canDrag && !isDragging) drag?.onPointerLeave() }}
          onPointerDown={canDrag ? drag?.onPointerDown : undefined}
          onPointerMove={canDrag ? drag?.onPointerMove : undefined}
          onPointerUp={canDrag ? drag?.onPointerUp : undefined}
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

      {/* Label lives outside the rotated group so offsetY is world-space up. */}
      <FloatingLabel
        position={[position.x, position.y, position.z]}
        text={`${name}: ${formatSignalLabel(value, width)}`}
        offsetY={LABEL_GEOMETRY.NODE.offsetY}
      />
    </>
  )
}
InputNode3D.displayName = 'InputNode3D'
