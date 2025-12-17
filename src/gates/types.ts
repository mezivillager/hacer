// Shared gate interfaces and types for 3D gate components

export interface BaseGateProps {
  id: string
  position?: [number, number, number]
  rotation?: [number, number, number]
  selected?: boolean
  isWiring?: boolean
  onClick?: () => void
  onPinClick?: (
    gateId: string,
    pinId: string,
    pinType: 'input' | 'output',
    worldPosition: { x: number; y: number; z: number }
  ) => void
  onInputToggle?: (gateId: string, pinId: string) => void
}

// Props for gates with two inputs (NAND, AND, OR)
export interface TwoInputGateProps extends BaseGateProps {
  inputA?: boolean
  inputB?: boolean
  inputAConnected?: boolean
  inputBConnected?: boolean
  outputConnected?: boolean
}

// Props for gates with one input (NOT)
export interface SingleInputGateProps extends BaseGateProps {
  input?: boolean
  inputConnected?: boolean
  outputConnected?: boolean
}

// Pin configuration for BaseGate component
export interface PinConfig {
  pinId: string
  position: [number, number, number]
  value: boolean
  connected: boolean
  pinType: 'input' | 'output'
  pinName: string // 'inputA', 'inputB', 'input', 'output'
}
