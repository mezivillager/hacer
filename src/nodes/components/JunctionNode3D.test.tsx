// Tests for JunctionNode3D component
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { JunctionNode3D } from './JunctionNode3D'

// Mock Drei `<Html>` so any FloatingLabel that slips through this component
// surfaces as a queryable DOM node. FloatingLabel renders its text inside a
// `<span data-testid="floating-label">`, so its presence (or absence) under
// the junction is observable via `screen.queryByTestId('floating-label')`.
vi.mock('@react-three/drei', () => ({
  Html: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="junction-html-portal">{children}</div>
  ),
}))

describe('JunctionNode3D', () => {
  it('exports a valid component', () => {
    expect(JunctionNode3D).toBeDefined()
    expect(typeof JunctionNode3D).toBe('function')
  })

  it('has displayName for debugging', () => {
    expect(JunctionNode3D.displayName).toBe('JunctionNode3D')
  })

  // Junctions are tap points on shared wires; they have no user-meaningful
  // identity of their own and a per-junction label adds visual noise on
  // dense circuits without conveying useful information. Per product
  // direction (2026-05-26), junctions render unlabelled — and the prop
  // surface no longer accepts a `signalId`, so a future regression that
  // reintroduces a per-junction label has to walk back this whole change
  // (props + DOM) to land.
  it('renders no FloatingLabel for a junction node', () => {
    render(
      <JunctionNode3D
        id="j-1"
        position={{ x: 0, y: 0, z: 0 }}
        value={0}
      />,
    )
    expect(screen.queryByTestId('floating-label')).toBeNull()
    expect(screen.queryByTestId('junction-html-portal')).toBeNull()
  })
})
