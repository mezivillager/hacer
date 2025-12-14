import { Html } from '@react-three/drei'
import { colors } from '@/theme'
import type { GateType } from '@/store/types'

interface BaseGateLabelProps {
  gateType: GateType
  inputs: boolean[]
  output: boolean
  visible: boolean
}

const labelStyle = {
  background: colors.overlay.labelBackground,
  color: colors.text.primary,
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  whiteSpace: 'nowrap' as const,
  fontFamily: 'monospace',
}

// Gate operator symbols
const gateOperators: Record<GateType, string> = {
  NAND: '⊼',
  AND: '∧',
  OR: '∨',
  NOT: '¬',
  NOR: '⊽',
  XOR: '⊕',
  XNOR: '⊙',
}

function formatLabel(gateType: GateType, inputs: boolean[], output: boolean): string {
  const operator = gateOperators[gateType]
  const inputStr = inputs.map(v => v ? '1' : '0').join(` ${operator} `)
  
  if (gateType === 'NOT') {
    return `${gateType}: ${operator}${inputs[0] ? '1' : '0'} → ${output ? '1' : '0'}`
  }
  
  return `${gateType}: ${inputStr} → ${output ? '1' : '0'}`
}

export function BaseGateLabel({ gateType, inputs, output, visible }: BaseGateLabelProps) {
  if (!visible) return null

  // Position label above the flat gate's top face
  // Gate is rotated 90° around X, so top face is at local Z+ = BODY_DEPTH/2 = 0.2
  // After rotation: local [0, 0, 0.5] → world [0, -0.5, 0] in Y
  // But we want it above, so use local [0, 0, -0.5] → world [0, 0.5, 0] in Y
  // Actually, Html is billboarded and positions relative to parent, so we position
  // at local [0, 0, -0.5] which becomes world Y+ (above the gate)
  return (
    <Html position={[0, 0, -0.5]} center>
      <div style={labelStyle}>
        {formatLabel(gateType, inputs, output)}
      </div>
    </Html>
  )
}
BaseGateLabel.displayName = 'BaseGateLabel'
