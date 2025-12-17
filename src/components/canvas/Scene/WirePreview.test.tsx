import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { WirePreview } from './WirePreview'
import { useCircuitStore } from '@/store/circuitStore'

// Mock Wire3D component
vi.mock('../Wire3D', () => ({
  Wire3D: ({ start, end, isPreview }: { start: unknown; end: unknown; isPreview: boolean }) => (
    <div data-testid="wire-3d" data-start={JSON.stringify(start)} data-end={JSON.stringify(end)} data-preview={isPreview}>
      Wire3D
    </div>
  ),
}))

const setState = useCircuitStore.setState

describe('WirePreview', () => {
  beforeEach(() => {
    setState({
      wiringFrom: null,
    })
  })

  it('returns null when wiringFrom is null', () => {
    const { container } = render(<WirePreview />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when wiringFrom exists but previewEndPosition is null', () => {
    setState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0, z: 0 },
        previewEndPosition: null,
      },
    })
    const { container } = render(<WirePreview />)
    expect(container.firstChild).toBeNull()
  })

  it('renders Wire3D when wiringFrom and previewEndPosition are set', () => {
    setState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0.5, z: 0 },
        previewEndPosition: { x: 2, y: 0.5, z: 2 },
      },
    })
    const { getByTestId } = render(<WirePreview />)
    const wire = getByTestId('wire-3d')
    expect(wire).toBeInTheDocument()
    expect(wire.getAttribute('data-preview')).toBe('true')
  })

  it('passes correct start and end positions to Wire3D', () => {
    const fromPosition = { x: 1, y: 0.5, z: 1 }
    const previewEndPosition = { x: 3, y: 0.5, z: 3 }
    setState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition,
        previewEndPosition,
      },
    })
    const { getByTestId } = render(<WirePreview />)
    const wire = getByTestId('wire-3d')
    expect(wire.getAttribute('data-start')).toBe(JSON.stringify(fromPosition))
    expect(wire.getAttribute('data-end')).toBe(JSON.stringify(previewEndPosition))
  })
})
