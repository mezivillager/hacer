import { memo } from 'react'
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

function BaseGateLabelComponent({ gateType, inputs, output, visible }: BaseGateLabelProps) {
  if (!visible) return null

  return (
    <Html position={[0, 0.7, 0]} center>
      <div style={labelStyle}>
        {formatLabel(gateType, inputs, output)}
      </div>
    </Html>
  )
}

export const BaseGateLabel = memo(BaseGateLabelComponent)
BaseGateLabel.displayName = 'BaseGateLabel'
