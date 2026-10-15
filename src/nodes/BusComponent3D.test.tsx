import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BusComponent3D } from './BusComponent3D'
import { createBusPins } from '@/simulation'
import type { BusComponent, BusComponentKind } from '@/types/scene'

vi.mock('@react-three/drei', () => ({
  Html: ({ children }: { children: React.ReactNode }) => <div data-testid="node-label">{children}</div>,
}))

function makeBus(kind: BusComponentKind, width: number): BusComponent {
  const { inputs, outputs } = createBusPins(kind, width)
  return { id: 'bus-1', kind, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width, inputs, outputs, selected: false }
}

describe('BusComponent3D', () => {
  it('exports a valid component with a displayName', () => {
    expect(typeof BusComponent3D).toBe('function')
    expect(BusComponent3D.displayName).toBe('BusComponent3D')
  })

  it.each([
    ['splitter', 'SPLIT x4'],
    ['joiner', 'JOIN x4'],
  ] as const)('renders a %s with its label, %s', (kind, label) => {
    render(<BusComponent3D component={makeBus(kind, 4)} />)
    const labels = screen.getAllByTestId('node-label').map((n) => n.textContent)
    expect(labels).toContain(label)
  })
})
