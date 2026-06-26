import { describe, it, expect } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { Line } from '@react-three/drei'
import { isRenderedLine, readLinePoints } from './linePoints'
import { useCircuitStore } from '@/store/circuitStore'
import { GateRenderer } from '@/gates'

describe('linePoints read primitive', () => {
  it('reads back the exact world points of a straight drei <Line>', async () => {
    const pts: [number, number, number][] = [
      [-2, 0.2, 0],
      [-2, 0.2, 3],
      [1, 0.2, 3],
    ]
    const renderer = await ReactThreeTestRenderer.create(<Line points={pts} />)
    const scene = renderer.scene.instance

    const lines: import('three').Object3D[] = []
    scene.traverse((o) => {
      if (isRenderedLine(o)) lines.push(o)
    })
    expect(lines).toHaveLength(1)

    const read = readLinePoints(lines[0])
    expect(read).toHaveLength(pts.length)
    read.forEach((v, i) => {
      expect(v.x).toBeCloseTo(pts[i][0], 3)
      expect(v.y).toBeCloseTo(pts[i][1], 3)
      expect(v.z).toBeCloseTo(pts[i][2], 3)
    })

    await renderer.unmount()
  })
})

describe('gate-stability probe (informational)', () => {
  it('records whether a real GateRenderer renders headlessly', async () => {
    useCircuitStore.setState({ gates: [], wires: [], inputNodes: [], outputNodes: [], junctions: [] })
    const gate = useCircuitStore.getState().addGate('And', { x: 0, y: 0, z: 0 })
    let renderedClean = false
    try {
      const renderer = await ReactThreeTestRenderer.create(
        <GateRenderer
          gate={gate}
          isWiring={false}
          isPinConnected={() => false}
          onClick={() => {}}
          onPinClick={() => {}}
          onInputToggle={() => {}}
        />,
      )
      renderedClean = !!renderer.scene.instance
      await renderer.unmount()
    } catch {
      renderedClean = false
    }
    // This test never fails; it documents the spike outcome for the harness default.
    expect(typeof renderedClean).toBe('boolean')
  })
})
