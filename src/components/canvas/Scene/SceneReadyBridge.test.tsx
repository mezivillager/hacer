/**
 * Scene-graph tests: the bridge mounts in a real R3F root (@react-three/test-renderer) with a
 * real three.js camera, so projection runs the same math it runs in the app — no WebGL needed.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { PerspectiveCamera, Vector3 } from 'three'
import { useCircuitStore } from '@/store/circuitStore'
import { resetCircuitStore } from '@/test/r3f/seedCircuit'
import type { Position } from '@/store/types'
import { SceneReadyBridge } from './SceneReadyBridge'
import { describeCircuitScene } from './sceneDescribe'

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

async function mountBridge(camera: PerspectiveCamera = makeCamera()): Promise<Renderer> {
  return ReactThreeTestRenderer.create(<SceneReadyBridge />, {
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

  it('publishes projectToScreen, canvasRect and describe', async () => {
    renderer = await mountBridge()
    await renderer.advanceFrames(1, 1 / 60)

    expect(typeof helpers().projectToScreen).toBe('function')
    expect(typeof helpers().canvasRect).toBe('function')
    expect(typeof helpers().describe).toBe('function')
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

  it('describe() reports every store entity with its world position and the camera projection of it', async () => {
    const camera = makeCamera()
    const gate = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    getState().addInputNode('a', { x: -6, y: 0, z: 2 })
    renderer = await mountBridge(camera)
    await renderer.advanceFrames(1, 1 / 60)
    // describe() reads the store when called, not when the bridge mounted.
    const late = getState().addOutputNode('out', { x: 6, y: 0, z: 2 })

    const described = helpers().describe()

    const fromStore = describeCircuitScene(getState())
    expect(described.entities.map((e) => [e.id, e.kind, e.world])).toEqual(
      fromStore.entities.map((e) => [e.id, e.kind, e.world]),
    )
    expect(described.entities.map((e) => e.id)).toContain(late.id)
    for (const e of described.entities) {
      const expected = expectedScreen(camera, e.world)
      expect(e.screen?.x).toBeCloseTo(expected.x, 3)
      expect(e.screen?.y).toBeCloseTo(expected.y, 3)
    }
    const gateEntity = described.entities.find((e) => e.id === gate.id)
    expect(gateEntity?.screen?.x).toBeCloseTo(CENTRE.x, 3)
    expect(gateEntity?.screen?.y).toBeCloseTo(CENTRE.y, 3)
    expect(gateEntity?.state).toEqual({ visible: true, selected: false, signal: null })
    expect(JSON.parse(JSON.stringify(described))).toEqual(described)
  })

  it('describe() marks what lies outside the camera view, or behind the camera, as not visible', async () => {
    const inView = getState().addGate('Nand', { x: 0, y: 0, z: 0 })
    const farAside = getState().addGate('Nand', { x: 500, y: 0, z: 0 })
    const behind = getState().addGate('Nand', { x: 0, y: 40, z: 40 })
    renderer = await mountBridge()
    await renderer.advanceFrames(1, 1 / 60)

    const visibility = new Map(helpers().describe().entities.map((e) => [e.id, e.state.visible]))

    expect(visibility.get(inView.id)).toBe(true)
    expect(visibility.get(farAside.id)).toBe(false)
    expect(visibility.get(behind.id)).toBe(false)
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
