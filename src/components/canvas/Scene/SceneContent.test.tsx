import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { SceneContent } from './SceneContent'
import { useCircuitStore } from '@/store/circuitStore'

// Mock all child components
vi.mock('./GroundPlane', () => ({
  GroundPlane: () => <div data-testid="ground-plane">GroundPlane</div>,
}))

vi.mock('./PlacementPreview', () => ({
  PlacementPreview: () => <div data-testid="placement-preview">PlacementPreview</div>,
}))

vi.mock('./WirePreview', () => ({
  WirePreview: () => <div data-testid="wire-preview">WirePreview</div>,
}))

vi.mock('./SceneGrid', () => ({
  SceneGrid: () => <div data-testid="scene-grid">SceneGrid</div>,
}))

vi.mock('./SceneOrbitControls', () => ({
  SceneOrbitControls: () => <div data-testid="scene-orbit-controls">SceneOrbitControls</div>,
}))

vi.mock('./SceneKeyboardPan', () => ({
  SceneKeyboardPan: () => <div data-testid="scene-keyboard-pan">SceneKeyboardPan</div>,
}))

vi.mock('@react-three/drei', () => ({
  Environment: () => <div data-testid="environment">Environment</div>,
}))

const setState = useCircuitStore.setState

describe('SceneContent', () => {
  beforeEach(() => {
    setState({
      placementMode: null,
      wiringFrom: null,
    })
  })

  it('renders GroundPlane', () => {
    const { getByTestId } = render(<SceneContent />)
    expect(getByTestId('ground-plane')).toBeInTheDocument()
  })

  it('renders PlacementPreview', () => {
    const { getByTestId } = render(<SceneContent />)
    expect(getByTestId('placement-preview')).toBeInTheDocument()
  })

  it('renders WirePreview', () => {
    const { getByTestId } = render(<SceneContent />)
    expect(getByTestId('wire-preview')).toBeInTheDocument()
  })

  it('renders SceneGrid', () => {
    const { getByTestId } = render(<SceneContent />)
    expect(getByTestId('scene-grid')).toBeInTheDocument()
  })

  it('renders SceneOrbitControls', () => {
    const { getByTestId } = render(<SceneContent />)
    expect(getByTestId('scene-orbit-controls')).toBeInTheDocument()
  })

  it('renders Environment', () => {
    const { getByTestId } = render(<SceneContent />)
    expect(getByTestId('environment')).toBeInTheDocument()
  })

  it('renders ambient and directional lights', () => {
    const { container } = render(<SceneContent />)
    expect(container.innerHTML).toContain('ambientlight')
    expect(container.innerHTML).toContain('directionallight')
  })

  it('renders children', () => {
    const { getByTestId } = render(
      <SceneContent>
        <div data-testid="child-component">Child</div>
      </SceneContent>
    )
    expect(getByTestId('child-component')).toBeInTheDocument()
  })
})
