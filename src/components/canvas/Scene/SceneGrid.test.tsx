import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { SceneGrid } from './SceneGrid'
import { useCircuitStore } from '@/store/circuitStore'

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
  beforeEach(() => {
    useCircuitStore.setState({ performanceMode: 'normal' })
  })

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

  it('uses a finite lighter grid in low-power mode', () => {
    useCircuitStore.setState({ performanceMode: 'low-power' })

    const { getByTestId } = render(<SceneGrid />)
    const grid = getByTestId('grid')

    expect(grid.getAttribute('data-infinitegrid')).toBe('false')
    expect(grid.getAttribute('data-cellthickness')).toBe('0.6')
    expect(grid.getAttribute('data-sectionthickness')).toBe('0.8')
    expect(grid.getAttribute('data-fadedistance')).toBe('18')
  })
})
