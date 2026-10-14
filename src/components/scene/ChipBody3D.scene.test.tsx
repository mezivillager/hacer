import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import type { Mesh } from 'three'
import { ChipBody3D } from './ChipBody3D'
import { circuitActions, useCircuitStore } from '@/store/circuitStore'
import type { GateInstance } from '@/store/types'
import { snapToGrid } from '@/utils/grid'
import { resetCircuitStore } from '@/test/r3f/seedCircuit'

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>

const WATCHED = [
  'setHoveredGate',
  'setDestinationPin',
  'updateWirePreviewPosition',
  'selectGate',
  'setDragActive',
  'updatePlacementPreviewPosition',
] as const

let calls: unknown[][] = []
let renderer: Renderer | undefined

beforeEach(() => {
  resetCircuitStore()
  useCircuitStore.setState({ placementMode: null, hoveredGateId: null, isDragActive: false, placementPreviewPosition: null })
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

async function mount(gate: GateInstance, isWiring = false): Promise<Renderer> {
  renderer = await ReactThreeTestRenderer.create(
    <ChipBody3D
      gate={gate}
      isWiring={isWiring}
      isPinConnected={() => false}
      onClick={() => {}}
      onPinClick={() => {}}
      onInputToggle={() => {}}
    />,
  )
  return renderer
}

const meshesWith = (r: Renderer, geometryType: string) =>
  r.scene.findAll((n) => n.type === 'Mesh' && (n.instance as Mesh).geometry.type === geometryType)
const body = (r: Renderer) => meshesWith(r, 'BoxGeometry')[0]
const pins = (r: Renderer) => meshesWith(r, 'SphereGeometry')
const addNand = (x: number) => useCircuitStore.getState().addGate('Nand', { x, y: 0.2, z: 0 })

describe('ChipBody3D as the store adapter for BaseGate', () => {
  it('sets the hovered gate on body hover and clears it on pointer-out', async () => {
    const gate = addNand(0)
    const r = await mount(gate)

    await r.fireEvent(body(r), 'onPointerOver')
    await r.fireEvent(body(r), 'onPointerOut')

    expect(calls).toEqual([
      ['setHoveredGate', gate.id],
      ['setHoveredGate', null],
    ])
  })

  it('sets no destination pin on pin hover when no wire is being drawn', async () => {
    const r = await mount(addNand(0))

    await r.fireEvent(pins(r)[0], 'onPointerOver')
    await r.fireEvent(pins(r)[0], 'onPointerOut')

    expect(calls).toEqual([])
  })

  it('while wiring, sets and clears the destination pin and moves the wire preview', async () => {
    const source = addNand(0)
    const target = addNand(8)
    useCircuitStore.getState().startWiring(source.id, source.outputs[0].id, 'output', { x: 0.6, y: 0.2, z: 0 })
    const r = await mount(target, true)
    const pin = pins(r)[0]

    await r.fireEvent(pin, 'onPointerOver')
    await r.fireEvent(pin, 'onPointerMove', { point: { x: 7.4, y: 0.2, z: 0.2 } })
    await r.fireEvent(pin, 'onPointerOut')

    expect(calls).toEqual([
      ['setDestinationPin', target.id, target.inputs[0].id],
      ['updateWirePreviewPosition', { x: 7.4, y: 0.2, z: 0.2 }],
      ['setDestinationPin', null, null],
    ])
    expect(body(r).props.onPointerDown).toBeUndefined()
  })

  it('starts a drag only once the pointer passes the threshold', async () => {
    const gate = addNand(0)
    const start = useCircuitStore.getState().gates[0].position
    const r = await mount(gate)

    await r.fireEvent(body(r), 'onPointerDown', { point: { x: 0, y: 0.2, z: 0 }, nativeEvent: { pointerId: 1, target: null } })
    expect(calls).toEqual([])

    await r.fireEvent(body(r), 'onPointerMove', { point: { x: 2.1, y: 0.2, z: 0 } })
    expect(calls).toEqual([
      ['selectGate', gate.id],
      ['setDragActive', true],
      ['updatePlacementPreviewPosition', snapToGrid({ x: start.x + 2.1, y: start.y, z: start.z })],
    ])
  })

  it('binds no drag to the body while a gate is being placed', async () => {
    const gate = addNand(0)
    useCircuitStore.setState({ placementMode: 'Nand' })
    const r = await mount(gate)

    expect(body(r).props.onPointerDown).toBeUndefined()
  })
})
