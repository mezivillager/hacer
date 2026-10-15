import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { Mesh } from 'three'
import { BusComponentRenderer } from './BusComponentRenderer'
import { computeBusPinLayout } from '@/components/scene/busBodyLayout'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import type { BusComponent, BusComponentKind, CircuitStore } from '@/store/types'
import { snapToGrid } from '@/utils/grid'
import { resetCircuitStore } from '@/test/r3f/seedCircuit'

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>

const WATCHED = [
  'selectBus',
  'setDragActive',
  'updatePlacementPreviewPosition',
  'updateBusComponentPosition',
] as const

let calls: unknown[][] = []
let renderer: Renderer | undefined

beforeEach(() => {
  resetCircuitStore()
  useCircuitStore.setState({
    placementMode: null,
    nodePlacementMode: null,
    junctionPlacementMode: null,
    busPlacementMode: null,
    isDragActive: false,
    placementPreviewPosition: null,
  })
  calls = []
  for (const name of WATCHED) {
    const original = circuitActions[name] as (...args: unknown[]) => void
    vi.spyOn(circuitActions, name).mockImplementation(((...args: unknown[]) => {
      calls.push([name, ...args])
      original(...args)
    }))
  }
})

afterEach(async () => {
  await renderer?.unmount()
  renderer = undefined
  vi.restoreAllMocks()
})

type Handlers = Pick<Parameters<typeof BusComponentRenderer>[0], 'onClick' | 'onPinClick'>

async function mount(component: BusComponent, handlers: Handlers = {}): Promise<Renderer> {
  renderer = await ReactThreeTestRenderer.create(<BusComponentRenderer component={component} {...handlers} />)
  return renderer
}

const meshesWith = (r: Renderer, geometryType: string) =>
  r.scene.findAll((n) => n.type === 'Mesh' && (n.instance as Mesh).geometry.type === geometryType)
const body = (r: Renderer) => meshesWith(r, 'BoxGeometry')[0]
const pins = (r: Renderer) => meshesWith(r, 'SphereGeometry')
const inAct = (change: () => void) => ReactThreeTestRenderer.act(() => Promise.resolve(change()))

const KINDS: BusComponentKind[] = ['splitter', 'joiner']

function addBus(kind: BusComponentKind): BusComponent {
  const state = useCircuitStore.getState()
  const bus = kind === 'splitter'
    ? state.placeBusSplitter(4, { x: 2, y: 0.2, z: 2 })
    : state.placeBusJoiner(4, { x: 2, y: 0.2, z: 2 })
  if (!bus) throw new Error(`${kind} not placed`)
  return bus
}

const pointerDown = (r: Renderer) =>
  r.fireEvent(body(r), 'onPointerDown', { point: { x: 2, y: 0.2, z: 2 }, nativeEvent: { pointerId: 1, target: null } })
const pointerMovePastThreshold = (r: Renderer) =>
  r.fireEvent(body(r), 'onPointerMove', { point: { x: 6.1, y: 0.2, z: 2 } })

describe('BusComponentRenderer as the store adapter for BusComponent3D', () => {
  it.each(KINDS)('selects the %s on pointer-down, drags past the threshold and drops it at the snapped position', async (kind) => {
    const bus = addBus(kind)
    const start = bus.position
    const r = await mount(bus)

    await pointerDown(r)
    expect(calls).toEqual([['selectBus', bus.id]])

    await pointerMovePastThreshold(r)
    const preview = snapToGrid({ x: start.x + 4.1, y: start.y, z: start.z })
    expect(calls.slice(1)).toEqual([
      ['selectBus', bus.id],
      ['setDragActive', true],
      ['updatePlacementPreviewPosition', preview],
    ])

    await r.fireEvent(body(r), 'onPointerUp')
    expect(calls.slice(4)).toEqual([
      ['setDragActive', false],
      ['updateBusComponentPosition', bus.id, preview],
      ['updatePlacementPreviewPosition', null],
    ])
  })

  it.each(KINDS)('lets the click after a tap on the %s through the drag hook to onClick', async (kind) => {
    const bus = addBus(kind)
    const onClick = vi.fn()
    const r = await mount(bus, { onClick })

    await pointerDown(r)
    await r.fireEvent(body(r), 'onPointerUp')
    await r.fireEvent(body(r), 'onClick')

    expect(calls).toEqual([
      ['selectBus', bus.id],
      ['setDragActive', false],
      ['updatePlacementPreviewPosition', null],
    ])
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it.each(KINDS)('lets the click after a drag and drop of the %s through the drag hook to onClick', async (kind) => {
    const bus = addBus(kind)
    const onClick = vi.fn()
    const r = await mount(bus, { onClick })

    await pointerDown(r)
    await pointerMovePastThreshold(r)
    await r.fireEvent(body(r), 'onPointerUp')
    await r.fireEvent(body(r), 'onClick')

    expect(useCircuitStore.getState().busComponents[0].position).toEqual({ x: 6, y: 0.2, z: 2 })
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it.each(KINDS)('binds no drag to the %s body while a bus component is being placed, and binds it again after cancelBusPlacement', async (kind) => {
    const r = await mount(addBus(kind))
    expect(body(r).props.onPointerDown).toBeTypeOf('function')

    await inAct(() => useCircuitStore.getState().startBusPlacement('joiner'))
    expect(body(r).props.onPointerDown).toBeUndefined()
    expect(body(r).props.onPointerMove).toBeUndefined()
    expect(body(r).props.onPointerUp).toBeUndefined()

    await inAct(() => useCircuitStore.getState().cancelBusPlacement())
    expect(body(r).props.onPointerDown).toBeTypeOf('function')
  })

  it.each(KINDS)('binds no drag to the %s body while a wire is being drawn, and binds it again after cancelWiring', async (kind) => {
    const r = await mount(addBus(kind))
    const source = useCircuitStore.getState().addInputNode('src', { x: 10, y: 0.2, z: 10 })

    await inAct(() => useCircuitStore.getState().startWiringFromNode(source.id, 'input', { x: 10.6, y: 0.2, z: 10 }))
    expect(body(r).props.onPointerDown).toBeUndefined()

    await inAct(() => useCircuitStore.getState().cancelWiring())
    expect(body(r).props.onPointerDown).toBeTypeOf('function')
  })

  const PLACING: [string, Partial<CircuitStore>][] = [
    ['a gate is being placed', { placementMode: 'Nand' }],
    ['a node is being placed', { nodePlacementMode: 'INPUT' }],
    ['a junction is being placed', { junctionPlacementMode: true }],
  ]
  it.each(KINDS.flatMap((kind) => PLACING.map(([what, mode]) => [kind, what, mode] as const)))(
    'binds no drag to the %s body while %s, as nodes do, and binds it again afterwards',
    async (kind, _, mode) => {
      const r = await mount(addBus(kind))
      expect(body(r).props.onPointerDown).toBeTypeOf('function')

      await inAct(() => useCircuitStore.setState(mode))
      expect(body(r).props.onPointerDown).toBeUndefined()
      expect(body(r).props.onPointerMove).toBeUndefined()
      expect(body(r).props.onPointerUp).toBeUndefined()

      await inAct(() => useCircuitStore.setState({ placementMode: null, nodePlacementMode: null, junctionPlacementMode: null }))
      expect(body(r).props.onPointerDown).toBeTypeOf('function')
    },
  )

  it.each(KINDS)('passes a %s body click to onClick and a pin click to onPinClick, calling no circuitActions', async (kind) => {
    const bus = addBus(kind)
    const onClick = vi.fn()
    const onPinClick = vi.fn()
    const r = await mount(bus, { onClick, onPinClick })

    await r.fireEvent(body(r), 'onPointerOver')
    await r.fireEvent(body(r), 'onClick')
    await r.fireEvent(pins(r)[0], 'onClick')
    await r.fireEvent(body(r), 'onPointerOut')

    const slot = computeBusPinLayout(bus)[0]
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onPinClick).toHaveBeenCalledWith(bus.id, slot.pinId, 'input', {
      x: bus.position.x + slot.position[0],
      y: bus.position.y + slot.position[1],
      z: bus.position.z + slot.position[2],
    })
    expect(calls).toEqual([])
  })
})
