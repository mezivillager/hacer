import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ComponentProps } from 'react'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { Mesh, MeshStandardMaterial } from 'three'
import { BaseGate } from './BaseGate'
import type { DragBinding, PinConfig } from '../types'

vi.mock('@/store/circuitStore', () => {
  const noStore = () => {
    throw new Error('BaseGate read the store')
  }
  return {
    useCircuitStore: Object.assign(noStore, { getState: noStore }),
    circuitActions: new Proxy({}, { get: noStore }),
  }
})

vi.mock('@/hooks/useGateDrag', () => ({
  useGateDrag: () => {
    throw new Error('BaseGate read gesture state')
  },
}))

vi.mock('@/components/canvas/FloatingLabel', () => ({
  FloatingLabel: ({ text }: { text: string }) => <group name={`label:${text}`} />,
}))

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>

const PINS: PinConfig[] = [
  { pinId: 'g1-in-0', position: [-0.6, 0.2, 0], value: 0, connected: true, pinType: 'input', pinName: 'a' },
  { pinId: 'g1-in-1', position: [-0.6, -0.2, 0], value: 1, connected: false, pinType: 'input', pinName: 'b' },
  { pinId: 'g1-out-0', position: [0.6, 0, 0], value: 0, connected: false, pinType: 'output', pinName: 'out' },
]
const STUBS: [number, number, number][] = [[-0.75, 0.2, 0], [-0.75, -0.2, 0], [0.75, 0, 0]]

const mounted: Renderer[] = []

async function mount(overrides: Partial<ComponentProps<typeof BaseGate>> = {}): Promise<Renderer> {
  const renderer = await ReactThreeTestRenderer.create(
    <BaseGate
      id="g1"
      position={[1, 0.2, 2]}
      rotation={[0, 0, 0]}
      selected={false}
      isWiring={false}
      bodyColor="#111111"
      bodyHoverColor="#222222"
      bodySelectedColor="#333333"
      output={0}
      inputs={[0, 1]}
      pinConfigs={PINS}
      wireStubPositions={STUBS}
      bodyGeometry={<boxGeometry args={[1, 0.4, 0.8]} />}
      textLabel="And"
      {...overrides}
    />,
  )
  mounted.push(renderer)
  return renderer
}

function meshesWith(renderer: Renderer, geometryType: string) {
  return renderer.scene.findAll(
    (node) => node.type === 'Mesh' && (node.instance as Mesh).geometry.type === geometryType,
  )
}

const body = (renderer: Renderer) => meshesWith(renderer, 'BoxGeometry')[0]
const pins = (renderer: Renderer) => meshesWith(renderer, 'SphereGeometry')
const stubs = (renderer: Renderer) => meshesWith(renderer, 'CylinderGeometry')
const bodyMaterial = (renderer: Renderer) => (body(renderer).instance as Mesh).material as MeshStandardMaterial
const labels = (renderer: Renderer) =>
  renderer.scene.findAll((node) => node.instance.name.startsWith('label:')).map((node) => node.instance.name)

function fakeDrag(isDragging = false): DragBinding {
  return {
    isDragging,
    shouldAllowClick: () => true,
    onPointerDown: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerUp: vi.fn(),
    onPointerLeave: vi.fn(),
  }
}

afterEach(async () => {
  for (const renderer of mounted.splice(0)) await renderer.unmount()
})

describe('BaseGate under test-renderer, with no store and no gesture state', () => {
  it('draws the body, a sphere per pin and a stub per unconnected pin from props alone', async () => {
    const renderer = await mount()

    expect(meshesWith(renderer, 'BoxGeometry')).toHaveLength(1)
    expect(pins(renderer)).toHaveLength(3)
    expect(stubs(renderer).map((stub) => stub.instance.position.toArray())).toEqual([
      [-0.75, -0.2, 0],
      [0.75, 0, 0],
    ])
    expect(labels(renderer)).toEqual(['label:And'])
  })

  it('hides the stub of the pin a wire is being drawn from', async () => {
    const renderer = await mount({ wiringSourcePinId: 'g1-out-0' })

    expect(stubs(renderer).map((stub) => stub.instance.position.toArray())).toEqual([[-0.75, -0.2, 0]])
  })

  it('appends the bit width to the label when it is wider than 1', async () => {
    const renderer = await mount({ width: 16 })

    expect(labels(renderer)).toEqual(['label:And:16'])
  })

  it('reports body hover through onHover and shows the hover colour', async () => {
    const onHover = vi.fn()
    const renderer = await mount({ onHover })

    await renderer.fireEvent(body(renderer), 'onPointerOver')
    expect(onHover).toHaveBeenLastCalledWith('g1')
    expect(bodyMaterial(renderer).color.getHexString()).toBe('222222')

    await renderer.fireEvent(body(renderer), 'onPointerOut')
    expect(onHover).toHaveBeenLastCalledWith(null)
    expect(bodyMaterial(renderer).color.getHexString()).toBe('111111')
  })

  it('reports pin hover through onPinHover', async () => {
    const onPinHover = vi.fn()
    const renderer = await mount({ onPinHover })

    await renderer.fireEvent(pins(renderer)[1], 'onPointerOver')
    expect(onPinHover).toHaveBeenLastCalledWith('g1', 'g1-in-1')

    await renderer.fireEvent(pins(renderer)[1], 'onPointerOut')
    expect(onPinHover).toHaveBeenLastCalledWith(null, null)
  })

  it('reports the pointer position over a pin while wiring through onWirePreviewMove', async () => {
    const onWirePreviewMove = vi.fn()
    const renderer = await mount({ isWiring: true, onWirePreviewMove })

    await renderer.fireEvent(pins(renderer)[2], 'onPointerMove', { point: { x: 3, y: 0.2, z: 4 } })

    expect(onWirePreviewMove).toHaveBeenCalledWith({ x: 3, y: 0.2, z: 4 })
  })

  it('reports a pin click with its world position through onPinClick', async () => {
    const onPinClick = vi.fn()
    const renderer = await mount({ onPinClick })

    await renderer.fireEvent(pins(renderer)[2], 'onClick')

    expect(onPinClick).toHaveBeenCalledWith('g1', 'g1-out-0', 'output', { x: 1.6, y: 0.2, z: 2 })
  })

  it('binds the drag gesture to the body only when canDrag is set', async () => {
    const drag = fakeDrag()
    const draggable = await mount({ drag, canDrag: true })

    await draggable.fireEvent(body(draggable), 'onPointerDown')
    await draggable.fireEvent(body(draggable), 'onPointerOut')
    expect(drag.onPointerDown).toHaveBeenCalledTimes(1)
    expect(drag.onPointerLeave).toHaveBeenCalledTimes(1)

    const locked = await mount({ drag: fakeDrag(), canDrag: false })
    expect(body(locked).props.onPointerDown).toBeUndefined()
    expect(body(locked).props.onPointerMove).toBeUndefined()
    expect(body(locked).props.onPointerUp).toBeUndefined()
  })

  it('draws the body translucent while the drag binding reports a drag', async () => {
    const renderer = await mount({ drag: fakeDrag(true), canDrag: true })

    expect(bodyMaterial(renderer).transparent).toBe(true)
    expect(bodyMaterial(renderer).opacity).toBe(0.7)
  })
})
