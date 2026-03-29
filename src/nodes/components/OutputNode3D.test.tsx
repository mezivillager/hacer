// Tests for OutputNode3D component
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OutputNode3D } from './OutputNode3D'

vi.mock('@/store/circuitStore', () => {
  const mockState = {
    placementMode: null,
    wiringFrom: null,
    nodePlacementMode: null,
    junctionPlacementMode: null,
  }

  return {
    useCircuitStore: <T,>(selector: (state: typeof mockState) => T) => selector(mockState),
    circuitActions: {
      setDestinationNode: vi.fn(),
    },
  }
})

vi.mock('@/hooks/useNodeDrag', () => ({
  useNodeDrag: vi.fn(() => ({
    isDragging: false,
    shouldAllowClick: () => true,
    onPointerDown: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerUp: vi.fn(),
    onPointerLeave: vi.fn(),
  })),
}))

vi.mock('@react-three/drei', () => ({
  Text: ({ children }: { children: string }) => <div data-testid="node-text">{children}</div>,
}))

describe('OutputNode3D', () => {
  it('exports a valid component', () => {
    expect(OutputNode3D).toBeDefined()
    expect(typeof OutputNode3D).toBe('function')
  })

  it('has displayName for debugging', () => {
    expect(OutputNode3D.displayName).toBe('OutputNode3D')
  })

  it('renders both node name label and value label', () => {
    render(
      <OutputNode3D
        id="output-1"
        name="out"
        position={{ x: 8, y: 0, z: 0 }}
        rotation={{ x: 0, y: 0, z: 0 }}
        value={0}
      />
    )

    const labels = screen.getAllByTestId('node-text').map((node) => node.textContent)
    expect(labels).toContain('out')
    expect(labels).toContain('0')
  })
})
