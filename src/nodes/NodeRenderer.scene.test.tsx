import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { Color, type Mesh, type MeshStandardMaterial } from 'three'
import { NodeRenderer } from './NodeRenderer'
import { calculateNodePinPosition } from './config'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import type { CircuitStore, InputNode, OutputNode } from '@/store/types'
import { colors } from '@/theme'
import { snapToGrid } from '@/utils/grid'
import { resetCircuitStore } from '@/test/r3f/seedCircuit'

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>
type Kind = 'input' | 'output'

const KINDS: Kind[] = ['input', 'output']
const PLACING: [string, Partial<CircuitStore>][] = [
  ['a gate is being placed', { placementMode: 'Nand' }],
  ['a node is being placed', { nodePlacementMode: 'INPUT' }],
  ['a junction is being placed', { junctionPlacementMode: true }],
  ['a bus component is being placed', { busPlacementMode: 'splitter' }],
]

const WATCHED = [
  'selectNode',
  'setDragActive',
  'updatePlacementPreviewPosition',
  'updateInputNodePosition',
  'updateOutputNodePosition',
  'setDestinationNode',
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

type Handlers = Pick<Parameters<typeof NodeRenderer>[0], 'onClick' | 'onToggle' | 'onPinClick'>

const addNode = (kind: Kind): InputNode | OutputNode =>
  kind === 'input'
    ? useCircuitStore.getState().addInputNode('a', { x: 2, y: 0.2, z: 2 })
    : useCircuitStore.getState().addOutputNode('out', { x: 2, y: 0.2, z: 2 })

async function mount(kind: Kind, node: InputNode | OutputNode, handlers: Handlers = {}): Promise<Renderer> {
  renderer = await ReactThreeTestRenderer.create(
    kind === 'input'
      ? <NodeRenderer renderableNode={{ type: 'input', node }} {...handlers} />
      : <NodeRenderer renderableNode={{ type: 'output', node }} {...handlers} />,
  )
  return renderer
}

const meshesWith = (r: Renderer, geometryType: string) =>
  r.scene.findAll((n) => n.type === 'Mesh' && (n.instance as Mesh).geometry.type === geometryType)
const body = (r: Renderer) => meshesWith(r, 'BoxGeometry')[0]
const pin = (r: Renderer) => meshesWith(r, 'SphereGeometry')[0]
const pinColour = (r: Renderer) => ((pin(r).instance as Mesh).material as MeshStandardMaterial).color.getHexString()
const inAct = (change: () => void) => ReactThreeTestRenderer.act(() => Promise.resolve(change()))

function startWiringFromAnotherInput() {
  const source = useCircuitStore.getState().addInputNode('src', { x: 10, y: 0.2, z: 10 })
  return inAct(() => useCircuitStore.getState().startWiringFromNode(source.id, 'input', { x: 10.6, y: 0.2, z: 10 }))
}

describe('NodeRenderer as the store adapter for InputNode3D and OutputNode3D', () => {
  it.each(KINDS)('selects the %s node on pointer-down, drags past the threshold and drops it at the snapped position', async (kind) => {
    const node = addNode(kind)
    const start = node.position
    const r = await mount(kind, node)

    await r.fireEvent(body(r), 'onPointerDown', { point: { x: 2, y: 0.2, z: 2 }, nativeEvent: { pointerId: 1, target: null } })
    expect(calls).toEqual([['selectNode', node.id, kind]])

    await r.fireEvent(body(r), 'onPointerMove', { point: { x: 6.1, y: 0.2, z: 2 } })
    const preview = snapToGrid({ x: start.x + 4.1, y: start.y, z: start.z })
    expect(calls.slice(1)).toEqual([
      ['selectNode', node.id, kind],
      ['setDragActive', true],
      ['updatePlacementPreviewPosition', preview],
    ])

    await r.fireEvent(body(r), 'onPointerUp')
    expect(calls.slice(4)).toEqual([
      ['setDragActive', false],
      [kind === 'input' ? 'updateInputNodePosition' : 'updateOutputNodePosition', node.id, preview],
      ['updatePlacementPreviewPosition', null],
    ])
  })

  it.each(KINDS.flatMap((kind) => PLACING.map(([what, mode]) => [kind, what, mode] as const)))(
    'binds no drag to the %s node body while %s, and binds it again afterwards',
    async (kind, _, mode) => {
      const r = await mount(kind, addNode(kind))
      expect(body(r).props.onPointerDown).toBeTypeOf('function')

      await inAct(() => useCircuitStore.setState(mode))
      expect(body(r).props.onPointerDown).toBeUndefined()
      expect(body(r).props.onPointerMove).toBeUndefined()
      expect(body(r).props.onPointerUp).toBeUndefined()

      await inAct(() => useCircuitStore.setState({ placementMode: null, nodePlacementMode: null, junctionPlacementMode: null, busPlacementMode: null }))
      expect(body(r).props.onPointerDown).toBeTypeOf('function')
    },
  )

  it.each(KINDS)('binds no drag to the %s node body while a wire is being drawn, and binds it again after cancelWiring', async (kind) => {
    const r = await mount(kind, addNode(kind))

    await startWiringFromAnotherInput()
    expect(body(r).props.onPointerDown).toBeUndefined()

    await inAct(() => useCircuitStore.getState().cancelWiring())
    expect(body(r).props.onPointerDown).toBeTypeOf('function')
  })

  it('passes an input node click to onClick, a shift-click to onToggle with the node id, and a pin click to onPinClick, calling no circuitActions', async () => {
    const node = addNode('input')
    const onClick = vi.fn()
    const onToggle = vi.fn()
    const onPinClick = vi.fn()
    const r = await mount('input', node, { onClick, onToggle, onPinClick })

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

  it('passes an output node click to onClick and a pin click to onPinClick, and sets no destination on pin hover when no wire is being drawn', async () => {
    const node = addNode('output')
    const onClick = vi.fn()
    const onPinClick = vi.fn()
    const r = await mount('output', node, { onClick, onPinClick })

    await r.fireEvent(body(r), 'onClick')
    await r.fireEvent(pin(r), 'onPointerOver')
    await r.fireEvent(pin(r), 'onClick')
    await r.fireEvent(pin(r), 'onPointerOut')

    const offset = calculateNodePinPosition('output')
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onPinClick).toHaveBeenCalledWith(node.id, {
      x: node.position.x + offset.x,
      y: node.position.y + offset.y,
      z: node.position.z + offset.z,
    })
    expect(calls).toEqual([])
  })

  it('while wiring, sets and clears the destination node on output pin hover and highlights the hovered pin', async () => {
    const node = addNode('output')
    const r = await mount('output', node)
    await startWiringFromAnotherInput()
    const idleColour = pinColour(r)

    await r.fireEvent(pin(r), 'onPointerOver')
    expect(pinColour(r)).toBe(new Color(colors.primary).getHexString())

    await r.fireEvent(pin(r), 'onPointerOut')
    expect(pinColour(r)).toBe(idleColour)
    expect(calls).toEqual([
      ['setDestinationNode', node.id, 'output'],
      ['setDestinationNode', null, null],
    ])
  })
})
