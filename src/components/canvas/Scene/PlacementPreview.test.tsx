import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { PlacementPreview } from './PlacementPreview'
import { useCircuitStore } from '@/store/circuitStore'

const setState = useCircuitStore.setState

describe('PlacementPreview', () => {
  beforeEach(() => {
    setState({
      gates: [],
      placementMode: null,
      placementPreviewPosition: null,
      isDragActive: false,
      selectedGateId: null,
    })
  })

  it('returns null when not in placement mode and no preview position', () => {
    const { container } = render(<PlacementPreview />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when placementMode is set but no preview position', () => {
    setState({ placementMode: 'NAND' })
    const { container } = render(<PlacementPreview />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when preview position is set but no placement mode and not dragging', () => {
    setState({ placementPreviewPosition: { x: 0, y: 0, z: 0 } })
    const { container } = render(<PlacementPreview />)
    expect(container.firstChild).toBeNull()
  })

  it('renders when placementMode and previewPosition are set', () => {
    setState({
      placementMode: 'NAND',
      placementPreviewPosition: { x: 2, y: 0, z: 2 },
    })
    const { container } = render(<PlacementPreview />)
    expect(container.innerHTML).toContain('group')
  })

  it('renders when dragging (isDragActive true, no placementMode)', () => {
    setState({
      placementMode: null,
      placementPreviewPosition: { x: 2, y: 0, z: 2 },
      isDragActive: true,
    })
    const { container } = render(<PlacementPreview />)
    expect(container.innerHTML).toContain('group')
  })

  it('returns null when position conflicts with existing gate', () => {
    setState({
      placementMode: 'NAND',
      placementPreviewPosition: { x: 0, y: 0, z: 0 },
      gates: [
        {
          id: 'existing-gate',
          type: 'AND',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          inputs: [],
          outputs: [],
          selected: false,
        },
      ],
    })
    const { container } = render(<PlacementPreview />)
    expect(container.firstChild).toBeNull()
  })

  it('renders preview rings and box geometry', () => {
    setState({
      placementMode: 'NAND',
      placementPreviewPosition: { x: 6, y: 0, z: 6 },
    })
    const { container } = render(<PlacementPreview />)
    expect(container.innerHTML).toContain('ringgeometry')
    expect(container.innerHTML).toContain('boxgeometry')
  })

  it('excludes selected gate from validation when dragging', () => {
    setState({
      placementMode: null,
      placementPreviewPosition: { x: 2, y: 0, z: 2 },
      isDragActive: true,
      selectedGateId: 'dragged-gate',
      gates: [
        {
          id: 'dragged-gate',
          type: 'AND',
          position: { x: 2, y: 0, z: 2 },
          rotation: { x: 0, y: 0, z: 0 },
          inputs: [],
          outputs: [],
          selected: false,
        },
      ],
    })
    const { container } = render(<PlacementPreview />)
    // Should render because the dragged gate is excluded from validation
    expect(container.innerHTML).toContain('group')
  })
})
