import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Scene } from './Scene'
import { useCircuitStore } from '@/store/circuitStore'

type CanvasProps = {
  children?: ReactNode
  dpr?: unknown
  frameloop?: string
  gl?: { powerPreference?: string; antialias?: boolean }
  shadows?: boolean
}

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, dpr, frameloop, gl, shadows }: CanvasProps) => (
    <div
      data-testid="scene-canvas"
      data-dpr={JSON.stringify(dpr)}
      data-frameloop={frameloop}
      data-powerpreference={gl?.powerPreference}
      data-antialias={String(gl?.antialias)}
      data-shadows={String(shadows)}
    >
      {children}
    </div>
  ),
}))

vi.mock('./SceneReadyBridge', () => ({
  SceneReadyBridge: () => <div data-testid="scene-ready-bridge" />,
}))

vi.mock('./SceneContent', () => ({
  SceneContent: ({ children }: { children?: ReactNode }) => (
    <div data-testid="scene-content">{children}</div>
  ),
}))

describe('Scene', () => {
  beforeEach(() => {
    useCircuitStore.setState({ performanceMode: 'normal' })
  })

  it('uses normal render settings by default', () => {
    render(<Scene />)

    const canvas = screen.getByTestId('scene-canvas')
    expect(canvas.getAttribute('data-dpr')).toBe('[1,2]')
    expect(canvas.getAttribute('data-frameloop')).toBe('always')
    expect(canvas.getAttribute('data-powerpreference')).toBe('high-performance')
    expect(canvas.getAttribute('data-antialias')).toBe('true')
    expect(canvas.getAttribute('data-shadows')).toBe('true')
  })

  it('uses capped render settings in low-power mode', () => {
    useCircuitStore.setState({ performanceMode: 'low-power' })

    render(<Scene />)

    const canvas = screen.getByTestId('scene-canvas')
    expect(canvas.getAttribute('data-dpr')).toBe('1')
    expect(canvas.getAttribute('data-frameloop')).toBe('demand')
    expect(canvas.getAttribute('data-powerpreference')).toBe('low-power')
    expect(canvas.getAttribute('data-antialias')).toBe('false')
    expect(canvas.getAttribute('data-shadows')).toBe('false')
  })
})
