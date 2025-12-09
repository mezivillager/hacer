import { memo } from 'react'
import { Html } from '@react-three/drei'
import { colors } from '@/theme'

interface GateLabelProps {
  inputA: boolean
  inputB: boolean
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

function GateLabelComponent({ inputA, inputB, output, visible }: GateLabelProps) {
  if (!visible) return null

  return (
    <Html position={[0, 0.7, 0]} center>
      <div style={labelStyle}>
        NAND: {inputA ? '1' : '0'} ∧ {inputB ? '1' : '0'} → {output ? '1' : '0'}
      </div>
    </Html>
  )
}

export const GateLabel = memo(GateLabelComponent)
GateLabel.displayName = 'GateLabel'
