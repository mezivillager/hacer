import { Billboard, Text } from '@react-three/drei'
import { useCircuitStore } from '@/store/circuitStore'

interface FloatingLabelProps {
  position: [number, number, number]
  text: string
  offsetY?: number
  color?: string
  fontSize?: number
}

const LABEL_DEFAULT_COLOR = '#ffffff'
const LABEL_FONT_SIZE = 0.35
const LABEL_DEFAULT_OFFSET_Y = 1.6

export function FloatingLabel({
  position,
  text,
  offsetY = LABEL_DEFAULT_OFFSET_Y,
  color = LABEL_DEFAULT_COLOR,
  fontSize = LABEL_FONT_SIZE,
}: FloatingLabelProps) {
  const performanceMode = useCircuitStore((s) => s.performanceMode)
  if (performanceMode === 'low-power') return null
  if (!text) return null

  return (
    <Billboard position={[position[0], position[1] + offsetY, position[2]]}>
      <Text
        fontSize={fontSize}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {text}
      </Text>
    </Billboard>
  )
}
