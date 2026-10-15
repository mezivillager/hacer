import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BusSplitter3D } from './BusSplitter3D'
import { BusJoiner3D } from './BusJoiner3D'
import { createBusPins } from '@/simulation'
import type { BusComponent, BusComponentKind } from '@/types/scene'

vi.mock('@react-three/drei', () => ({
  Html: ({ children }: { children: React.ReactNode }) => <div data-testid="node-label">{children}</div>,
}))

function makeBus(kind: BusComponentKind, width: number): BusComponent {
  const { inputs, outputs } = createBusPins(kind, width)
  return { id: 'bus-1', kind, position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width, inputs, outputs, selected: false }
}

describe.each([
  { kind: 'splitter' as const, BusMesh: BusSplitter3D, name: 'BusSplitter3D', label: 'SPLIT x4' },
  { kind: 'joiner' as const, BusMesh: BusJoiner3D, name: 'BusJoiner3D', label: 'JOIN x4' },
])('the $kind mesh', ({ kind, BusMesh, name, label }) => {
  it('exports a valid component with a displayName', () => {
    expect(typeof BusMesh).toBe('function')
    expect(BusMesh.displayName).toBe(name)
  })

  it(`renders a ${label} label`, () => {
    render(<BusMesh component={makeBus(kind, 4)} />)
    const labels = screen.getAllByTestId('node-label').map((n) => n.textContent)
    expect(labels).toContain(label)
  })
})
