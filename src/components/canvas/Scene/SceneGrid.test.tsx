import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { SceneGrid } from './SceneGrid'

// Mock @react-three/drei Grid component
vi.mock('@react-three/drei', () => ({
  Grid: (props: Record<string, unknown>) => (
    <div data-testid="grid" {...Object.fromEntries(
      Object.entries(props).map(([k, v]) => [`data-${k.toLowerCase()}`, String(v)])
    )}>
      Grid
    </div>
  ),
}))

describe('SceneGrid', () => {
  it('renders Grid component', () => {
    const { getByTestId } = render(<SceneGrid />)
    expect(getByTestId('grid')).toBeInTheDocument()
  })

  it('sets cellSize to GRID_SIZE (2.0)', () => {
    const { getByTestId } = render(<SceneGrid />)
    const grid = getByTestId('grid')
    expect(grid.getAttribute('data-cellsize')).toBe('2')
  })

  it('enables infinite grid', () => {
    const { getByTestId } = render(<SceneGrid />)
    const grid = getByTestId('grid')
    expect(grid.getAttribute('data-infinitegrid')).toBe('true')
  })

  it('sets followCamera to false', () => {
    const { getByTestId } = render(<SceneGrid />)
    const grid = getByTestId('grid')
    expect(grid.getAttribute('data-followcamera')).toBe('false')
  })
})
