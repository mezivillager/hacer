// Tests for InputNode3D component
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InputNode3D } from './InputNode3D'

vi.mock('@/store/circuitStore', () => {
  const mockState = {
    placementMode: null,
    wiringFrom: null,
    nodePlacementMode: null,
    junctionPlacementMode: null,
  }

  return {
    useCircuitStore: <T,>(selector: (state: typeof mockState) => T) => selector(mockState),
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

describe('InputNode3D', () => {
  it('exports a valid component', () => {
    expect(InputNode3D).toBeDefined()
    expect(typeof InputNode3D).toBe('function')
  })

  it('has displayName for debugging', () => {
    expect(InputNode3D.displayName).toBe('InputNode3D')
  })

  it('renders both node name label and value label', () => {
    render(
      <InputNode3D
        id="input-1"
        name="a"
        position={{ x: 0, y: 0, z: 0 }}
        rotation={{ x: 0, y: 0, z: 0 }}
        value={1}
      />
    )

    const labels = screen.getAllByTestId('node-text').map((node) => node.textContent)
    expect(labels).toContain('a')
    expect(labels).toContain('1')
  })
})
