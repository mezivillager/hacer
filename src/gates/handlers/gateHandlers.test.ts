import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPinColor, getWorldPosition, createGateClickHandler, createPinPointerMoveHandler, createPinClickHandler, handlePinPointerOut } from './gateHandlers'
import { colors } from '@/theme'
import { createMockThreeEvent } from '@/test/testUtils'

// Mock dependencies
vi.mock('@/store/circuitStore', () => ({
  circuitActions: {
    updateWirePreviewPosition: vi.fn(),
  },
}))

vi.mock('@/theme', () => ({
  colors: {
    primary: '#1890ff',
    pin: {
      active: '#52c41a',
      inactive: '#8c8c8c',
      disconnected: '#ff4d4f',
    },
  },
}))

describe('gateHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPinColor', () => {
    it('returns primary color when wiring and pin is hovered', () => {
      expect(getPinColor(false, false, 'inputA', false, true, 'inputA')).toBe(colors.primary)
    })

    it('returns active color for output pin with value true', () => {
      expect(getPinColor(true, false, 'output', true, false, null)).toBe(colors.pin.active)
    })

    it('returns inactive color for output pin with value false', () => {
      expect(getPinColor(false, false, 'output', true, false, null)).toBe(colors.pin.inactive)
    })

    it('returns active color for connected input pin with value true', () => {
      expect(getPinColor(true, true, 'inputA', false, false, null)).toBe(colors.pin.active)
    })

    it('returns inactive color for connected input pin with value false', () => {
      expect(getPinColor(false, true, 'inputA', false, false, null)).toBe(colors.pin.inactive)
    })

    it('returns active color for disconnected input pin with value true', () => {
      expect(getPinColor(true, false, 'inputA', false, false, null)).toBe(colors.pin.active)
    })

    it('returns disconnected color for disconnected input pin with value false', () => {
      expect(getPinColor(false, false, 'inputA', false, false, null)).toBe(colors.pin.disconnected)
    })
  })

  describe('getWorldPosition', () => {
    it('returns event point if provided', () => {
      const position: [number, number, number] = [1, 2, 3]
      const localOffset: [number, number, number] = [0.5, 0.5, 0.5]
      const eventPoint = { x: 10, y: 20, z: 30 }

      const result = getWorldPosition(position, localOffset, eventPoint)
      expect(result).toEqual(eventPoint)
    })

    it('calculates world position from gate position and local offset when no event point', () => {
      const position: [number, number, number] = [1, 2, 3]
      const localOffset: [number, number, number] = [0.5, 0.5, 0.5]

      const result = getWorldPosition(position, localOffset)
      expect(result).toEqual({ x: 1.5, y: 2.5, z: 3.5 })
    })
  })

  describe('createGateClickHandler', () => {
    it('calls onClick after delay when not wiring and click is allowed', async () => {
      const onClick = vi.fn()
      const shouldAllowClick = vi.fn(() => true)
      const handler = createGateClickHandler(false, shouldAllowClick, onClick)

      const mockEvent = createMockThreeEvent<MouseEvent>(
        { x: 0, y: 0, z: 0 },
        { stopPropagation: vi.fn() }
      )

      handler(mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()

      await new Promise((resolve) => setTimeout(resolve, 15))

      expect(shouldAllowClick).toHaveBeenCalled()
      expect(onClick).toHaveBeenCalled()
    })

    it('does not call onClick when wiring', async () => {
      const onClick = vi.fn()
      const shouldAllowClick = vi.fn(() => true)
      const handler = createGateClickHandler(true, shouldAllowClick, onClick)

      const mockEvent = createMockThreeEvent<MouseEvent>(
        { x: 0, y: 0, z: 0 },
        { stopPropagation: vi.fn() }
      )

      handler(mockEvent)

      await new Promise((resolve) => setTimeout(resolve, 15))

      expect(onClick).not.toHaveBeenCalled()
    })

    it('does not call onClick when click is not allowed', async () => {
      const onClick = vi.fn()
      const shouldAllowClick = vi.fn(() => false)
      const handler = createGateClickHandler(false, shouldAllowClick, onClick)

      const mockEvent = createMockThreeEvent<MouseEvent>(
        { x: 0, y: 0, z: 0 },
        { stopPropagation: vi.fn() }
      )

      handler(mockEvent)

      await new Promise((resolve) => setTimeout(resolve, 15))

      expect(shouldAllowClick).toHaveBeenCalled()
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('createPinPointerMoveHandler', () => {
    it('updates wire preview position when wiring', () => {
      const getWorldPositionFn = vi.fn((_localOffset, eventPoint) => ({
        x: eventPoint?.x ?? 10,
        y: eventPoint?.y ?? 20,
        z: eventPoint?.z ?? 30,
      }))
      const updateWirePreviewPosition = vi.fn()
      const handlerFactory = createPinPointerMoveHandler(true, getWorldPositionFn, updateWirePreviewPosition)
      const handler = handlerFactory([0.5, 0.5, 0.5])

      const mockEvent = createMockThreeEvent<PointerEvent>(
        { x: 1, y: 2, z: 3 },
        { stopPropagation: vi.fn() }
      )

      handler(mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(getWorldPositionFn).toHaveBeenCalledWith([0.5, 0.5, 0.5], { x: 1, y: 2, z: 3 })
      expect(updateWirePreviewPosition).toHaveBeenCalledWith({ x: 1, y: 2, z: 3 })
    })

    it('does nothing when not wiring', () => {
      const getWorldPositionFn = vi.fn()
      const updateWirePreviewPosition = vi.fn()
      const handlerFactory = createPinPointerMoveHandler(false, getWorldPositionFn, updateWirePreviewPosition)
      const handler = handlerFactory([0.5, 0.5, 0.5])

      const mockEvent = createMockThreeEvent<PointerEvent>(
        { x: 1, y: 2, z: 3 },
        { stopPropagation: vi.fn() }
      )

      handler(mockEvent)

      expect(getWorldPositionFn).not.toHaveBeenCalled()
      expect(updateWirePreviewPosition).not.toHaveBeenCalled()
    })
  })

  describe('createPinClickHandler', () => {
    it('calls onInputToggle on shift+click for unconnected input pin', () => {
      const onInputToggle = vi.fn()
      const onPinClick = vi.fn()
      const getWorldPositionFn = vi.fn(() => ({ x: 1, y: 2, z: 3 }))
      const handlerFactory = createPinClickHandler('gate-1', getWorldPositionFn, onInputToggle, onPinClick)
      const handler = handlerFactory('pin-1', 'input', [0.5, 0.5, 0.5], false)

      const mockEvent = createMockThreeEvent<MouseEvent>(
        { x: 1, y: 2, z: 3 },
        { stopPropagation: vi.fn(), shiftKey: true }
      )

      handler(mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(onInputToggle).toHaveBeenCalledWith('gate-1', 'pin-1')
      expect(onPinClick).not.toHaveBeenCalled()
    })

    it('calls onPinClick on normal click', () => {
      const onInputToggle = vi.fn()
      const onPinClick = vi.fn()
      const getWorldPositionFn = vi.fn(() => ({ x: 1, y: 2, z: 3 }))
      const handlerFactory = createPinClickHandler('gate-1', getWorldPositionFn, onInputToggle, onPinClick)
      const handler = handlerFactory('pin-1', 'output', [0.5, 0.5, 0.5], false)

      const mockEvent = createMockThreeEvent<MouseEvent>(
        { x: 1, y: 2, z: 3 },
        { stopPropagation: vi.fn(), shiftKey: false }
      )

      handler(mockEvent)

      expect(mockEvent.stopPropagation).toHaveBeenCalled()
      expect(onInputToggle).not.toHaveBeenCalled()
      expect(getWorldPositionFn).toHaveBeenCalledWith([0.5, 0.5, 0.5], { x: 1, y: 2, z: 3 })
      expect(onPinClick).toHaveBeenCalledWith('gate-1', 'pin-1', 'output', { x: 1, y: 2, z: 3 })
    })

    it('does not call onInputToggle for connected input pin even with shift', () => {
      const onInputToggle = vi.fn()
      const onPinClick = vi.fn()
      const getWorldPositionFn = vi.fn(() => ({ x: 1, y: 2, z: 3 }))
      const handlerFactory = createPinClickHandler('gate-1', getWorldPositionFn, onInputToggle, onPinClick)
      const handler = handlerFactory('pin-1', 'input', [0.5, 0.5, 0.5], true)

      const mockEvent = createMockThreeEvent<MouseEvent>(
        { x: 1, y: 2, z: 3 },
        { stopPropagation: vi.fn(), shiftKey: true }
      )

      handler(mockEvent)

      expect(onInputToggle).not.toHaveBeenCalled()
      expect(onPinClick).toHaveBeenCalled()
    })
  })

  describe('handlePinPointerOut', () => {
    it('is a no-op placeholder', () => {
      expect(() => handlePinPointerOut()).not.toThrow()
    })
  })
})
