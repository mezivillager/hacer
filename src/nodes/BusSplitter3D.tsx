// BusSplitter3D - 1 N-bit input fanned out to N 1-bit outputs
import type { BusComponent } from '@/store/types'
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

interface BusSplitter3DProps {
  component: BusComponent
  onPinClick?: BusPinClickHandler
}

/**
 * Renders a bus splitter: a flat board whose depth scales with width, a
 * `SPLIT xN` label, and dynamically laid-out pins (1 input on the left, N
 * outputs on the right) from computeBusPinLayout. React-Compiler clean: no
 * memo hooks; pin layout computed inline.
 */
export function BusSplitter3D({ component, onPinClick }: BusSplitter3DProps) {
  const { position, rotation, width } = component
  const dims = computeBusBodyDimensions(component)
  const slots = computeBusPinLayout(component)
  const pinValue = (pinId: string): number =>
    component.inputs.find((p) => p.id === pinId)?.value ??
    component.outputs.find((p) => p.id === pinId)?.value ??
    0

  return (
    <>
      <group position={[position.x, position.y, position.z]} rotation={[rotation.x, rotation.y, rotation.z]}>
        <mesh>
          <boxGeometry args={[dims.sizeX, dims.sizeY, dims.sizeZ]} />
          <meshStandardMaterial
            color={colors.gate.body}
            metalness={materials.gate.metalness}
            roughness={materials.gate.roughness}
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
