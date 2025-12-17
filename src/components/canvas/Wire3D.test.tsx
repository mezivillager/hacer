import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Wire3D } from './Wire3D'

// Mock Three.js classes with proper constructor functions
vi.mock('three', () => {
  function Vector3(x: number, y: number, z: number) {
    return { x, y, z }
  }
  function CatmullRomCurve3() {
    return {}
  }
  return { Vector3, CatmullRomCurve3 }
})

// Mock R3F primitives
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

describe('Wire3D', () => {
  const validStart = { x: 0, y: 0, z: 0 }
  const validEnd = { x: 1, y: 1, z: 1 }

  it('returns null when start is null', () => {
    const { container } = render(<Wire3D start={null} end={validEnd} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when end is null', () => {
    const { container } = render(<Wire3D start={validStart} end={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when both start and end are null', () => {
    const { container } = render(<Wire3D start={null} end={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders mesh when start and end are provided', () => {
    const { container } = render(<Wire3D start={validStart} end={validEnd} />)
    // Component renders a mesh element in R3F
    expect(container.innerHTML).toContain('mesh')
  })

  it('renders with default props', () => {
    const { container } = render(<Wire3D start={validStart} end={validEnd} />)
    // R3F elements are lowercased in DOM
    expect(container.innerHTML).toContain('meshstandardmaterial')
  })

  it('renders with isActive true', () => {
    const { container } = render(
      <Wire3D start={validStart} end={validEnd} isActive={true} />
    )
    expect(container.innerHTML).toContain('mesh')
  })

  it('renders with isPreview true', () => {
    const { container } = render(
      <Wire3D start={validStart} end={validEnd} isPreview={true} />
    )
    expect(container.innerHTML).toContain('mesh')
  })

  it('renders with custom color', () => {
    const { container } = render(
      <Wire3D start={validStart} end={validEnd} color="#ff0000" />
    )
    expect(container.innerHTML).toContain('mesh')
  })
})
