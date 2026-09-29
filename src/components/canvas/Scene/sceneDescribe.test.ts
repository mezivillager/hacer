import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { resetCircuitStore } from '@/test/r3f/seedCircuit'
import { calculateNodePinPosition } from '@/nodes/config'
import type { Position } from '@/store/types'
import { generateHopArc } from '@/utils/wiringScheme/crossing'
import { HOP_HEIGHT, HOP_RADIUS, WIRE_HEIGHT, type WireSegment } from '@/utils/wiringScheme/types'
import { describeCircuitScene, projectSceneEntity, type Projector, type SceneEntity } from './sceneDescribe'

const getState = () => useCircuitStore.getState()

function entity(entities: SceneEntity[], id: string): SceneEntity {
  const found = entities.find((e) => e.id === id)
  if (!found) throw new Error(`no entity ${id}`)
  return found
}

function expectNear(actual: Position, expected: Position): void {
  expect(actual.x).toBeCloseTo(expected.x, 3)
  expect(actual.y).toBeCloseTo(expected.y, 3)
  expect(actual.z).toBeCloseTo(expected.z, 3)
}

/** One of each entity kind, with a wire whose segments are known: 4 + 2 units long. */
function seed() {
  const gate = getState().addGate('Nand', { x: 2, y: 0, z: 2 })
  const a = getState().addInputNode('a', { x: -6, y: 0, z: 2 })
  const out = getState().addOutputNode('out', { x: 10, y: 0, z: 2 })
  const splitter = getState().placeBusSplitter(2, { x: 2, y: 0, z: 10 })
  if (!splitter) throw new Error('splitter not placed')
  const junction = getState().addJunction('sig-a', { x: -2, y: 0, z: 6 })
  const wire = getState().addWire(
    { type: 'input', entityId: a.id },
    { type: 'gate', entityId: gate.id, pinId: gate.inputs[0].id },
    [
      { start: { x: -5, y: 0.2, z: 2 }, end: { x: -1, y: 0.2, z: 2 }, type: 'horizontal' },
      { start: { x: -1, y: 0.2, z: 2 }, end: { x: -1, y: 0.2, z: 4 }, type: 'vertical' },
    ],
  )
  return { gate, a, out, splitter, junction, wire }
}

describe('describeCircuitScene (store → JSON)', () => {
  beforeEach(() => {
    resetCircuitStore()
    getState().selectBus(null)
  })
  afterEach(() => resetCircuitStore())

  it('lists every gate, bus, I/O node, junction, pin and wire in store order, pins after their owner', () => {
    const { gate, a, out, splitter, junction, wire } = seed()

    const listed = describeCircuitScene(getState()).entities.map((e) => `${e.kind} ${e.id}`)

    expect(listed).toEqual([
      `gate ${gate.id}`,
      ...[...gate.inputs, ...gate.outputs].map((p) => `pin ${gate.id}:${p.name}`),
      `bus ${splitter.id}`,
      ...[...splitter.inputs, ...splitter.outputs].map((p) => `pin ${splitter.id}:${p.name}`),
      `input ${a.id}`,
      `pin ${a.id}:a`,
      `output ${out.id}`,
      `pin ${out.id}:out`,
      `junction ${junction.id}`,
      `wire ${wire.id}`,
    ])
  })

  it('places each entity where the renderer draws it', () => {
    const { gate, a, out, splitter, junction, wire } = seed()
    const { entities } = describeCircuitScene(getState())

    const gateEntity = entity(entities, gate.id)
    expect(gateEntity).toMatchObject({ kind: 'gate', name: 'Nand', ownerId: null, pinId: null })
    expectNear(gateEntity.world, gate.position)

    for (const pin of [...gate.inputs, ...gate.outputs]) {
      const pinEntity = entity(entities, `${gate.id}:${pin.name}`)
      expect(pinEntity).toMatchObject({ kind: 'pin', ownerId: gate.id, name: pin.name, pinId: pin.id })
      const drawnAt = getState().getPinWorldPosition(gate.id, pin.id)
      if (!drawnAt) throw new Error(`pin ${pin.id} has no world position`)
      expectNear(pinEntity.world, drawnAt)
    }

    for (const pin of [...splitter.inputs, ...splitter.outputs]) {
      const drawnAt = getState().getPinWorldPosition(splitter.id, pin.id)
      if (!drawnAt) throw new Error(`bus pin ${pin.id} has no world position`)
      expectNear(entity(entities, `${splitter.id}:${pin.name}`).world, drawnAt)
    }

    const inputOffset = calculateNodePinPosition('input')
    expect(entity(entities, `${a.id}:a`)).toMatchObject({ ownerId: a.id, name: 'a', pinId: null })
    expectNear(entity(entities, `${a.id}:a`).world, {
      x: a.position.x + inputOffset.x,
      y: a.position.y + inputOffset.y,
      z: a.position.z + inputOffset.z,
    })
    const outputOffset = calculateNodePinPosition('output')
    expectNear(entity(entities, `${out.id}:out`).world, {
      x: out.position.x + outputOffset.x,
      y: out.position.y + outputOffset.y,
      z: out.position.z + outputOffset.z,
    })

    expectNear(entity(entities, a.id).world, a.position)
    expectNear(entity(entities, junction.id).world, junction.position)
    // Halfway along 6 units of segments: 3 units into the first, 4-unit, segment.
    expectNear(entity(entities, wire.id).world, { x: -2, y: 0.2, z: 2 })
  })

  it('reports selection as the app shows it', () => {
    const { gate, a, splitter, wire } = seed()
    const selected = () =>
      describeCircuitScene(getState())
        .entities.filter((e) => e.state.selected)
        .map((e) => e.id)

    expect(selected()).toEqual([])
    getState().selectGate(gate.id)
    expect(selected()).toEqual([gate.id])
    getState().selectWire(wire.id)
    expect(selected()).toEqual([wire.id])
    getState().selectNode(a.id, 'input')
    expect(selected()).toEqual([a.id])
    getState().selectBus(splitter.id)
    expect(selected()).toEqual([splitter.id])
  })

  it('reports the signal the scene draws: pin and node values, wire values only while running', () => {
    const { gate, a, splitter, wire } = seed()
    getState().updateInputNodeValue(a.id, 1)

    const stopped = describeCircuitScene(getState()).entities
    expect(entity(stopped, a.id).state.signal).toBe(1)
    expect(entity(stopped, `${a.id}:a`).state.signal).toBe(1)
    expect(entity(stopped, gate.id).state.signal).toBeNull()
    expect(entity(stopped, splitter.id).state.signal).toBeNull()
    expect(entity(stopped, `${gate.id}:out`).state.signal).toBe(gate.outputs[0].value)
    expect(entity(stopped, wire.id).state.signal).toBe(0)

    getState().toggleSimulation()
    expect(entity(describeCircuitScene(getState()).entities, wire.id).state.signal).toBe(1)
  })

  it('describes only what needs no camera: no screen position and no visibility', () => {
    seed()

    for (const e of describeCircuitScene(getState()).entities) {
      expect(Object.keys(e).sort()).toEqual(['id', 'kind', 'name', 'ownerId', 'pinId', 'state', 'world'])
      expect(Object.keys(e.state).sort()).toEqual(['selected', 'signal'])
    }
  })

  it('projects one entity by id through the projector, and returns null for an id it does not describe', () => {
    const { gate, a } = seed()
    const project: Projector = (world) => ({ x: world.x * 10, y: world.z * 10, visible: world.x >= 0 })

    expect(projectSceneEntity(getState(), gate.id, project)).toEqual({ screen: { x: 20, y: 20 }, visible: true })
    expect(projectSceneEntity(getState(), a.id, project)).toEqual({ screen: { x: -60, y: 20 }, visible: false })
    expect(projectSceneEntity(getState(), 'no-such-entity', project)).toBeNull()
  })

  it('projects the world position the scene publishes, so both agree', () => {
    const { gate } = seed()
    const pin = `${gate.id}:${gate.inputs[0].name}`
    const published = entity(describeCircuitScene(getState()).entities, pin).world

    const seen: Position[] = []
    projectSceneEntity(getState(), pin, (world) => {
      seen.push(world)
      return { x: 0, y: 0, visible: true }
    })

    expect(seen).toEqual([published])
  })

  it('never reports a wire the renderer cannot draw as visible, and places it between its endpoints', () => {
    const { gate, a } = seed()
    const bare = getState().addWire(
      { type: 'input', entityId: a.id },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[1].id },
      [],
    )

    expect(projectSceneEntity(getState(), bare.id, () => ({ x: 1, y: 1, visible: true }))?.visible).toBe(false)
    const inputOffset = calculateNodePinPosition('input')
    const to = getState().getPinWorldPosition(gate.id, gate.inputs[1].id)
    if (!to) throw new Error('gate pin has no world position')
    const from = { x: a.position.x + inputOffset.x, y: 0.2, z: a.position.z + inputOffset.z }
    expectNear(entity(describeCircuitScene(getState()).entities, bare.id).world, {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
      z: (from.z + to.z) / 2,
    })
  })

  it('places a wire whose halfway point falls inside a crossing hop on the drawn arc, not on its chord', () => {
    const { gate, a } = seed()
    const at = (x: number, z: number) => ({ x, y: WIRE_HEIGHT, z })
    const hop = getState().addWire(
      { type: 'input', entityId: a.id },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[1].id },
      [
        { start: at(-4, 6), end: at(-HOP_RADIUS, 6), type: 'horizontal' },
        generateHopArc(at(-HOP_RADIUS, 6), at(HOP_RADIUS, 6), at(0, 6), 'crossed-wire'),
        { start: at(HOP_RADIUS, 6), end: at(4, 6), type: 'horizontal' },
      ],
    )

    expectNear(entity(describeCircuitScene(getState()).entities, hop.id).world, { x: 0, y: HOP_HEIGHT, z: 6 })
  })

  it('follows the curve of a hop along z where the halfway point is off its centre', () => {
    const { gate, a } = seed()
    const at = (z: number) => ({ x: -3, y: WIRE_HEIGHT, z })
    // Lead-out is one hop radius shorter than lead-in, so the halfway point is a quarter into the hop.
    const lead = 4 - HOP_RADIUS
    const segments: WireSegment[] = [
      { start: at(6 - HOP_RADIUS - lead), end: at(6 - HOP_RADIUS), type: 'vertical' },
      generateHopArc(at(6 - HOP_RADIUS), at(6 + HOP_RADIUS), at(6), 'crossed-wire'),
      { start: at(6 + HOP_RADIUS), end: at(6 + lead), type: 'vertical' },
    ]
    const hop = getState().addWire(
      { type: 'input', entityId: a.id },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[1].id },
      segments,
    )

    // Wire3D draws a hop as a half-ellipse: at half its radius from the centre it has risen sin(60°).
    expectNear(entity(describeCircuitScene(getState()).entities, hop.id).world, {
      x: -3,
      y: WIRE_HEIGHT + (HOP_HEIGHT - WIRE_HEIGHT) * Math.sin(Math.PI / 3),
      z: 6 - HOP_RADIUS / 2,
    })
  })

  it('rounds coordinates to four decimals so goldens do not churn on float noise', () => {
    const { gate } = seed()

    const projected = projectSceneEntity(getState(), gate.id, () => ({ x: 1 / 3, y: -2 / 3, visible: true }))
    expect(projected?.screen).toEqual({ x: 0.3333, y: -0.6667 })
    for (const e of describeCircuitScene(getState()).entities) {
      for (const v of [e.world.x, e.world.y, e.world.z]) {
        expect(Math.round(v * 1e4) / 1e4).toBe(v)
      }
    }
  })

  it('is JSON-serialisable: a JSON round trip returns an equal description', () => {
    seed()
    const description = describeCircuitScene(getState())

    expect(description.schemaVersion).toBe(2)
    expect(description.entities.length).toBeGreaterThan(0)
    expect(JSON.parse(JSON.stringify(description))).toEqual(description)
  })
})
