import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { FloatingLabel } from './FloatingLabel'
import { LABEL_GEOMETRY } from './labelGeometry'

vi.mock('@react-three/drei', () => ({
  Html: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="floating-label-html">{children}</div>
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
