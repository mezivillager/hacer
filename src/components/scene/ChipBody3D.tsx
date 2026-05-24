import { BaseGate } from '@/gates/common/BaseGate'
import type { PinConfig } from '@/gates/types'
import { computeChipLayout } from './chipBodyLayout'
import { getBuiltinChipRegistry, getUserChipRegistry } from '@/core/chips/appRegistry'
import type { GateInstance } from '@/store/types'

interface ChipBody3DProps {
  gate: GateInstance
  isWiring: boolean
  isPinConnected: (gateId: string, pinId: string) => boolean
  onClick: () => void
  onPinClick: (
    gateId: string,
    pinId: string,
    pinType: 'input' | 'output',
    worldPosition: { x: number; y: number; z: number }
  ) => void
  onInputToggle: (gateId: string, pinId: string) => void
}

const CHIP_BODY_COLOR = '#3b4252'
const CHIP_BODY_HOVER = '#434c5e'
const CHIP_BODY_SELECTED = '#5e81ac'

export function ChipBody3D({
  gate,
  isWiring,
  isPinConnected,
  onClick,
  onPinClick,
  onInputToggle,
}: ChipBody3DProps) {
  const chip =
    getBuiltinChipRegistry().get(gate.chipName) ??
    getUserChipRegistry().get(gate.chipName)
  if (!chip) {
    throw new Error(`ChipBody3D: chip "${gate.chipName}" not found in any registry`)
  }

  const layout = computeChipLayout(chip, gate.id)
  const { bodyDimensions, pinSlots } = layout

  const pinConfigs: PinConfig[] = pinSlots.map((slot) => {
    const sourcePin = slot.side === 'input'
      ? gate.inputs[slot.indexOnSide]
      : gate.outputs[slot.indexOnSide]
    return {
      pinId: sourcePin?.id ?? slot.pinId,
      position: slot.position,
      value: sourcePin?.value ?? 0,
      connected: isPinConnected(gate.id, sourcePin?.id ?? slot.pinId),
      pinType: slot.side,
      pinName: slot.pinName + (slot.width > 1 ? `[${slot.width}]` : ''),
    }
  })

  const wireStubPositions: [number, number, number][] = pinSlots.map((s) => s.position)

  return (
    <BaseGate
      id={gate.id}
      position={[gate.position.x, gate.position.y, gate.position.z]}
      rotation={[gate.rotation.x, gate.rotation.y, gate.rotation.z]}
      selected={gate.selected}
      isWiring={isWiring}
      bodyColor={CHIP_BODY_COLOR}
      bodyHoverColor={CHIP_BODY_HOVER}
      bodySelectedColor={CHIP_BODY_SELECTED}
      output={gate.outputs[0]?.value ?? 0}
      inputs={gate.inputs.map((p) => p.value)}
      pinConfigs={pinConfigs}
      wireStubPositions={wireStubPositions}
      bodyGeometry={
        <boxGeometry args={[bodyDimensions.sizeX, bodyDimensions.sizeY, bodyDimensions.sizeZ]} />
      }
      textLabel={chip.name}
      onClick={onClick}
      onPinClick={onPinClick}
      onInputToggle={onInputToggle}
    />
  )
}
ChipBody3D.displayName = 'ChipBody3D'
