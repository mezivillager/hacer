import type { GateInstance } from '@/store/types'
import { ChipBody3D } from '@/components/scene/ChipBody3D'

interface ReadonlyGate {
  readonly id: string
  readonly chipName: string
  readonly position: { readonly x: number; readonly y: number; readonly z: number }
  readonly rotation: { readonly x: number; readonly y: number; readonly z: number }
  readonly inputs: readonly {
    readonly id: string
    readonly name: string
    readonly value: number
    readonly width?: number
    readonly type: 'input'
  }[]
  readonly outputs: readonly {
    readonly id: string
    readonly name: string
    readonly value: number
    readonly width?: number
    readonly type: 'output'
  }[]
  readonly selected: boolean
  readonly width: number
}

interface GateRendererProps {
  gate: GateInstance | ReadonlyGate
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

export function GateRenderer({
  gate,
  isWiring,
  isPinConnected,
  onClick,
  onPinClick,
  onInputToggle,
}: GateRendererProps) {
  return (
    <ChipBody3D
      gate={gate as GateInstance}
      isWiring={isWiring}
      isPinConnected={isPinConnected}
      onClick={onClick}
      onPinClick={onPinClick}
      onInputToggle={onInputToggle}
    />
  )
}
GateRenderer.displayName = 'GateRenderer'
