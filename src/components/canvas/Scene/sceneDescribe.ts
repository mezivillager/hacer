import type { Camera } from 'three'
import type { CircuitStore, Position } from '@/store/types'

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
  /** `null` when nothing projected it. */
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

/** Maps a world position to the canvas; supplied only where a camera exists. */
export type Projector = (world: Position) => CanvasProjection

/**
 * Projects a world position through `camera` onto a canvas occupying `rect`.
 * Not implemented yet.
 */
export function projectToCanvas(_camera: Camera, _rect: CanvasRect, _world: Position): CanvasProjection {
  return { x: Number.NaN, y: Number.NaN, visible: false }
}

/**
 * Describes every gate, pin, wire and node in the store as JSON-serialisable data.
 * Not implemented yet.
 */
export function describeCircuitScene(_state: CircuitStore, _project?: Projector): SceneDescription {
  return { schemaVersion: SCENE_DESCRIPTION_SCHEMA_VERSION, entities: [] }
}
