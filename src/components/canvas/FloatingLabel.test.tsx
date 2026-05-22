import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { FloatingLabel } from './FloatingLabel'
import { LABEL_GEOMETRY } from './labelGeometry'
import { useCircuitStore } from '@/store/circuitStore'

vi.mock('@react-three/drei', () => ({
  Text: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="floating-label-sdf">{children}</div>
  ),
  Billboard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="floating-label-billboard">{children}</div>
  ),
  Html: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="floating-label-html">{children}</div>
  ),
}))

describe('FloatingLabel', () => {
  beforeEach(() => {
    useCircuitStore.setState({ performanceMode: 'normal' })
  })

  it('renders the SDF Billboard label in normal mode', () => {
    const { getByTestId, queryByTestId } = render(
      <FloatingLabel position={[0, 0, 0]} text="in: 0x0F" />,
    )
    expect(getByTestId('floating-label-billboard')).toBeInTheDocument()
    expect(getByTestId('floating-label-sdf')).toHaveTextContent('in: 0x0F')
    expect(queryByTestId('floating-label-html')).not.toBeInTheDocument()
  })

  it('returns null in low-power mode when lowPowerVariant defaults to "hide"', () => {
    useCircuitStore.setState({ performanceMode: 'low-power' })
    const { container, queryByTestId } = render(
      <FloatingLabel position={[0, 0, 0]} text="hidden" />,
    )
    expect(container.firstChild).toBeNull()
    expect(queryByTestId('floating-label-html')).not.toBeInTheDocument()
    expect(queryByTestId('floating-label-sdf')).not.toBeInTheDocument()
  })

  it('renders a crude DOM overlay in low-power mode when lowPowerVariant="html"', () => {
    useCircuitStore.setState({ performanceMode: 'low-power' })
    const { getByTestId, queryByTestId } = render(
      <FloatingLabel position={[0, 0, 0]} text="crude" lowPowerVariant="html" />,
    )
    expect(getByTestId('floating-label-html')).toBeInTheDocument()
    const crude = document.querySelector('[data-testid="floating-label-crude"]')
    expect(crude?.textContent).toBe('crude')
    expect(queryByTestId('floating-label-sdf')).not.toBeInTheDocument()
  })

  it('does not render the crude DOM overlay in normal mode even when lowPowerVariant="html"', () => {
    const { queryByTestId } = render(
      <FloatingLabel position={[0, 0, 0]} text="full" lowPowerVariant="html" />,
    )
    expect(queryByTestId('floating-label-html')).not.toBeInTheDocument()
    expect(queryByTestId('floating-label-sdf')).toHaveTextContent('full')
  })

  it('returns null when text is empty in normal mode', () => {
    const { container } = render(
      <FloatingLabel position={[0, 0, 0]} text="" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('returns null when text is empty in low-power mode (html variant)', () => {
    useCircuitStore.setState({ performanceMode: 'low-power' })
    const { container } = render(
      <FloatingLabel position={[0, 0, 0]} text="" lowPowerVariant="html" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('exports LABEL_GEOMETRY presets for every component class', () => {
    expect(LABEL_GEOMETRY.NODE.fontSize).toBeCloseTo(0.18)
    expect(LABEL_GEOMETRY.GATE.fontSize).toBeCloseTo(0.22)
    expect(LABEL_GEOMETRY.JUNCTION.fontSize).toBeCloseTo(0.14)
    expect(LABEL_GEOMETRY.WIRE.fontSize).toBeCloseTo(0.16)
    for (const preset of Object.values(LABEL_GEOMETRY)) {
      expect(preset.offsetY).toBeGreaterThan(0)
      expect(preset.offsetY).toBeLessThanOrEqual(0.6)
    }
  })
})
