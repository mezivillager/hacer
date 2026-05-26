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

  it('caps zIndexRange below every UI-chrome layer (z-10 chrome and z-50 overlays)', () => {
    // Regression guard for two related stacking bugs:
    //   1) Labels poking up through shadcn Popover/Dialog overlays at
    //      Tailwind `z-50` (chip selector etc.) — fixed earlier.
    //   2) Labels poking up through always-visible chrome at Tailwind
    //      `z-10` — right action bar drawer, properties panel, help bar,
    //      demo overlay. Reported 2026-05-26: a 3D output node label
    //      ("out0: 0x0") rendered on top of the right drawer when the
    //      label's projected screen position fell behind the drawer.
    //
    // Drei's `<Html>` zIndexRange is `[far, near]`; the *near* value is
    // the maximum z-index any label can take when its world point is at
    // the camera-near plane. The *far* value is the minimum (camera-far).
    // Both must stay strictly below 10 so labels can never out-stack any
    // UI chrome regardless of camera distance.
    const { getByTestId } = render(
      <FloatingLabel position={[0, 0, 0]} text="Input0: 0" />,
    )
    const props = JSON.parse(
      getByTestId('floating-label-html').getAttribute('data-html-props') ?? '{}',
    ) as { zIndexRange?: [number, number] }
    expect(Array.isArray(props.zIndexRange)).toBe(true)
    const [farZ, nearZ] = props.zIndexRange!
    expect(nearZ).toBeLessThan(10)
    expect(farZ).toBeLessThan(10)
  })

  it('exports LABEL_GEOMETRY presets for every labelled component class', () => {
    expect(LABEL_GEOMETRY.NODE.fontSize).toBeCloseTo(0.18)
    expect(LABEL_GEOMETRY.GATE.fontSize).toBeCloseTo(0.22)
    for (const preset of Object.values(LABEL_GEOMETRY)) {
      expect(preset.offsetY).toBeGreaterThan(0)
      expect(preset.offsetY).toBeLessThanOrEqual(0.6)
    }
    // Junction labels intentionally absent — see labelGeometry.ts.
    expect('JUNCTION' in LABEL_GEOMETRY).toBe(false)
  })
})
