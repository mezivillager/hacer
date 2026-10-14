import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { Mesh } from 'three'
import { NodeRenderer } from './NodeRenderer'
import { calculateNodePinPosition } from './config'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import type { CircuitStore, InputNode } from '@/store/types'
import { snapToGrid } from '@/utils/grid'
import { resetCircuitStore } from '@/test/r3f/seedCircuit'

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>

const WATCHED = [
  'selectNode',
  'setDragActive',
  'updatePlacementPreviewPosition',
  'updateInputNodePosition',
] as const

let calls: unknown[][] = []
let renderer: Renderer | undefined

beforeEach(() => {
  resetCircuitStore()
  useCircuitStore.setState({
    placementMode: null,
    nodePlacementMode: null,
    junctionPlacementMode: null,
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

type Handlers = Pick<Parameters<typeof NodeRenderer>[0], 'onClick' | 'onToggle' | 'onPinClick'>

async function mount(node: InputNode, handlers: Handlers = {}): Promise<Renderer> {
  renderer = await ReactThreeTestRenderer.create(
    <NodeRenderer renderableNode={{ type: 'input', node }} {...handlers} />,
  )
  return renderer
}

const meshesWith = (r: Renderer, geometryType: string) =>
  r.scene.findAll((n) => n.type === 'Mesh' && (n.instance as Mesh).geometry.type === geometryType)
const body = (r: Renderer) => meshesWith(r, 'BoxGeometry')[0]
const pin = (r: Renderer) => meshesWith(r, 'SphereGeometry')[0]
const addInput = () => useCircuitStore.getState().addInputNode('a', { x: 2, y: 0.2, z: 2 })
const inAct = (change: () => void) => ReactThreeTestRenderer.act(() => Promise.resolve(change()))

describe('NodeRenderer as the store adapter for InputNode3D', () => {
  it('selects the node on pointer-down, drags past the threshold and drops it at the snapped position', async () => {
    const node = addInput()
    const start = useCircuitStore.getState().inputNodes[0].position
    const r = await mount(node)

    await r.fireEvent(body(r), 'onPointerDown', { point: { x: 2, y: 0.2, z: 2 }, nativeEvent: { pointerId: 1, target: null } })
    expect(calls).toEqual([['selectNode', node.id, 'input']])

    await r.fireEvent(body(r), 'onPointerMove', { point: { x: 6.1, y: 0.2, z: 2 } })
    const preview = snapToGrid({ x: start.x + 4.1, y: start.y, z: start.z })
    expect(calls.slice(1)).toEqual([
      ['selectNode', node.id, 'input'],
      ['setDragActive', true],
      ['updatePlacementPreviewPosition', preview],
    ])

    await r.fireEvent(body(r), 'onPointerUp')
    expect(calls.slice(4)).toEqual([
      ['setDragActive', false],
      ['updateInputNodePosition', node.id, preview],
      ['updatePlacementPreviewPosition', null],
    ])
  })

  it.each<[string, Partial<CircuitStore>]>([
    ['a gate is being placed', { placementMode: 'Nand' }],
    ['a node is being placed', { nodePlacementMode: 'INPUT' }],
    ['a junction is being placed', { junctionPlacementMode: true }],
  ])('binds no drag to the body while %s, and binds it again afterwards', async (_, mode) => {
    const r = await mount(addInput())
    expect(body(r).props.onPointerDown).toBeTypeOf('function')

    await inAct(() => useCircuitStore.setState(mode))
    expect(body(r).props.onPointerDown).toBeUndefined()
    expect(body(r).props.onPointerMove).toBeUndefined()
    expect(body(r).props.onPointerUp).toBeUndefined()

    await inAct(() => useCircuitStore.setState({ placementMode: null, nodePlacementMode: null, junctionPlacementMode: null }))
    expect(body(r).props.onPointerDown).toBeTypeOf('function')
  })

  it('binds no drag to the body while a wire is being drawn', async () => {
    const node = addInput()
    const r = await mount(node)

    await inAct(() => useCircuitStore.getState().startWiringFromNode(node.id, 'input', { x: 2.6, y: 0.2, z: 2 }))

    expect(body(r).props.onPointerDown).toBeUndefined()
  })

  it('passes a click to onClick, a shift-click to onToggle with the node id, and a pin click to onPinClick, calling no circuitActions', async () => {
    const node = addInput()
    const onClick = vi.fn()
    const onToggle = vi.fn()
    const onPinClick = vi.fn()
    const r = await mount(node, { onClick, onToggle, onPinClick })

    await r.fireEvent(body(r), 'onPointerOver')
    await r.fireEvent(body(r), 'onClick', { shiftKey: false })
    await r.fireEvent(body(r), 'onClick', { shiftKey: true })
    await r.fireEvent(pin(r), 'onClick')
    await r.fireEvent(body(r), 'onPointerOut')

    const offset = calculateNodePinPosition('input')
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onToggle).toHaveBeenCalledWith(node.id)
    expect(onPinClick).toHaveBeenCalledWith(node.id, {
      x: node.position.x + offset.x,
      y: node.position.y + offset.y,
      z: node.position.z + offset.z,
    })
    expect(calls).toEqual([])
  })
})
