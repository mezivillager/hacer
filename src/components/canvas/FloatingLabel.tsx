import { Html } from '@react-three/drei'

const LABEL_DEFAULT_COLOR = '#ffffff'
const LABEL_DEFAULT_OFFSET_Y = 0.5
const LABEL_FONT_PX = 11

interface FloatingLabelProps {
  /** World-space anchor; offsetY is added to the Y component. */
  position: [number, number, number]
  text: string
  offsetY?: number
  color?: string
}

/**
 * Camera-facing floating label rendered as a DOM `<span>` overlay via Drei
 * `<Html>`. Uniform across performance modes: KiCad/Altium-style reference
 * designator look (monospace, small, dark translucent background) — cheap on
 * the GPU (no SDF text, no per-frame Billboard rotation) and consistent
 * regardless of camera angle or parent rotation.
 *
 * The component MUST be rendered as a **sibling** of any rotated `<group>`
 * (not nested inside), because Drei `<Html>` projects its world position
 * through the parent transform. Nesting it inside a rotated gate group would
 * place the label off to the side of the gate body.
 */
export function FloatingLabel({
  position,
  text,
  offsetY = LABEL_DEFAULT_OFFSET_Y,
  color = LABEL_DEFAULT_COLOR,
}: FloatingLabelProps) {
  if (!text) return null

  return (
    <Html
      position={[position[0], position[1] + offsetY, position[2]]}
      center
      zIndexRange={[100, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <span
        data-testid="floating-label"
        style={{
          fontSize: `${LABEL_FONT_PX}px`,
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
