import type { GateInstance, GateType } from '@/store/types'
import { NandGate, AndGate, OrGate, NotGate, XorGate } from './components'

// Use a readonly-compatible type for gate props from store snapshot
interface ReadonlyGate {
  readonly id: string
  readonly type: GateType
  readonly position: { readonly x: number; readonly y: number; readonly z: number }
  readonly rotation: { readonly x: number; readonly y: number; readonly z: number }
  readonly inputs: readonly { readonly id: string; readonly value: boolean }[]
  readonly outputs: readonly { readonly id: string; readonly value: boolean }[]
  readonly selected: boolean
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
  const commonProps = {
    id: gate.id,
    position: [gate.position.x, gate.position.y, gate.position.z] as [number, number, number],
    rotation: [gate.rotation.x, gate.rotation.y, gate.rotation.z] as [number, number, number],
    selected: gate.selected,
    isWiring,
    onClick,
    onPinClick,
    onInputToggle,
  }

  switch (gate.type) {
    case 'NAND':
      return (
        <NandGate
          {...commonProps}
          inputA={gate.inputs[0]?.value ?? false}
          inputB={gate.inputs[1]?.value ?? false}
          inputAConnected={isPinConnected(gate.id, `${gate.id}-in-0`)}
          inputBConnected={isPinConnected(gate.id, `${gate.id}-in-1`)}
          outputConnected={isPinConnected(gate.id, `${gate.id}-out-0`)}
        />
      )

    case 'AND':
      return (
        <AndGate
          {...commonProps}
          inputA={gate.inputs[0]?.value ?? false}
          inputB={gate.inputs[1]?.value ?? false}
          inputAConnected={isPinConnected(gate.id, `${gate.id}-in-0`)}
          inputBConnected={isPinConnected(gate.id, `${gate.id}-in-1`)}
          outputConnected={isPinConnected(gate.id, `${gate.id}-out-0`)}
        />
      )

    case 'OR':
      return (
        <OrGate
          {...commonProps}
          inputA={gate.inputs[0]?.value ?? false}
          inputB={gate.inputs[1]?.value ?? false}
          inputAConnected={isPinConnected(gate.id, `${gate.id}-in-0`)}
          inputBConnected={isPinConnected(gate.id, `${gate.id}-in-1`)}
          outputConnected={isPinConnected(gate.id, `${gate.id}-out-0`)}
        />
      )

    case 'NOT':
      return (
        <NotGate
          {...commonProps}
          input={gate.inputs[0]?.value ?? false}
          inputConnected={isPinConnected(gate.id, `${gate.id}-in-0`)}
          outputConnected={isPinConnected(gate.id, `${gate.id}-out-0`)}
        />
      )

    case 'XOR':
      return (
        <XorGate
          {...commonProps}
          inputA={gate.inputs[0]?.value ?? false}
          inputB={gate.inputs[1]?.value ?? false}
          inputAConnected={isPinConnected(gate.id, `${gate.id}-in-0`)}
          inputBConnected={isPinConnected(gate.id, `${gate.id}-in-1`)}
          outputConnected={isPinConnected(gate.id, `${gate.id}-out-0`)}
        />
      )

    // Fallback for unsupported gate types - render as NAND
    default:
      return (
        <NandGate
          {...commonProps}
          inputA={gate.inputs[0]?.value ?? false}
          inputB={gate.inputs[1]?.value ?? false}
          inputAConnected={isPinConnected(gate.id, `${gate.id}-in-0`)}
          inputBConnected={isPinConnected(gate.id, `${gate.id}-in-1`)}
          outputConnected={isPinConnected(gate.id, `${gate.id}-out-0`)}
        />
      )
  }
}
GateRenderer.displayName = 'GateRenderer'
