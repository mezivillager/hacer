import { Billboard, Html, Text } from '@react-three/drei'
import { useCircuitStore } from '@/store/circuitStore'

const LABEL_DEFAULT_COLOR = '#ffffff'
const LABEL_DEFAULT_FONT_SIZE = 0.2
const LABEL_DEFAULT_OFFSET_Y = 0.5
const LABEL_OUTLINE_WIDTH = 0.015
const LABEL_CRUDE_FONT_PX = 11

export type LowPowerVariant = 'hide' | 'html'

interface FloatingLabelProps {
  position: [number, number, number]
  text: string
  offsetY?: number
  color?: string
  fontSize?: number
  /**
   * Behaviour when `performanceMode === 'low-power'`.
   * - 'hide' (default): render nothing — preserves legacy behaviour.
   * - 'html': render a lightweight DOM `<span>` overlay via Drei `<Html>`.
   *   Cheaper than the SDF `<Text>` + per-frame Billboard rotation, but still
   *   shows the label so users can identify components in low-power mode.
   */
  lowPowerVariant?: LowPowerVariant
}

export function FloatingLabel({
  position,
  text,
  offsetY = LABEL_DEFAULT_OFFSET_Y,
  color = LABEL_DEFAULT_COLOR,
  fontSize = LABEL_DEFAULT_FONT_SIZE,
  lowPowerVariant = 'hide',
}: FloatingLabelProps) {
  const performanceMode = useCircuitStore((s) => s.performanceMode)
  if (!text) return null

  const labelPos: [number, number, number] = [
    position[0],
    position[1] + offsetY,
    position[2],
  ]

  if (performanceMode === 'low-power') {
    if (lowPowerVariant === 'hide') return null
    return (
      <Html
        position={labelPos}
        center
        zIndexRange={[100, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <span
          data-testid="floating-label-crude"
          style={{
            fontSize: `${LABEL_CRUDE_FONT_PX}px`,
            color,
            background: 'rgba(0,0,0,0.55)',
            padding: '1px 4px',
            borderRadius: 2,
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
          }}
        >
          {text}
        </span>
      </Html>
    )
  }

  return (
    <Billboard position={labelPos}>
      <Text
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={LABEL_OUTLINE_WIDTH}
        outlineColor="#000000"
      >
        {text}
      </Text>
    </Billboard>
  )
}
