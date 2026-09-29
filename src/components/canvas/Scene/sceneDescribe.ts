import { Vector3, type Camera } from 'three'
import type { CircuitStore, InputNode, OutputNode, Pin, Position } from '@/store/types'
import type { WireSegment } from '@/utils/wiringScheme/types'
import { calculateNodePinPosition } from '@/nodes/config'
import { getSignalSourceValue } from '@/simulation/topologicalEval'
import { deriveWire3DProps } from '../deriveWire3DProps'

/** Bumped whenever the shape of {@link SceneDescription} changes. */
export const SCENE_DESCRIPTION_SCHEMA_VERSION = 1

/** What a described entity is. `input` / `output` are the circuit's I/O nodes. */
export type SceneEntityKind = 'gate' | 'bus' | 'input' | 'output' | 'junction' | 'pin' | 'wire'

/** A point in CSS pixels, in the same space as `DOMRect` and pointer events. */
export interface ScreenPoint {
  x: number
  y: number
}

export interface SceneEntityState {
  /** In front of the camera and inside the canvas; `null` when nothing projected it. */
  visible: boolean | null
  /** Selected as the app shows it. Pins and junctions cannot be selected. */
  selected: boolean
  /** The value the scene draws; `null` for gates and buses, whose values sit on their pins. */
  signal: number | null
}

export interface SceneEntity {
  /** Store id; a pin's id is `<ownerId>:<pin name>`, since bus pin ids repeat across buses. */
  id: string
  kind: SceneEntityKind
  /** The gate, bus or I/O node a pin belongs to; `null` for everything else. */
  ownerId: string | null
  /** Chip name, pin name or I/O node name; `null` for junctions and wires. */
  name: string | null
  /** The store's pin id, which wire endpoints reference; `null` for non-pins and I/O-node pins. */
  pinId: string | null
  world: Position
  /** `null` when nothing projected it, or it projects to no finite point. */
  screen: ScreenPoint | null
  state: SceneEntityState
}

export interface SceneDescription {
  schemaVersion: typeof SCENE_DESCRIPTION_SCHEMA_VERSION
  entities: SceneEntity[]
}

export interface CanvasRect {
  left: number
  top: number
  width: number
  height: number
}

export interface CanvasProjection extends ScreenPoint {
  visible: boolean
}

export interface SceneProjection {
  screen: ScreenPoint | null
  visible: boolean
}

export function projectSceneEntity(_state: CircuitStore, _id: string, _project: Projector): SceneProjection | null {
  return null
}

/** Maps a world position to the canvas; supplied only where a camera exists. */
export type Projector = (world: Position) => CanvasProjection

/**
 * Projects a world position through `camera` onto a canvas occupying `rect`. `visible` means
 * inside the view frustum: on the canvas, in front of the camera, between its near and far planes.
 */
export function projectToCanvas(camera: Camera, rect: CanvasRect, world: Position): CanvasProjection {
  const ndc = new Vector3(world.x, world.y, world.z).project(camera)
  return {
    x: ((ndc.x + 1) / 2) * rect.width + rect.left,
    y: ((1 - ndc.y) / 2) * rect.height + rect.top,
    visible: Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && Math.abs(ndc.z) <= 1,
  }
}

/** Four decimals keeps goldens stable across float noise; `-0` folds to `0`, which JSON keeps. */
function round(value: number): number {
  const rounded = Math.round(value * 1e4) / 1e4
  return rounded === 0 ? 0 : rounded
}

function roundPoint(p: Position): Position {
  return { x: round(p.x), y: round(p.y), z: round(p.z) }
}

interface EntityFacts {
  id: string
  kind: SceneEntityKind
  ownerId?: string
  name?: string
  pinId?: string
  world: Position
  selected?: boolean
  signal: number | null
  /** False for what the renderer skips, so no projection can report it visible. */
  drawn?: boolean
}

function toEntity(facts: EntityFacts, project: Projector | undefined): SceneEntity {
  const projected = project?.(facts.world)
  const onCanvas = projected !== undefined && Number.isFinite(projected.x) && Number.isFinite(projected.y)
  return {
    id: facts.id,
    kind: facts.kind,
    ownerId: facts.ownerId ?? null,
    name: facts.name ?? null,
    pinId: facts.pinId ?? null,
    world: roundPoint(facts.world),
    screen: onCanvas ? { x: round(projected.x), y: round(projected.y) } : null,
    state: {
      visible: projected === undefined ? null : onCanvas && projected.visible && (facts.drawn ?? true),
      selected: facts.selected ?? false,
      signal: facts.signal,
    },
  }
}

/** Pins at the position the store resolves for them, the one ChipBody3D draws them at. */
function pinFacts(state: CircuitStore, ownerId: string, pins: Pin[]): EntityFacts[] {
  return pins.flatMap((pin) => {
    const world = state.getPinWorldPosition(ownerId, pin.id)
    if (!world) return []
    const id = `${ownerId}:${pin.name}`
    return [{ id, kind: 'pin' as const, ownerId, name: pin.name, pinId: pin.id, world, signal: pin.value }]
  })
}

function nodePinFacts(node: InputNode | OutputNode, type: 'input' | 'output'): EntityFacts {
  const offset = calculateNodePinPosition(type)
  const { position } = node
  return {
    id: `${node.id}:${node.name}`,
    kind: 'pin',
    ownerId: node.id,
    name: node.name,
    world: { x: position.x + offset.x, y: position.y + offset.y, z: position.z + offset.z },
    signal: node.value,
  }
}

function lerp(a: Position, b: Position, t: number): Position {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }
}

/** The point half the path length along the segments; `null` when there are none. */
function halfwayAlong(segments: WireSegment[]): Position | null {
  const lengths = segments.map((s) => Math.hypot(s.end.x - s.start.x, s.end.y - s.start.y, s.end.z - s.start.z))
  let remaining = lengths.reduce((sum, length) => sum + length, 0) / 2
  for (const [i, segment] of segments.entries()) {
    const length = lengths[i]
    if (remaining <= length) return lerp(segment.start, segment.end, length === 0 ? 0 : remaining / length)
    remaining -= length
  }
  return segments.length > 0 ? segments[segments.length - 1].end : null
}

/**
 * Describes every gate, bus, I/O node, junction, pin and wire in the store as JSON-serialisable
 * data, in store order with each owner's pins after it. Signals follow what CanvasArea draws:
 * wires and junctions read 0 while the simulation is stopped. Reads the store, never writes it.
 * A wire with no segments and an unresolvable endpoint has no position and is left out.
 *
 * @param project - maps world positions to the canvas; without it `screen` and `visible` are null
 */
export function describeCircuitScene(state: CircuitStore, project?: Projector): SceneDescription {
  const running = state.simulationRunning
  const facts: EntityFacts[] = []

  for (const gate of state.gates) {
    const { id, chipName: name, position: world, selected } = gate
    facts.push({ id, kind: 'gate', name, world, selected, signal: null })
    facts.push(...pinFacts(state, gate.id, [...gate.inputs, ...gate.outputs]))
  }
  for (const bus of state.busComponents) {
    const selected = state.selectedBusId === bus.id
    facts.push({ id: bus.id, kind: 'bus', name: bus.kind, world: bus.position, selected, signal: null })
    facts.push(...pinFacts(state, bus.id, [...bus.inputs, ...bus.outputs]))
  }
  for (const [kind, nodes] of [['input', state.inputNodes], ['output', state.outputNodes]] as const) {
    for (const node of nodes) {
      const selected = state.selectedNodeId === node.id
      facts.push({ id: node.id, kind, name: node.name, world: node.position, selected, signal: node.value })
      facts.push(nodePinFacts(node, kind))
    }
  }
  for (const junction of state.junctions) {
    const signal = running ? getSignalSourceValue({ type: 'junction', entityId: junction.id }, state) : 0
    facts.push({ id: junction.id, kind: 'junction', world: junction.position, signal })
  }
  for (const wire of state.wires) {
    const { start, end } = deriveWire3DProps(wire, state)
    const world = halfwayAlong(wire.segments) ?? (start && end ? lerp(start, end, 0.5) : null)
    if (!world) continue
    facts.push({
      id: wire.id,
      kind: 'wire',
      world,
      selected: state.selectedWireId === wire.id,
      signal: running ? getSignalSourceValue(wire.from, state) : 0,
      // Wire3D draws nothing without both endpoints, and only the stored segments.
      drawn: start !== null && end !== null && wire.segments.length > 0,
    })
  }

  return { schemaVersion: SCENE_DESCRIPTION_SCHEMA_VERSION, entities: facts.map((f) => toEntity(f, project)) }
}
