// BusSplitter3D - 1 N-bit input fanned out to N 1-bit outputs
import { useState } from 'react'
import type { BusComponent } from '@/store/types'
import { colors, materials } from '@/theme'
import { NODE_DIMENSIONS } from './config'
import { computeBusPinLayout, computeBusBodyDimensions } from '@/components/scene/busBodyLayout'
import { isSignalHigh } from '@/simulation/signalDisplay'
import { FloatingLabel } from '@/components/canvas/FloatingLabel'
import { LABEL_GEOMETRY } from '@/components/canvas/labelGeometry'
import { useBusDrag } from '@/hooks/useBusDrag'
import { useCircuitStore } from '@/store/circuitStore'

export type BusPinClickHandler = (
  componentId: string,
  pinId: string,
  pinType: 'input' | 'output',
  worldPosition: { x: number; y: number; z: number },
) => void

interface BusSplitter3DProps {
  component: BusComponent
  onPinClick?: BusPinClickHandler
  onClick?: () => void
  selected?: boolean
}

/**
 * Renders a bus splitter: a flat board whose depth scales with width, a
 * `SPLIT xN` label, and dynamically laid-out pins (1 input on the left, N
 * outputs on the right) from computeBusPinLayout. React-Compiler clean: no
 * memo hooks; pin layout computed inline.
 */
export function BusSplitter3D({ component, onPinClick, onClick, selected = false }: BusSplitter3DProps) {
  const { position, rotation, width } = component
  const dims = computeBusBodyDimensions(component)
  const slots = computeBusPinLayout(component)
  const pinValue = (pinId: string): number =>
    component.inputs.find((p) => p.id === pinId)?.value ??
    component.outputs.find((p) => p.id === pinId)?.value ??
    0

  const [hovered, setHovered] = useState(false)
  const wiringFrom = useCircuitStore((s) => s.wiringFrom)
  const busPlacementMode = useCircuitStore((s) => s.busPlacementMode)
  const canDrag = wiringFrom === null && busPlacementMode === null

  const { isDragging, shouldAllowClick, onPointerDown, onPointerMove, onPointerUp, onPointerLeave } = useBusDrag(component.id)

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
            if (!shouldAllowClick()) return
            if (onClick) onClick()
          }}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => { setHovered(false); if (canDrag && !isDragging) onPointerLeave() }}
          onPointerDown={canDrag ? onPointerDown : undefined}
          onPointerMove={canDrag ? onPointerMove : undefined}
          onPointerUp={canDrag ? onPointerUp : undefined}
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
        text={`SPLIT x${width}`}
        offsetY={LABEL_GEOMETRY.NODE.offsetY}
      />
    </>
  )
}
BusSplitter3D.displayName = 'BusSplitter3D'
