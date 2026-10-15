import { useState } from 'react'
import type { BusComponent, BusComponentKind } from '@/types/scene'
import type { DragBinding } from '@/gates/types'
import { colors, materials } from '@/theme'
import { NODE_DIMENSIONS } from './config'
import { computeBusPinLayout, computeBusBodyDimensions } from '@/components/scene/busBodyLayout'
import { isSignalHigh } from '@/simulation/signalDisplay'
import { FloatingLabel } from '@/components/canvas/FloatingLabel'
import { LABEL_GEOMETRY } from '@/components/canvas/labelGeometry'

export type BusPinClickHandler = (
  componentId: string,
  pinId: string,
  pinType: 'input' | 'output',
  worldPosition: { x: number; y: number; z: number },
) => void

const LABEL: Record<BusComponentKind, string> = { splitter: 'SPLIT', joiner: 'JOIN' }

interface BusComponent3DProps {
  component: BusComponent
  onPinClick?: BusPinClickHandler
  onClick?: () => void
  selected?: boolean
  canDrag?: boolean
  drag?: DragBinding
}

/** A bus splitter or joiner by `component.kind`: a flat board, a `SPLIT xN` or `JOIN xN` label, and its pins from computeBusPinLayout. */
export function BusComponent3D({
  component,
  onPinClick,
  onClick,
  selected = false,
  canDrag = false,
  drag,
}: BusComponent3DProps) {
  const { position, rotation, width } = component
  const dims = computeBusBodyDimensions(component)
  const slots = computeBusPinLayout(component)
  const pinValue = (pinId: string): number =>
    component.inputs.find((p) => p.id === pinId)?.value ??
    component.outputs.find((p) => p.id === pinId)?.value ??
    0

  const [hovered, setHovered] = useState(false)
  if (!Object.prototype.hasOwnProperty.call(LABEL, component.kind)) return null
  const isDragging = drag?.isDragging ?? false

  const bodyColor = selected
    ? colors.gate.bodySelected
    : hovered
      ? colors.gate.bodyHover
      : colors.gate.body

  return (
    <>
      <group position={[position.x, position.y, position.z]} rotation={[rotation.x, rotation.y, rotation.z]}>
        <mesh
          onClick={(e) => {
            e.stopPropagation()
            if (drag && !drag.shouldAllowClick()) return
            if (onClick) onClick()
          }}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => { setHovered(false); if (canDrag && !isDragging) drag?.onPointerLeave() }}
          onPointerDown={canDrag ? drag?.onPointerDown : undefined}
          onPointerMove={canDrag ? drag?.onPointerMove : undefined}
          onPointerUp={canDrag ? drag?.onPointerUp : undefined}
        >
          <boxGeometry args={[dims.sizeX, dims.sizeY, dims.sizeZ]} />
          <meshStandardMaterial
            color={bodyColor}
            metalness={materials.gate.metalness}
            roughness={materials.gate.roughness}
            transparent={isDragging}
            opacity={isDragging ? 0.7 : 1}
          />
        </mesh>

        {slots.map((slot) => {
          const high = isSignalHigh(pinValue(slot.pinId))
          const pinColor = high ? colors.pin.active : colors.pin.inactive
          return (
            <mesh
              key={slot.pinId}
              position={slot.position}
              onClick={(e) => {
                e.stopPropagation()
                if (!onPinClick) return
                onPinClick(component.id, slot.pinId, slot.side, {
                  x: position.x + slot.position[0],
                  y: position.y + slot.position[1],
                  z: position.z + slot.position[2],
                })
              }}
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
          )
        })}
      </group>

      <FloatingLabel
        position={[position.x, position.y, position.z]}
        text={`${LABEL[component.kind]} x${width}`}
        offsetY={LABEL_GEOMETRY.NODE.offsetY}
      />
    </>
  )
}
BusComponent3D.displayName = 'BusComponent3D'
