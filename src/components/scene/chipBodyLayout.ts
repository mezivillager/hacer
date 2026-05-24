import type { ChipDefinition, ChipPin } from '@/core/chips/types'

export interface PinSlot {
  pinId: string
  pinName: string
  side: 'input' | 'output'
  /** Local-space position relative to the gate's center: [x, y, z]. */
  position: [number, number, number]
  width: number
  /** Index within its side (0-based, top-to-bottom along Z). */
  indexOnSide: number
}

export interface BodyDimensions {
  /** X-axis extent: input-to-output length. */
  width: number
  /** Y-axis extent: thickness above the ground plane. */
  height: number
  /** Z-axis extent: pin column length. */
  depth: number
}

export interface ChipLayout {
  bodyDimensions: BodyDimensions
  pinSlots: PinSlot[]
}

const MIN_WIDTH = 2.0
const HEIGHT = 0.4
const MIN_DEPTH = 1.5
const PIN_SPACING = 0.5
const PIN_OFFSET_X = 0.05
const EDGE_PADDING = 0.5

function pinSlotsForSide(
  pins: readonly ChipPin[],
  side: 'input' | 'output',
  halfBodyX: number,
  idPrefix: string,
): PinSlot[] {
  const count = pins.length
  if (count === 0) return []
  const span = (count - 1) * PIN_SPACING
  const startZ = -span / 2
  const xPos = side === 'input' ? -(halfBodyX + PIN_OFFSET_X) : (halfBodyX + PIN_OFFSET_X)
  return pins.map((p, i) => ({
    pinId: `${idPrefix}-${side === 'input' ? 'in' : 'out'}-${i}`,
    pinName: p.name,
    side,
    position: [xPos, 0, startZ + i * PIN_SPACING],
    width: p.width,
    indexOnSide: i,
  }))
}

/**
 * Computes the 3D layout for any chip definition.
 * Body grows along Z to accommodate the larger of input or output pin count.
 *
 * @param chip - The chip definition to lay out
 * @param idPrefix - Used to derive pin IDs; pass the gate instance id when rendering.
 *   Defaults to chip name for unit tests.
 */
export function computeChipLayout(
  chip: ChipDefinition,
  idPrefix: string = chip.name,
): ChipLayout {
  const maxPinsPerSide = Math.max(chip.inputs.length, chip.outputs.length, 1)
  const requiredDepth = 2 * EDGE_PADDING + Math.max(0, maxPinsPerSide - 1) * PIN_SPACING
  const depth = Math.max(MIN_DEPTH, requiredDepth)

  // Width scales modestly with pin count to keep chip-name label readable.
  const width = Math.max(MIN_WIDTH, MIN_WIDTH + 0.05 * maxPinsPerSide)

  const halfBodyX = width / 2
  const pinSlots: PinSlot[] = [
    ...pinSlotsForSide(chip.inputs, 'input', halfBodyX, idPrefix),
    ...pinSlotsForSide(chip.outputs, 'output', halfBodyX, idPrefix),
  ]

  return {
    bodyDimensions: { width, height: HEIGHT, depth },
    pinSlots,
  }
}
