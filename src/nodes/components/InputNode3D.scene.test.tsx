import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ComponentProps } from 'react'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { Mesh, MeshStandardMaterial } from 'three'
import { InputNode3D } from './InputNode3D'
import { NODE_COLORS, calculateNodePinPosition } from '../config'
import type { DragBinding } from '@/gates/types'

vi.mock('@/store/circuitStore', () => {
  const noStore = () => {
    throw new Error('InputNode3D read the store')
  }
  return {
    useCircuitStore: Object.assign(noStore, { getState: noStore }),
    circuitActions: new Proxy({}, { get: noStore }),
  }
})

vi.mock('@/hooks/useNodeDrag', () => ({
  useNodeDrag: () => {
    throw new Error('InputNode3D read gesture state')
  },
}))

vi.mock('@/components/canvas/FloatingLabel', () => ({
  FloatingLabel: ({ text }: { text: string }) => <group name={`label:${text}`} />,
}))

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>

const mounted: Renderer[] = []

async function mount(overrides: Partial<ComponentProps<typeof InputNode3D>> = {}): Promise<Renderer> {
  const renderer = await ReactThreeTestRenderer.create(
    <InputNode3D
      id="in-1"
      name="a"
      position={{ x: 1, y: 0.2, z: 2 }}
      rotation={{ x: 0, y: 0, z: 0 }}
      value={1}
      width={1}
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
const pin = (renderer: Renderer) => meshesWith(renderer, 'SphereGeometry')[0]
const bodyMaterial = (renderer: Renderer) => (body(renderer).instance as Mesh).material as MeshStandardMaterial
const labels = (renderer: Renderer) =>
  renderer.scene.findAll((node) => node.instance.name.startsWith('label:')).map((node) => node.instance.name)

function fakeDrag(overrides: Partial<DragBinding> = {}): DragBinding {
  return {
    isDragging: false,
    shouldAllowClick: () => true,
    onPointerDown: vi.fn(),
    onPointerMove: vi.fn(),
    onPointerUp: vi.fn(),
    onPointerLeave: vi.fn(),
    ...overrides,
  }
}

afterEach(async () => {
  await Promise.all(mounted.splice(0).map((renderer) => renderer.unmount()))
})

describe('InputNode3D under test-renderer, with no store and no gesture state', () => {
  it('draws the body, the output pin and the name-and-value label from props alone', async () => {
    const renderer = await mount({ width: 16, value: 5 })

    expect(meshesWith(renderer, 'BoxGeometry')).toHaveLength(1)
    expect(meshesWith(renderer, 'SphereGeometry')).toHaveLength(1)
    expect(labels(renderer)).toEqual(['label:a: 0x0005'])
  })

  it('colours the body by value, hover and selection', async () => {
    const high = await mount({ value: 1 })
    expect(bodyMaterial(high).color.getHexString()).toBe(NODE_COLORS.input.bodyOn.slice(1))
    await high.fireEvent(body(high), 'onPointerOver')
    expect(bodyMaterial(high).color.getHexString()).toBe(NODE_COLORS.input.hoverOn.slice(1))
    await high.fireEvent(body(high), 'onPointerOut')
    expect(bodyMaterial(high).color.getHexString()).toBe(NODE_COLORS.input.bodyOn.slice(1))

    const low = await mount({ value: 0 })
    expect(bodyMaterial(low).color.getHexString()).toBe(NODE_COLORS.input.bodyOff.slice(1))

    const selected = await mount({ selected: true })
    expect(bodyMaterial(selected).color.getHexString()).toBe(NODE_COLORS.input.selected.slice(1).toLowerCase())
  })

  it('reports a click through onClick and a shift-click through onToggle', async () => {
    const onClick = vi.fn()
    const onToggle = vi.fn()
    const renderer = await mount({ onClick, onToggle })

    await renderer.fireEvent(body(renderer), 'onClick', { shiftKey: false })
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onToggle).not.toHaveBeenCalled()

    await renderer.fireEvent(body(renderer), 'onClick', { shiftKey: true })
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('reports a pin click with the node id and the pin world position through onPinClick', async () => {
    const onPinClick = vi.fn()
    const renderer = await mount({ onPinClick })

    await renderer.fireEvent(pin(renderer), 'onClick')

    const offset = calculateNodePinPosition('input')
    expect(onPinClick).toHaveBeenCalledWith('in-1', { x: 1 + offset.x, y: 0.2 + offset.y, z: 2 + offset.z })
  })

  it('binds the drag gesture to the body only when canDrag is set', async () => {
    const drag = fakeDrag()
    const draggable = await mount({ drag, canDrag: true })

    await draggable.fireEvent(body(draggable), 'onPointerDown')
    await draggable.fireEvent(body(draggable), 'onPointerMove')
    await draggable.fireEvent(body(draggable), 'onPointerUp')
    await draggable.fireEvent(body(draggable), 'onPointerOut')
    expect(drag.onPointerDown).toHaveBeenCalledTimes(1)
    expect(drag.onPointerMove).toHaveBeenCalledTimes(1)
    expect(drag.onPointerUp).toHaveBeenCalledTimes(1)
    expect(drag.onPointerLeave).toHaveBeenCalledTimes(1)

    const lockedDrag = fakeDrag()
    const locked = await mount({ drag: lockedDrag, canDrag: false })
    expect(body(locked).props.onPointerDown).toBeUndefined()
    expect(body(locked).props.onPointerMove).toBeUndefined()
    expect(body(locked).props.onPointerUp).toBeUndefined()
    await locked.fireEvent(body(locked), 'onPointerOut')
    expect(lockedDrag.onPointerLeave).not.toHaveBeenCalled()

    const bare = await mount()
    expect(body(bare).props.onPointerDown).toBeUndefined()
  })

  it('drops a body click that the drag binding does not allow', async () => {
    const onClick = vi.fn()
    const renderer = await mount({ onClick, drag: fakeDrag({ shouldAllowClick: () => false }) })

    await renderer.fireEvent(body(renderer), 'onClick', { shiftKey: false })

    expect(onClick).not.toHaveBeenCalled()
  })

  it('draws the body translucent and keeps the drag on pointer-out while the binding reports a drag', async () => {
    const drag = fakeDrag({ isDragging: true })
    const renderer = await mount({ drag, canDrag: true })

    await renderer.fireEvent(body(renderer), 'onPointerOut')

    expect(bodyMaterial(renderer).transparent).toBe(true)
    expect(bodyMaterial(renderer).opacity).toBe(0.7)
    expect(drag.onPointerLeave).not.toHaveBeenCalled()
  })
})
