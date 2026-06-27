// BusJoiner3D - N 1-bit inputs joined into 1 N-bit output
import type { BusComponent } from '@/store/types'
import { colors, materials } from '@/theme'
import { NODE_DIMENSIONS } from './config'
import { computeBusPinLayout, computeBusBodyDimensions } from '@/components/scene/busBodyLayout'
import { isSignalHigh } from '@/simulation/signalDisplay'
import { FloatingLabel } from '@/components/canvas/FloatingLabel'
import { LABEL_GEOMETRY } from '@/components/canvas/labelGeometry'
import type { BusPinClickHandler } from './BusSplitter3D'

interface BusJoiner3DProps {
  component: BusComponent
  onPinClick?: BusPinClickHandler
}

/**
 * Renders a bus joiner: a flat board whose depth scales with width, a
 * `JOIN xN` label, and dynamically laid-out pins (N inputs on the left, 1
 * output on the right). React-Compiler clean: no memo hooks.
 */
export function BusJoiner3D({ component, onPinClick }: BusJoiner3DProps) {
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
        text={`JOIN x${width}`}
        offsetY={LABEL_GEOMETRY.NODE.offsetY}
      />
    </>
  )
}
BusJoiner3D.displayName = 'BusJoiner3D'
