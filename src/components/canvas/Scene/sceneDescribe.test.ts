import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useCircuitStore } from '@/store/circuitStore'
import { resetCircuitStore } from '@/test/r3f/seedCircuit'
import { calculateNodePinPosition } from '@/nodes/config'
import type { Position } from '@/store/types'
import { describeCircuitScene, type Projector, type SceneEntity } from './sceneDescribe'

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

  it('leaves screen and visible null without a projector, and takes both from one', () => {
    const { gate, a } = seed()

    for (const e of describeCircuitScene(getState()).entities) {
      expect(e.screen).toBeNull()
      expect(e.state.visible).toBeNull()
    }

    const project: Projector = (world) => ({ x: world.x * 10, y: world.z * 10, visible: world.x >= 0 })
    const { entities } = describeCircuitScene(getState(), project)
    expect(entity(entities, gate.id).screen).toEqual({ x: 20, y: 20 })
    expect(entity(entities, gate.id).state.visible).toBe(true)
    expect(entity(entities, a.id).state.visible).toBe(false)
  })

  it('never reports a wire the renderer cannot draw as visible, and places it between its endpoints', () => {
    const { gate, a } = seed()
    const bare = getState().addWire(
      { type: 'input', entityId: a.id },
      { type: 'gate', entityId: gate.id, pinId: gate.inputs[1].id },
      [],
    )
    const { entities } = describeCircuitScene(getState(), () => ({ x: 1, y: 1, visible: true }))

    const described = entity(entities, bare.id)
    expect(described.state.visible).toBe(false)
    const inputOffset = calculateNodePinPosition('input')
    const to = getState().getPinWorldPosition(gate.id, gate.inputs[1].id)
    if (!to) throw new Error('gate pin has no world position')
    const from = { x: a.position.x + inputOffset.x, y: 0.2, z: a.position.z + inputOffset.z }
    expectNear(described.world, {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
      z: (from.z + to.z) / 2,
    })
  })

  it('rounds coordinates to four decimals so goldens do not churn on float noise', () => {
    seed()
    const { entities } = describeCircuitScene(getState(), () => ({ x: 1 / 3, y: -2 / 3, visible: true }))

    expect(entities[0].screen).toEqual({ x: 0.3333, y: -0.6667 })
    for (const e of entities) {
      for (const v of [e.world.x, e.world.y, e.world.z]) {
        expect(Math.round(v * 1e4) / 1e4).toBe(v)
      }
    }
  })

  it('is JSON-serialisable: a JSON round trip returns an equal description', () => {
    seed()
    const description = describeCircuitScene(getState(), (w) => ({ x: w.x, y: w.z, visible: true }))

    expect(description.schemaVersion).toBe(1)
    expect(description.entities.length).toBeGreaterThan(0)
    expect(JSON.parse(JSON.stringify(description))).toEqual(description)
  })
})
