import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { FloatingLabel } from './FloatingLabel'
import { LABEL_GEOMETRY } from './labelGeometry'

// Capture the props passed to drei's `<Html>` so we can assert on its
// projection-driven zIndexRange. The mock returns a sibling div carrying the
// captured props as JSON for inspection.
vi.mock('@react-three/drei', () => ({
  Html: ({ children, ...rest }: { children: React.ReactNode; [k: string]: unknown }) => (
    <div data-testid="floating-label-html" data-html-props={JSON.stringify(rest)}>
      {children}
    </div>
  ),
}))

describe('FloatingLabel', () => {
  it('renders an Html overlay with the supplied text', () => {
    const { getByTestId } = render(
      <FloatingLabel position={[0, 0, 0]} text="in: 0x0F" />,
    )
    expect(getByTestId('floating-label-html')).toBeInTheDocument()
    expect(getByTestId('floating-label')).toHaveTextContent('in: 0x0F')
  })

  it('returns null when text is empty', () => {
    const { container } = render(
      <FloatingLabel position={[0, 0, 0]} text="" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('caps zIndexRange below the shadcn popover/dialog layer (z-50)', () => {
    // Regression guard for the bug where scene-element labels (input/output
    // node names, junction labels, gate name labels) projected up through
    // shadcn Popover/Dialog overlays (which use Tailwind `z-50`). Drei's
    // `<Html>` zIndexRange is `[far, near]`; the *near* value is the maximum
    // z-index any label can take. Cap it strictly below 50 so labels never
    // out-stack the chip selector popover or any dialog overlay.
    const { getByTestId } = render(
      <FloatingLabel position={[0, 0, 0]} text="Input0: 0" />,
    )
    const props = JSON.parse(
      getByTestId('floating-label-html').getAttribute('data-html-props') ?? '{}',
    ) as { zIndexRange?: [number, number] }
    expect(Array.isArray(props.zIndexRange)).toBe(true)
    const [farZ, nearZ] = props.zIndexRange!
    expect(nearZ).toBeLessThan(50)
    expect(farZ).toBeLessThan(50)
  })

  it('exports LABEL_GEOMETRY presets for every component class', () => {
    expect(LABEL_GEOMETRY.NODE.fontSize).toBeCloseTo(0.18)
    expect(LABEL_GEOMETRY.GATE.fontSize).toBeCloseTo(0.22)
    expect(LABEL_GEOMETRY.JUNCTION.fontSize).toBeCloseTo(0.14)
    for (const preset of Object.values(LABEL_GEOMETRY)) {
      expect(preset.offsetY).toBeGreaterThan(0)
      expect(preset.offsetY).toBeLessThanOrEqual(0.6)
    }
  })
})
