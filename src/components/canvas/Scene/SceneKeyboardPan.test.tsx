import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { SceneKeyboardPan } from './SceneKeyboardPan'
import { useCircuitStore } from '@/store/circuitStore'

// Mock Three.js Vector3
vi.mock('three', () => {
  class MockVector3 {
    x: number
    y: number
    z: number
    constructor(x = 0, y = 0, z = 0) {
      this.x = x
      this.y = y
      this.z = z
    }
    set = vi.fn().mockReturnThis()
    add = vi.fn().mockReturnThis()
  }
  return {
    Vector3: MockVector3,
  }
})

// Mock @react-three/fiber
const mockCameraPositionAdd = vi.fn()
const mockCamera = {
  position: {
    x: 0,
    y: 6,
    z: 6,
    add: mockCameraPositionAdd,
  },
}

const mockControlsTargetAdd = vi.fn()
const mockControlsUpdate = vi.fn()
const mockControls = {
  target: {
    x: 0,
    y: 0,
    z: 0,
    add: mockControlsTargetAdd,
  },
  update: mockControlsUpdate,
}

vi.mock('@react-three/fiber', () => ({
  useThree: () => ({ camera: mockCamera, controls: mockControls }),
}))

const setState = useCircuitStore.setState

describe('SceneKeyboardPan', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    mockCameraPositionAdd.mockClear()
    mockControlsTargetAdd.mockClear()
    mockControlsUpdate.mockClear()

    // Reset store state
    setState({
      selectedGateId: null,
      placementMode: null,
      wiringFrom: null,
      isDragActive: false,
    })
  })

  it('renders null (no visible output)', () => {
    const { container } = render(<SceneKeyboardPan />)
    expect(container.firstChild).toBeNull()
  })

  it('pans camera left when ArrowLeft is pressed and no gate is selected', () => {
    render(<SceneKeyboardPan />)

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      window.dispatchEvent(event)
    })

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(mockCameraPositionAdd).toHaveBeenCalled()
    expect(mockControlsTargetAdd).toHaveBeenCalled()
    expect(mockControlsUpdate).toHaveBeenCalled()
  })

  it('pans camera right when ArrowRight is pressed and no gate is selected', () => {
    render(<SceneKeyboardPan />)

    const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      window.dispatchEvent(event)
    })

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(mockCameraPositionAdd).toHaveBeenCalled()
    expect(mockControlsTargetAdd).toHaveBeenCalled()
    expect(mockControlsUpdate).toHaveBeenCalled()
  })

  it('pans camera up when ArrowUp is pressed and no gate is selected', () => {
    render(<SceneKeyboardPan />)

    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      window.dispatchEvent(event)
    })

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(mockCameraPositionAdd).toHaveBeenCalled()
    expect(mockControlsTargetAdd).toHaveBeenCalled()
    expect(mockControlsUpdate).toHaveBeenCalled()
  })

  it('pans camera down when ArrowDown is pressed and no gate is selected', () => {
    render(<SceneKeyboardPan />)

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      window.dispatchEvent(event)
    })

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(mockCameraPositionAdd).toHaveBeenCalled()
    expect(mockControlsTargetAdd).toHaveBeenCalled()
    expect(mockControlsUpdate).toHaveBeenCalled()
  })

  it('does not pan when a gate is selected', () => {
    setState({ selectedGateId: 'gate-1' })
    render(<SceneKeyboardPan />)

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      window.dispatchEvent(event)
    })

    expect(preventDefaultSpy).not.toHaveBeenCalled()
    expect(mockCameraPositionAdd).not.toHaveBeenCalled()
    expect(mockControlsTargetAdd).not.toHaveBeenCalled()
    expect(mockControlsUpdate).not.toHaveBeenCalled()
  })

  it('does not pan when in placement mode', () => {
    setState({ placementMode: 'NAND' })
    render(<SceneKeyboardPan />)

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      window.dispatchEvent(event)
    })

    expect(preventDefaultSpy).not.toHaveBeenCalled()
    expect(mockCameraPositionAdd).not.toHaveBeenCalled()
    expect(mockControlsTargetAdd).not.toHaveBeenCalled()
    expect(mockControlsUpdate).not.toHaveBeenCalled()
  })

  it('does not pan when wiring', () => {
    setState({
      wiringFrom: {
        fromGateId: 'gate-1',
        fromPinId: 'pin-1',
        fromPinType: 'output',
        fromPosition: { x: 0, y: 0, z: 0 },
        previewEndPosition: null,
        destinationGateId: null,
        destinationPinId: null,
        destinationNodeId: null,
        destinationNodeType: null,
        segments: null,
      },
    })
    render(<SceneKeyboardPan />)

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      window.dispatchEvent(event)
    })

    expect(preventDefaultSpy).not.toHaveBeenCalled()
    expect(mockCameraPositionAdd).not.toHaveBeenCalled()
    expect(mockControlsTargetAdd).not.toHaveBeenCalled()
    expect(mockControlsUpdate).not.toHaveBeenCalled()
  })

  it('does not pan when dragging', () => {
    setState({ isDragActive: true })
    render(<SceneKeyboardPan />)

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

    act(() => {
      window.dispatchEvent(event)
    })

    expect(preventDefaultSpy).not.toHaveBeenCalled()
    expect(mockCameraPositionAdd).not.toHaveBeenCalled()
    expect(mockControlsTargetAdd).not.toHaveBeenCalled()
    expect(mockControlsUpdate).not.toHaveBeenCalled()
  })

  it('does not pan when typing in an input field', () => {
    render(<SceneKeyboardPan />)

    // Create a mock input element
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })
    Object.defineProperty(event, 'target', { value: input, enumerable: true })

    act(() => {
      window.dispatchEvent(event)
    })

    expect(mockCameraPositionAdd).not.toHaveBeenCalled()
    expect(mockControlsTargetAdd).not.toHaveBeenCalled()
    expect(mockControlsUpdate).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })

  it('does not handle non-arrow keys', () => {
    render(<SceneKeyboardPan />)

    const event = new KeyboardEvent('keydown', { key: 'Space', bubbles: true })

    act(() => {
      window.dispatchEvent(event)
    })

    expect(mockCameraPositionAdd).not.toHaveBeenCalled()
    expect(mockControlsTargetAdd).not.toHaveBeenCalled()
    expect(mockControlsUpdate).not.toHaveBeenCalled()
  })
})

