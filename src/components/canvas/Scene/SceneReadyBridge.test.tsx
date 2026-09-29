/**
 * Scene-graph tests: the bridge mounts in a real R3F root (@react-three/test-renderer) with a
 * real three.js camera, so projection runs the same math it runs in the app — no WebGL needed.
 */
import type { ReactNode } from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { Line3, PerspectiveCamera, Vector3, type Mesh, type Object3D } from 'three'
import { useCircuitStore } from '@/store/circuitStore'
import { resetCircuitStore, wireInputNodeToPin } from '@/test/r3f/seedCircuit'
import { isRenderedLine, readLinePoints } from '@/test/r3f/linePoints'
import type { CircuitStore, Position } from '@/store/types'
import { GateRenderer } from '@/gates'
import { NodeRenderer } from '@/nodes/NodeRenderer'
import { BusComponentRenderer } from '@/nodes/BusComponentRenderer'
import { calculateNodePinPosition } from '@/nodes/config'
import { Wire3D } from '../Wire3D'
import { deriveWire3DProps } from '../deriveWire3DProps'
import { generateHopArc } from '@/utils/wiringScheme/crossing'
import { HOP_RADIUS, WIRE_HEIGHT } from '@/utils/wiringScheme/types'
import { SceneReadyBridge } from './SceneReadyBridge'
import { describeCircuitScene, type SceneEntity } from './sceneDescribe'

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>

const RECT: DOMRect = {
  x: 10,
  y: 20,
  left: 10,
  top: 20,
  width: 800,
  height: 600,
  right: 810,
  bottom: 620,
  toJSON: () => ({}),
}
const CENTRE = { x: RECT.left + RECT.width / 2, y: RECT.top + RECT.height / 2 }

const getState = () => useCircuitStore.getState()

function makeCamera(): PerspectiveCamera {
  const camera = new PerspectiveCamera(50, RECT.width / RECT.height, 0.1, 1000)
  camera.position.set(0, 20, 20)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  return camera
}

/** Independent reference projection, written out here rather than shared with the code under test. */
function expectedScreen(camera: PerspectiveCamera, world: Position) {
  const ndc = new Vector3(world.x, world.y, world.z).project(camera)
  return {
    x: ((ndc.x + 1) / 2) * RECT.width + RECT.left,
    y: ((1 - ndc.y) / 2) * RECT.height + RECT.top,
  }
}

async function mountBridge(camera: PerspectiveCamera = makeCamera(), scene?: ReactNode): Promise<Renderer> {
  return ReactThreeTestRenderer.create(<><SceneReadyBridge />{scene}</>, {
    camera,
    width: RECT.width,
    height: RECT.height,
    beforeReturn: (canvas) => {
      canvas.getBoundingClientRect = () => RECT
    },
  })
}

function helpers() {
  const published = window.__SCENE_HELPERS__
  if (!published) throw new Error('__SCENE_HELPERS__ not published')
  return published
}

function project(id: string) {
  const projector = helpers().project
  if (!projector) throw new Error('project not published')
  return projector(id)
}

const noop = () => {}

/** The app's renderers for every entity in `state`, each in an untransformed group tagged with its id. */
function RenderedCircuit({ state }: { state: CircuitStore }) {
  return (
    <>
      {state.gates.map((gate) => (
        <group key={gate.id} userData={{ describedId: gate.id }}>
          <GateRenderer
            gate={gate}
            isWiring={false}
            isPinConnected={() => false}
            onClick={noop}
            onPinClick={noop}
            onInputToggle={noop}
          />
        </group>
      ))}
      {state.busComponents.map((bus) => (
        <group key={bus.id} userData={{ describedId: bus.id }}>
          <BusComponentRenderer component={bus} />
        </group>
      ))}
      {state.inputNodes.map((node) => (
        <group key={node.id} userData={{ describedId: node.id }}>
          <NodeRenderer renderableNode={{ type: 'input', node }} />
        </group>
      ))}
      {state.outputNodes.map((node) => (
        <group key={node.id} userData={{ describedId: node.id }}>
          <NodeRenderer renderableNode={{ type: 'output', node }} />
        </group>
      ))}
      {state.junctions.map((node) => (
        <group key={node.id} userData={{ describedId: node.id }}>
          <NodeRenderer renderableNode={{ type: 'junction', node, value: 0 }} />
        </group>
      ))}
      {state.wires.map((wire) => {
        const { start, end, precomputedPath } = deriveWire3DProps(wire, state)
        return (
          <group key={wire.id} userData={{ describedId: wire.id }}>
            <Wire3D start={start} end={end} precomputedPath={precomputedPath} />
          </group>
        )
      })}
    </>
  )
}

function taggedGroups(root: Object3D): Map<string, Object3D> {
  const groups = new Map<string, Object3D>()
  root.traverse((o) => {
    const id: unknown = o.userData.describedId
    if (typeof id === 'string') groups.set(id, o)
  })
  return groups
}

/** Matched by type name: the renderer's three.js classes are not always the ones this file imports. */
function meshCentres(group: Object3D, geometry: 'BoxGeometry' | 'SphereGeometry'): Vector3[] {
  const centres: Vector3[] = []
  group.traverse((o) => {
    if (o.type === 'Mesh' && (o as Mesh).geometry.type === geometry) centres.push(o.getWorldPosition(new Vector3()))
  })
  return centres
}

/** Every rendered line segment of a wire, in world space. */
function drawnSegments(group: Object3D): Line3[] {
  const segments: Line3[] = []
  group.traverse((o) => {
    if (!isRenderedLine(o)) return
    o.updateWorldMatrix(true, false)
    const points = readLinePoints(o).map((p) => o.localToWorld(p))
    for (let i = 1; i < points.length; i++) segments.push(new Line3(points[i - 1], points[i]))
  })
  return segments
}

const MESH_TOLERANCE = 1e-3

/** One rendered centre per described point, each within tolerance, none left over. */
function expectSameCentres(label: string, described: SceneEntity[], rendered: Vector3[]): void {
  expect(rendered, label).toHaveLength(described.length)
  const unmatched = [...rendered]
  for (const e of described) {
    const at = new Vector3(e.world.x, e.world.y, e.world.z)
    const index = unmatched.findIndex((centre) => centre.distanceTo(at) < MESH_TOLERANCE)
    expect(index, `${label}: no mesh at ${e.id} ${JSON.stringify(e.world)}`).toBeGreaterThanOrEqual(0)
    unmatched.splice(index, 1)
  }
}

describe('SceneReadyBridge', () => {
  let renderer: Renderer | null = null

  beforeEach(() => {
    resetCircuitStore()
    delete window.__SCENE_READY__
    delete window.__SCENE_HELPERS__
  })

  afterEach(async () => {
    if (renderer) await renderer.unmount()
    renderer = null
    resetCircuitStore()
    delete window.__SCENE_READY__
    delete window.__SCENE_HELPERS__
  })

  it('adds nothing to the scene graph', async () => {
    renderer = await mountBridge()
    expect(renderer.scene.children).toHaveLength(0)
  })

  it('sets window.__SCENE_READY__ on the first frame', async () => {
    renderer = await mountBridge()
    expect(window.__SCENE_READY__).toBeUndefined()

    await renderer.advanceFrames(1, 1 / 60)

    expect(window.__SCENE_READY__).toBe(true)
  })

  it('publishes projectToScreen, canvasRect, scene and project, and no merged describe', async () => {
    renderer = await mountBridge()
    await renderer.advanceFrames(1, 1 / 60)

    expect(typeof helpers().projectToScreen).toBe('function')
    expect(typeof helpers().canvasRect).toBe('function')
    expect(typeof helpers().scene).toBe('function')
    expect(typeof helpers().project).toBe('function')
    expect(helpers()).not.toHaveProperty('describe')
  })

  it('announces scene-ready once however many frames run', async () => {
    let announcements = 0
    const count = () => {
      announcements += 1
    }
    window.addEventListener('scene-ready', count)
    try {
      renderer = await mountBridge()
      await renderer.advanceFrames(3, 1 / 60)
    } finally {
      window.removeEventListener('scene-ready', count)
    }

    expect(announcements).toBe(1)
    expect(window.__SCENE_READY__).toBe(true)
  })

  it('canvasRect returns the canvas bounding rect', async () => {
    renderer = await mountBridge()
    await renderer.advanceFrames(1, 1 / 60)

    expect(helpers().canvasRect()).toEqual(RECT)
  })

  it('projectToScreen maps the point the camera looks at to the canvas centre', async () => {
    renderer = await mountBridge()
    await renderer.advanceFrames(1, 1 / 60)

    const screen = helpers().projectToScreen({ x: 0, y: 0, z: 0 })
    expect(screen.x).toBeCloseTo(CENTRE.x, 6)
    expect(screen.y).toBeCloseTo(CENTRE.y, 6)
  })

  it('scene() is the pure description of the store when called', async () => {
    getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    getState().addInputNode('a', { x: -6, y: 0, z: 2 })
    renderer = await mountBridge()
    await renderer.advanceFrames(1, 1 / 60)
    // scene() reads the store when called, not when the bridge mounted.
    const late = getState().addOutputNode('out', { x: 6, y: 0, z: 2 })

    const scene = helpers().scene()

    expect(scene).toEqual(describeCircuitScene(getState()))
    expect(scene.entities.map((e) => e.id)).toContain(late.id)
    expect(JSON.parse(JSON.stringify(scene))).toEqual(scene)
  })

  it('project(id) maps each entity through the scene camera, and returns null for an unknown id', async () => {
    const camera = makeCamera()
    const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    getState().addInputNode('a', { x: -6, y: 0, z: 2 })
    renderer = await mountBridge(camera)
    await renderer.advanceFrames(1, 1 / 60)

    const { entities } = helpers().scene()

    expect(entities.length).toBeGreaterThan(2)
    for (const e of entities) {
      const expected = expectedScreen(camera, e.world)
      const projected = project(e.id)
      expect(projected?.screen?.x).toBeCloseTo(expected.x, 3)
      expect(projected?.screen?.y).toBeCloseTo(expected.y, 3)
    }
    const centred = project(gate.id)
    expect(centred?.screen?.x).toBeCloseTo(CENTRE.x, 3)
    expect(centred?.screen?.y).toBeCloseTo(CENTRE.y, 3)
    expect(centred?.visible).toBe(true)
    expect(project('no-such-entity')).toBeNull()
  })

  it('project(id) marks what lies outside the camera view, or behind the camera, as not visible', async () => {
    const inView = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    const farAside = getState().addGate('Nand', { x: 500, y: 0, z: 0 })
    const behind = getState().addGate('Nand', { x: 0, y: 40, z: 40 })
    renderer = await mountBridge()
    await renderer.advanceFrames(1, 1 / 60)

    expect(project(inView.id)?.visible).toBe(true)
    expect(project(farAside.id)?.visible).toBe(false)
    expect(project(behind.id)?.visible).toBe(false)
  })

  it('scene() places every gate, bus, I/O node, junction, pin and wire on what the renderer draws', async () => {
    const mux = getState().addGate('Mux4Way16', { x: 0, y: 0, z: 0 })
    getState().rotateGate(mux.id, 'z', Math.PI / 2)
    const xor = getState().addGate('Xor', { x: 8, y: 0, z: -6 })
    getState().rotateGate(xor.id, 'y', Math.PI / 2)
    if (!getState().placeBusSplitter(4, { x: -8, y: 0, z: -6 })) throw new Error('splitter not placed')
    if (!getState().placeBusJoiner(4, { x: -8, y: 0, z: 6 })) throw new Error('joiner not placed')
    const a = getState().addInputNode('a', { x: 4, y: 0, z: -12 })
    const b = getState().addInputNode('b', { x: -6, y: 0, z: 12 })
    const out = getState().addOutputNode('out', { x: 6, y: 0, z: 12 })
    getState().addJunction('sig-j', { x: 12, y: 0, z: 4 })
    wireInputNodeToPin(a.id, xor.id, xor.inputs[0].id)
    // A hop centred on the wire's halfway point, so that point is the arc's apex.
    const from = b.position.x + calculateNodePinPosition('input').x
    const to = out.position.x + calculateNodePinPosition('output').x
    const mid = (from + to) / 2
    const at = (x: number) => ({ x, y: WIRE_HEIGHT, z: 12 })
    getState().addWire({ type: 'input', entityId: b.id }, { type: 'output', entityId: out.id }, [
      { start: at(from), end: at(mid - HOP_RADIUS), type: 'horizontal' },
      generateHopArc(at(mid - HOP_RADIUS), at(mid + HOP_RADIUS), at(mid), 'crossed-wire'),
      { start: at(mid + HOP_RADIUS), end: at(to), type: 'horizontal' },
    ])
    renderer = await mountBridge(makeCamera(), <RenderedCircuit state={getState()} />)
    await renderer.advanceFrames(1, 1 / 60)

    const { entities } = helpers().scene()
    const groups = taggedGroups(renderer.scene.instance)
    const drawn = (e: SceneEntity) => {
      const group = groups.get(e.id)
      if (!group) throw new Error(`nothing rendered for ${e.kind} ${e.id}`)
      return group
    }

    const owners = entities.filter((e) => ['gate', 'bus', 'input', 'output'].includes(e.kind))
    expect(owners.map((e) => e.kind).sort()).toEqual(['bus', 'bus', 'gate', 'gate', 'input', 'input', 'output'])
    for (const owner of owners) {
      expectSameCentres(owner.id, [owner], meshCentres(drawn(owner), 'BoxGeometry'))
      const pins = entities.filter((e) => e.kind === 'pin' && e.ownerId === owner.id)
      expect(pins.length, `${owner.id} pins`).toBeGreaterThan(0)
      expectSameCentres(`${owner.id} pins`, pins, meshCentres(drawn(owner), 'SphereGeometry'))
    }
    const junctions = entities.filter((e) => e.kind === 'junction')
    expect(junctions).toHaveLength(1)
    for (const junction of junctions) {
      expectSameCentres(junction.id, [junction], meshCentres(drawn(junction), 'SphereGeometry'))
    }
    const wires = entities.filter((e) => e.kind === 'wire')
    expect(wires).toHaveLength(2)
    for (const wire of wires) {
      const segments = drawnSegments(drawn(wire))
      expect(segments.length, wire.id).toBeGreaterThan(0)
      const at = new Vector3(wire.world.x, wire.world.y, wire.world.z)
      const gap = Math.min(...segments.map((s) => s.closestPointToPoint(at, true, new Vector3()).distanceTo(at)))
      expect(gap, `${wire.id} at ${JSON.stringify(wire.world)} is off its drawn path`).toBeLessThan(MESH_TOLERANCE)
    }
  })

  it('cleans up window globals on unmount', async () => {
    renderer = await mountBridge()
    await renderer.advanceFrames(1, 1 / 60)
    expect(window.__SCENE_READY__).toBe(true)
    expect(window.__SCENE_HELPERS__).toBeDefined()

    await renderer.unmount()
    renderer = null

    expect(window.__SCENE_READY__).toBeUndefined()
    expect(window.__SCENE_HELPERS__).toBeUndefined()
  })
})
