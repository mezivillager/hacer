import { describe, it, expect, vi, afterEach } from 'vitest'
import type { ComponentProps } from 'react'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { Color, type Mesh, type MeshStandardMaterial } from 'three'
import { BusJoiner3D } from './BusJoiner3D'
import { createBusPins } from '@/simulation/busPins'
import { computeBusPinLayout } from '@/components/scene/busBodyLayout'
import { colors } from '@/theme'
import type { DragBinding } from '@/gates/types'
import type { BusComponent } from '@/store/types'

vi.mock('@/store/circuitStore', () => {
  const noStore = () => {
    throw new Error('BusJoiner3D read the store')
  }
  return {
    useCircuitStore: Object.assign(noStore, { getState: noStore }),
    circuitActions: new Proxy({}, { get: noStore }),
  }
})

vi.mock('@/hooks/useBusDrag', () => ({
  useBusDrag: () => {
    throw new Error('BusJoiner3D read gesture state')
  },
}))

vi.mock('@/components/canvas/FloatingLabel', () => ({
  FloatingLabel: ({ text }: { text: string }) => <group name={`label:${text}`} />,
}))

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>

function makeJoiner(width = 4): BusComponent {
  const { inputs, outputs } = createBusPins('joiner', width)
  return { id: 'bus-1', kind: 'joiner', position: { x: 1, y: 0.2, z: 2 }, rotation: { x: 0, y: 0, z: 0 }, width, inputs, outputs, selected: false }
}

const mounted: Renderer[] = []

async function mount(overrides: Partial<ComponentProps<typeof BusJoiner3D>> = {}): Promise<Renderer> {
  const renderer = await ReactThreeTestRenderer.create(<BusJoiner3D component={makeJoiner()} {...overrides} />)
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
const material = (mesh: ReturnType<typeof body>) => (mesh.instance as Mesh).material as MeshStandardMaterial
const hex = (colour: string) => new Color(colour).getHexString()
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
  for (const renderer of mounted.splice(0)) await renderer.unmount()
})

describe('BusJoiner3D under test-renderer, with no store and no gesture state', () => {
  it('draws the body, one pin per bus pin and the JOIN label from props alone', async () => {
    const renderer = await mount()

    expect(meshesWith(renderer, 'BoxGeometry')).toHaveLength(1)
    expect(pins(renderer)).toHaveLength(5)
    expect(labels(renderer)).toEqual(['label:JOIN x4'])
  })

  it('colours the body by hover and selection, and each pin by its value', async () => {
    const joiner = makeJoiner()
    joiner.outputs[0].value = 1
    const renderer = await mount({ component: joiner })

    expect(material(body(renderer)).color.getHexString()).toBe(hex(colors.gate.body))
    await renderer.fireEvent(body(renderer), 'onPointerOver')
    expect(material(body(renderer)).color.getHexString()).toBe(hex(colors.gate.bodyHover))
    await renderer.fireEvent(body(renderer), 'onPointerOut')
    expect(material(body(renderer)).color.getHexString()).toBe(hex(colors.gate.body))

    expect(pins(renderer).map((pin) => material(pin).color.getHexString())).toEqual([
      ...joiner.inputs.map(() => hex(colors.pin.inactive)),
      hex(colors.pin.active),
    ])
  })

  it('draws the selected colour when selected', async () => {
    const renderer = await mount({ selected: true })

    expect(material(body(renderer)).color.getHexString()).toBe(hex(colors.gate.bodySelected))
  })

  it('reports a body click through onClick and a pin click with its side and world position through onPinClick', async () => {
    const onClick = vi.fn()
    const onPinClick = vi.fn()
    const joiner = makeJoiner()
    const renderer = await mount({ component: joiner, onClick, onPinClick })

    await renderer.fireEvent(body(renderer), 'onClick')
    await renderer.fireEvent(pins(renderer)[4], 'onClick')

    const slot = computeBusPinLayout(joiner)[4]
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onPinClick).toHaveBeenCalledWith('bus-1', slot.pinId, 'output', {
      x: 1 + slot.position[0],
      y: 0.2 + slot.position[1],
      z: 2 + slot.position[2],
    })
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

    await renderer.fireEvent(body(renderer), 'onClick')

    expect(onClick).not.toHaveBeenCalled()
  })

  it('draws the body translucent and keeps the drag on pointer-out while the binding reports a drag', async () => {
    const drag = fakeDrag({ isDragging: true })
    const renderer = await mount({ drag, canDrag: true })

    await renderer.fireEvent(body(renderer), 'onPointerOut')

    expect(material(body(renderer)).transparent).toBe(true)
    expect(material(body(renderer)).opacity).toBe(0.7)
    expect(drag.onPointerLeave).not.toHaveBeenCalled()
  })
})
