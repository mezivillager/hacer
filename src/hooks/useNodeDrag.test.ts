import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNodeDrag } from './useNodeDrag'
import { useCircuitStore } from '@/store/circuitStore'
import { ThreeEvent } from '@react-three/fiber'
import { createMockStore } from '@/test/testUtils'
import { snapToGrid } from '@/utils/grid'
import type { Position } from '@/store/types'

// Mock three.js
vi.mock('three', () => ({
  Vector3: class {
    constructor(public x = 0, public y = 0, public z = 0) {}
    copy(v: { x: number; y: number; z: number }) {
      this.x = v.x
      this.y = v.y
      this.z = v.z
      return this
    }
    clone() {
      return { x: this.x, y: this.y, z: this.z } as unknown as this
    }
  },
}))

// Create a helper for creating mock events
function createMockThreeEvent(
  point: { x: number; y: number; z: number },
  overrides: Partial<ThreeEvent<PointerEvent>> = {}
): ThreeEvent<PointerEvent> {
  const mockSetPointerCapture = vi.fn()
  const mockReleasePointerCapture = vi.fn()
  const mockAddEventListener = vi.fn()
  const mockRemoveEventListener = vi.fn()

  // Create a mock canvas element to allow capture methods
  const mockCanvasEl = {
    setPointerCapture: mockSetPointerCapture,
    releasePointerCapture: mockReleasePointerCapture,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
    tagName: 'CANVAS',
  } as unknown as HTMLElement

  return {
    point,
    stopPropagation: vi.fn(),
    nativeEvent: {
      pointerId: 1,
      target: mockCanvasEl,
    } as unknown as PointerEvent,
    ...overrides,
  } as unknown as ThreeEvent<PointerEvent>
}

describe('useNodeDrag', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup an initial store state
    useCircuitStore.setState(
      createMockStore({
        inputNodes: [{ id: 'input-1', name: 'in1', position: { x: 0, y: 0.2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, value: false, width: 1 }],
        outputNodes: [{ id: 'output-1', name: 'out1', position: { x: 5, y: 0.2, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, value: false, width: 1 }],
        gates: [],
        wires: [],
        junctions: [],
        placementMode: null,
        nodePlacementMode: null,
        wiringFrom: null,
        isDragActive: false,
      })
    )

    // Override the mock store's update actions to actually mutate state for these tests
    useCircuitStore.setState({
      updateInputNodePosition: (id: string, pos: Position) => {
        useCircuitStore.setState(s => ({
          inputNodes: s.inputNodes.map(n => n.id === id ? { ...n, position: pos } : n)
        }))
      },
      updateOutputNodePosition: (id: string, pos: Position) => {
         useCircuitStore.setState(s => ({
           outputNodes: s.outputNodes.map(n => n.id === id ? { ...n, position: pos } : n)
         }))
      },
      updatePlacementPreviewPosition: (pos: Position | null) => {
         useCircuitStore.setState({ placementPreviewPosition: pos })
      },
      selectNode: (id: string, type: 'input' | 'output') => {
         useCircuitStore.setState({ selectedNodeId: id, selectedNodeType: type })
      },
      setDragActive: (active: boolean) => {
         useCircuitStore.setState({ isDragActive: active })
      }
    })
  })

  it('initializes with inactive drag state', () => {
    const { result } = renderHook(() => useNodeDrag('input-1', 'input'))
    expect(result.current.isDragging).toBe(false)
    expect(result.current.shouldAllowClick()).toBe(true)
  })

  it('activates drag only after moving beyond threshold', () => {
    const { result } = renderHook(() => useNodeDrag('input-1', 'input'))

    // Pointer down
    act(() => {
      result.current.onPointerDown(createMockThreeEvent({ x: 0, y: 0, z: 0 }))
    })

    // Drag active state is set primarily in circuitActions on down
    expect(useCircuitStore.getState().isDragActive).toBe(true)
    // but the hook itself shouldn't consider it "dragging" until it moves
    expect(result.current.isDragging).toBe(false)

    // Move below threshold (DRAG_THRESHOLD = 0.1)
    act(() => {
      result.current.onPointerMove(createMockThreeEvent({ x: 0.05, y: 0, z: 0.05 }))
    })

    // Still not dragging
    expect(result.current.isDragging).toBe(false)

    // Move past threshold
    act(() => {
      result.current.onPointerMove(createMockThreeEvent({ x: 0.5, y: 0, z: 0.5 }))
    })

    // Now dragging
    expect(result.current.isDragging).toBe(true)
    expect(useCircuitStore.getState().placementPreviewPosition).toEqual(
      snapToGrid({ x: 0.5, y: 0.2, z: 0.5 })
    )
  })

  it('updates placed position correctly upon drag end (input node)', () => {
    const { result } = renderHook(() => useNodeDrag('input-1', 'input'))

    act(() => result.current.onPointerDown(createMockThreeEvent({ x: 0, y: 0, z: 0 })))

    act(() => result.current.onPointerMove(createMockThreeEvent({ x: 2.1, y: 0, z: 2.1 })))

    // Check dragging state
    expect(result.current.isDragging).toBe(true)

    act(() => result.current.onPointerUp())

    // Check finished dragging state
    expect(result.current.isDragging).toBe(false)

    // Check that node's position updated perfectly hitting the grid (assuming snap rounds nicely)
    const inputNode = useCircuitStore.getState().inputNodes.find(n => n.id === 'input-1')
    expect(inputNode?.position).toEqual(snapToGrid({ x: 2, y: 0.2, z: 2 }))
  })

  it('updates placed position correctly upon drag end (output node)', () => {
    const { result } = renderHook(() => useNodeDrag('output-1', 'output'))

    // Start drag at x: 5, move 3 spaces right
    act(() => result.current.onPointerDown(createMockThreeEvent({ x: 5, y: 0, z: 0 })))

    act(() => result.current.onPointerMove(createMockThreeEvent({ x: 6.1, y: 0, z: 2.1 })))

    act(() => result.current.onPointerUp())

    const outputNode = useCircuitStore.getState().outputNodes.find(n => n.id === 'output-1')
    expect(outputNode?.position).toEqual(snapToGrid({ x: 6, y: 0.2, z: 2 }))
  })

  it('cancels drag upon leaving mesh if already dragging', () => {
    const { result } = renderHook(() => useNodeDrag('input-1', 'input'))

    act(() => result.current.onPointerDown(createMockThreeEvent({ x: 0, y: 0, z: 0 })))
    act(() => result.current.onPointerMove(createMockThreeEvent({ x: 2, y: 0, z: 0 })))

    expect(result.current.isDragging).toBe(true)

    act(() => {
        result.current.onPointerLeave()
    })

    expect(result.current.isDragging).toBe(false)
    expect(useCircuitStore.getState().placementPreviewPosition).toBeNull()

    // The node hasn't been moved formally since we cancelled
    const inputNode = useCircuitStore.getState().inputNodes.find(n => n.id === 'input-1')
    expect(inputNode?.position).toEqual({ x: 0, y: 0.2, z: 0 })
  })

  it('disallows click event generation during drag action', () => {
    const { result } = renderHook(() => useNodeDrag('input-1', 'input'))

    act(() => result.current.onPointerDown(createMockThreeEvent({ x: 0, y: 0, z: 0 })))
    act(() => result.current.onPointerMove(createMockThreeEvent({ x: 2, y: 0, z: 0 })))

    // Since we dragged past threshold, click shouldn't be allowed
    expect(result.current.shouldAllowClick()).toBe(false)
  })
})
