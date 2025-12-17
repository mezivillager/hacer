import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { SceneReadyBridge } from './SceneReadyBridge'

// Mock @react-three/fiber hooks
const mockCamera = { position: { x: 0, y: 5, z: 10 } }
const mockGl = {
  domElement: {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
  },
}

let frameCallback: (() => void) | null = null

vi.mock('@react-three/fiber', () => ({
  useThree: () => ({ camera: mockCamera, gl: mockGl }),
  useFrame: (callback: () => void) => {
    frameCallback = callback
  },
}))

// Mock Three.js Vector3
vi.mock('three', () => ({
  Vector3: vi.fn().mockImplementation((x, y, z) => ({
    x,
    y,
    z,
    project: vi.fn().mockReturnThis(),
  })),
}))

describe('SceneReadyBridge', () => {
  beforeEach(() => {
    frameCallback = null
    delete (window as { __SCENE_READY__?: boolean }).__SCENE_READY__
    delete (window as { __SCENE_HELPERS__?: unknown }).__SCENE_HELPERS__
  })

  afterEach(() => {
    delete (window as { __SCENE_READY__?: boolean }).__SCENE_READY__
    delete (window as { __SCENE_HELPERS__?: unknown }).__SCENE_HELPERS__
  })

  it('renders null (no visible output)', () => {
    const { container } = render(<SceneReadyBridge />)
    expect(container.firstChild).toBeNull()
  })

  it('sets window.__SCENE_READY__ after frame callback', () => {
    render(<SceneReadyBridge />)
    expect(window.__SCENE_READY__).toBeUndefined()

    // Simulate frame callback
    if (frameCallback) frameCallback()

    expect(window.__SCENE_READY__).toBe(true)
  })

  it('sets window.__SCENE_HELPERS__ with helper functions', () => {
    render(<SceneReadyBridge />)

    // Simulate frame callback
    if (frameCallback) frameCallback()

    expect(window.__SCENE_HELPERS__).toBeDefined()
    expect(typeof window.__SCENE_HELPERS__?.projectToScreen).toBe('function')
    expect(typeof window.__SCENE_HELPERS__?.canvasRect).toBe('function')
  })

  it('only runs frame callback once', () => {
    render(<SceneReadyBridge />)

    // Simulate multiple frame callbacks
    if (frameCallback) frameCallback()
    if (frameCallback) frameCallback()
    if (frameCallback) frameCallback()

    // Should still be set (not erroring from multiple runs)
    expect(window.__SCENE_READY__).toBe(true)
  })

  it('canvasRect returns DOM element bounding rect', () => {
    render(<SceneReadyBridge />)
    if (frameCallback) frameCallback()

    const rect = window.__SCENE_HELPERS__?.canvasRect()
    expect(rect).toEqual({ left: 0, top: 0, width: 800, height: 600 })
  })

  it('cleans up window globals on unmount', () => {
    const { unmount } = render(<SceneReadyBridge />)
    if (frameCallback) frameCallback()

    expect(window.__SCENE_READY__).toBe(true)
    expect(window.__SCENE_HELPERS__).toBeDefined()

    unmount()

    expect(window.__SCENE_READY__).toBeUndefined()
    expect(window.__SCENE_HELPERS__).toBeUndefined()
  })
})
