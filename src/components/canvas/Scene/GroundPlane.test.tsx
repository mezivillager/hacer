import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { GroundPlane } from './GroundPlane'

// Mock handlers
vi.mock('../handlers/groundPlaneHandlers', () => ({
  handlePointerMove: vi.fn(),
  handlePointerLeave: vi.fn(),
  handleClick: vi.fn(),
  handlePointerUp: vi.fn(),
}))

describe('GroundPlane', () => {
  it('renders a mesh element', () => {
    const { container } = render(<GroundPlane />)
    expect(container.innerHTML).toContain('mesh')
  })

  it('renders with plane geometry', () => {
    const { container } = render(<GroundPlane />)
    expect(container.innerHTML).toContain('planegeometry')
  })

  it('renders with invisible material (opacity 0)', () => {
    const { container } = render(<GroundPlane />)
    expect(container.innerHTML).toContain('meshbasicmaterial')
    expect(container.innerHTML).toContain('opacity="0"')
  })

  it('renders mesh with rotation for horizontal orientation', () => {
    const { container } = render(<GroundPlane />)
    // Mesh is rotated -90 degrees on X axis to be horizontal
    expect(container.innerHTML).toContain('rotation="-1.5707963267948966,0,0"')
  })
})
