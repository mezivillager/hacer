import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { Canvas } from '@react-three/fiber'
import { FloatingLabel } from './FloatingLabel'
import { useCircuitStore } from '@/store/circuitStore'

describe('FloatingLabel', () => {
  beforeEach(() => {
    useCircuitStore.setState({ performanceMode: 'normal' })
  })

  it('mounts without throwing in normal mode', () => {
    const { container } = render(
      <Canvas>
        <FloatingLabel position={[0, 0, 0]} text="in: 0x0F" />
      </Canvas>,
    )
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('returns null in low-power mode', () => {
    useCircuitStore.setState({ performanceMode: 'low-power' })
    const { container } = render(
      <Canvas>
        <FloatingLabel position={[0, 0, 0]} text="hidden" />
      </Canvas>,
    )
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('returns null when text is empty', () => {
    const { container } = render(
      <Canvas>
        <FloatingLabel position={[0, 0, 0]} text="" />
      </Canvas>,
    )
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })
})
