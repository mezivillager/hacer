import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBusDrag } from './useBusDrag'
import { useCircuitStore } from '@/store/circuitStore'
import { ThreeEvent } from '@react-three/fiber'
import { createMockStore } from '@/test/testUtils'
import { snapToGrid } from '@/utils/grid'
import type { Position } from '@/store/types'

vi.mock('three', () => ({
  Vector3: class {
    constructor(public x = 0, public y = 0, public z = 0) {}
    copy(v: { x: number; y: number; z: number }) { this.x = v.x; this.y = v.y; this.z = v.z; return this }
    clone() { return { x: this.x, y: this.y, z: this.z } as unknown as this }
  },
}))

const BUS_ID = 'bus-splitter-test'
const INITIAL_POS: Position = { x: 0, y: 0, z: 0 }

function createMockThreeEvent(
  point: { x: number; y: number; z: number },
  overrides: Partial<ThreeEvent<PointerEvent>> = {}
): ThreeEvent<PointerEvent> {
  const mockSetPointerCapture = vi.fn()
  const mockReleasePointerCapture = vi.fn()
  const mockAddEventListener = vi.fn()
  const mockRemoveEventListener = vi.fn()
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
    nativeEvent: { pointerId: 1, target: mockCanvasEl } as unknown as PointerEvent,
    ...overrides,
  } as unknown as ThreeEvent<PointerEvent>
}

describe('useBusDrag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCircuitStore.setState(
      createMockStore({
        busComponents: [
          {
            id: BUS_ID,
            kind: 'splitter',
            position: INITIAL_POS,
            rotation: { x: 0, y: 0, z: 0 },
            width: 4,
            inputs: [{ id: 'in', name: 'in', type: 'input', value: 0, width: 4 }],
            outputs: [],
            selected: false,
          },
        ],
        gates: [],
        wires: [],
        isDragActive: false,
      })
    )
    useCircuitStore.setState({
      updateBusComponentPosition: (id: string, pos: Position) => {
        useCircuitStore.setState((s) => ({
          busComponents: s.busComponents.map((c) =>
            c.id === id ? { ...c, position: pos } : c
          ),
        }))
      },
      updatePlacementPreviewPosition: (pos: Position | null) => {
        useCircuitStore.setState({ placementPreviewPosition: pos })
      },
      selectBus: (busId: string | null) => {
        useCircuitStore.setState({ selectedBusId: busId })
      },
      setDragActive: (active: boolean) => {
        useCircuitStore.setState({ isDragActive: active })
      },
    })
  })

  it('initializes with inactive drag state', () => {
    const { result } = renderHook(() => useBusDrag(BUS_ID))
    expect(result.current.isDragging).toBe(false)
    expect(result.current.shouldAllowClick()).toBe(true)
  })

  it('activates drag only after moving beyond threshold', () => {
    const { result } = renderHook(() => useBusDrag(BUS_ID))

    act(() => { result.current.onPointerDown(createMockThreeEvent({ x: 0, y: 0, z: 0 })) })

    expect(useCircuitStore.getState().isDragActive).toBe(false)
    expect(result.current.isDragging).toBe(false)

    // Move below threshold (DRAG_THRESHOLD = 0.1)
    act(() => { result.current.onPointerMove(createMockThreeEvent({ x: 0.05, y: 0, z: 0.05 })) })
    expect(result.current.isDragging).toBe(false)

    // Move past threshold
    act(() => { result.current.onPointerMove(createMockThreeEvent({ x: 0.5, y: 0, z: 0.5 })) })
    expect(result.current.isDragging).toBe(true)
    expect(useCircuitStore.getState().isDragActive).toBe(true)
    expect(useCircuitStore.getState().placementPreviewPosition).toEqual(
      snapToGrid({ x: 0.5, y: 0, z: 0.5 })
    )
  })

  it('updates bus component position upon drag end', () => {
    const { result } = renderHook(() => useBusDrag(BUS_ID))

    act(() => result.current.onPointerDown(createMockThreeEvent({ x: 0, y: 0, z: 0 })))
    act(() => result.current.onPointerMove(createMockThreeEvent({ x: 2.1, y: 0, z: 2.1 })))
    expect(result.current.isDragging).toBe(true)

    act(() => result.current.onPointerUp())

    expect(result.current.isDragging).toBe(false)
    const busComponent = useCircuitStore.getState().busComponents.find((c) => c.id === BUS_ID)
    expect(busComponent?.position).toEqual(snapToGrid({ x: 2, y: 0, z: 2 }))
  })

  it('cancels drag upon leaving mesh if already dragging', () => {
    const { result } = renderHook(() => useBusDrag(BUS_ID))

    act(() => result.current.onPointerDown(createMockThreeEvent({ x: 0, y: 0, z: 0 })))
    act(() => result.current.onPointerMove(createMockThreeEvent({ x: 2, y: 0, z: 0 })))
    expect(result.current.isDragging).toBe(true)

    act(() => { result.current.onPointerLeave() })

    expect(result.current.isDragging).toBe(false)
    expect(useCircuitStore.getState().placementPreviewPosition).toBeNull()
    const busComponent = useCircuitStore.getState().busComponents.find((c) => c.id === BUS_ID)
    expect(busComponent?.position).toEqual(INITIAL_POS)
  })

  it('disallows click during drag action', () => {
    const { result } = renderHook(() => useBusDrag(BUS_ID))

    act(() => result.current.onPointerDown(createMockThreeEvent({ x: 0, y: 0, z: 0 })))
    act(() => result.current.onPointerMove(createMockThreeEvent({ x: 2, y: 0, z: 0 })))

    expect(result.current.shouldAllowClick()).toBe(false)
  })

  it('selectBus is called on pointer down, selecting the bus', () => {
    const { result } = renderHook(() => useBusDrag(BUS_ID))

    act(() => result.current.onPointerDown(createMockThreeEvent({ x: 0, y: 0, z: 0 })))

    expect(useCircuitStore.getState().selectedBusId).toBe(BUS_ID)
  })
})
