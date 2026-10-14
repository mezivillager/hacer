// Tests for InputNode3D component
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InputNode3D } from './InputNode3D'

vi.mock('@react-three/drei', () => ({
  Html: ({ children }: { children: React.ReactNode }) => <div data-testid="node-label">{children}</div>,
}))

describe('InputNode3D', () => {
  it('exports a valid component', () => {
    expect(InputNode3D).toBeDefined()
    expect(typeof InputNode3D).toBe('function')
  })

  it('has displayName for debugging', () => {
    expect(InputNode3D.displayName).toBe('InputNode3D')
  })

  it('renders a combined floating label with name and value', () => {
    render(
      <InputNode3D
        id="input-1"
        name="a"
        position={{ x: 0, y: 0, z: 0 }}
        rotation={{ x: 0, y: 0, z: 0 }}
        value={1}
        width={1}
      />
    )

    const labels = screen.getAllByTestId('node-label').map((node) => node.textContent)
    expect(labels).toContain('a: 1')
  })
})
