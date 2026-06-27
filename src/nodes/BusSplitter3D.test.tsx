import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BusSplitter3D } from './BusSplitter3D'
import { createBusPins } from '@/store/actions/busActions/busPins'
import type { BusComponent } from '@/store/types'

vi.mock('@react-three/drei', () => ({
  Html: ({ children }: { children: React.ReactNode }) => <div data-testid="node-label">{children}</div>,
}))

function makeSplitter(width: number): BusComponent {
  const { inputs, outputs } = createBusPins('splitter', width)
  return { id: 'bus-1', kind: 'splitter', position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, width, inputs, outputs, selected: false }
}

describe('BusSplitter3D', () => {
  it('exports a valid component with a displayName', () => {
    expect(typeof BusSplitter3D).toBe('function')
    expect(BusSplitter3D.displayName).toBe('BusSplitter3D')
  })

  it('renders a SPLIT xN label', () => {
    render(<BusSplitter3D component={makeSplitter(4)} />)
    const labels = screen.getAllByTestId('node-label').map((n) => n.textContent)
    expect(labels).toContain('SPLIT x4')
  })
})
