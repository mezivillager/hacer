import type { BusComponent, Pin } from '@/store/types'

/**
 * One bus pin's local-space slot. Unlike chipBodyLayout (which spreads pins
 * along local Y and relies on the gate's [π/2,0,0] render rotation), bus
 * components render like nodes (no extra render rotation), so pins are spread
 * along local Z (the ground plane) directly: input side on -x, output side on
 * +x. Rendered pins, getPinWorldPosition, and deriveWire3DProps therefore all
 * share one identity-rotation transform and cannot drift.
 */
export interface BusPinSlot {
  pinId: string
  side: 'input' | 'output'
  /** Local position relative to component center: [x, y, z]. */
  position: [number, number, number]
}

const BUS_HALF_X = 0.4
const BUS_PIN_OFFSET_X = 0.05
const BUS_PIN_SPACING = 0.4
const BUS_THICKNESS_Y = 0.4
const BUS_MIN_DEPTH_Z = 0.5
const BUS_EDGE_PADDING_Z = 0.2

function sideSlots(pins: Pin[], side: 'input' | 'output'): BusPinSlot[] {
  const count = pins.length
  if (count === 0) return []
  const span = (count - 1) * BUS_PIN_SPACING
  const startZ = -span / 2
  const xPos = side === 'input' ? -(BUS_HALF_X + BUS_PIN_OFFSET_X) : BUS_HALF_X + BUS_PIN_OFFSET_X
  return pins.map((p, i) => ({
    pinId: p.id,
    side,
    position: [xPos, 0, startZ + i * BUS_PIN_SPACING] as [number, number, number],
  }))
}

/** Pin slots for a bus component: input side then output side. */
export function computeBusPinLayout(component: BusComponent): BusPinSlot[] {
  return [
    ...sideSlots(component.inputs, 'input'),
    ...sideSlots(component.outputs, 'output'),
  ]
}

/** Body box dimensions; depth (Z) grows with the larger pin count. */
export function computeBusBodyDimensions(
  component: BusComponent,
): { sizeX: number; sizeY: number; sizeZ: number } {
  const maxPins = Math.max(component.inputs.length, component.outputs.length, 1)
  const requiredDepth = 2 * BUS_EDGE_PADDING_Z + Math.max(0, maxPins - 1) * BUS_PIN_SPACING
  return {
    sizeX: 2 * BUS_HALF_X,
    sizeY: BUS_THICKNESS_Y,
    sizeZ: Math.max(BUS_MIN_DEPTH_Z, requiredDepth),
  }
}
