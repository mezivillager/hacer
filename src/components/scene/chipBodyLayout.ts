import type { ChipDefinition, ChipPin } from '@/core/chips/types'

/**
 * Slot describing where a single pin should sit on the body and what it
 * represents. All positions are in **local** space relative to the gate's
 * center; the gate group is rotated by `[PI/2, 0, 0]` at render time, which
 * remaps local axes as documented on {@link BodyDimensions}.
 */
export interface PinSlot {
  pinId: string
  pinName: string
  side: 'input' | 'output'
  /** Local-space position relative to the gate's center: [x, y, z]. */
  position: [number, number, number]
  width: number
  /** Index within its side (0-based, ascending along local Y). */
  indexOnSide: number
}

/**
 * Body box dimensions in the gate's **local** coordinate space.
 *
 * After the gate's default rotation of `[PI/2, 0, 0]`:
 * - local X  →  world X  — input-to-output direction (wire flow)
 * - local Y  →  world Z  — pin column on the ground plane
 * - local Z  →  world Y  — thickness above the ground plane
 *
 * Concretely: a chip box of `(sizeX = 1.0, sizeY = 0.8, sizeZ = 0.4)` ends up
 * lying flat as a 1.0 (wide) x 0.4 (tall) x 0.8 (deep) board after rotation,
 * matching the legacy AND/NAND gate footprint.
 */
export interface BodyDimensions {
  /** Local X extent: input-to-output direction. */
  sizeX: number
  /** Local Y extent: pin column length (becomes ground-plane depth after rotation). */
  sizeY: number
  /** Local Z extent: body thickness (becomes vertical height after rotation). */
  sizeZ: number
}

export interface ChipLayout {
  bodyDimensions: BodyDimensions
  pinSlots: PinSlot[]
}

// Dimensions calibrated to the legacy AND/NAND footprint (1.0 x 0.8 x 0.4) so
// that 1-pin-per-side chips render at the same scale as the original gates.
const MIN_SIZE_X = 1.0
const MIN_SIZE_Y = 0.8
const THICKNESS = 0.4
const PIN_SPACING = 0.4
const PIN_OFFSET_X = 0.05
const EDGE_PADDING = 0.2
// Modest growth in X with pin count so the chip-name label stays readable for
// wide multi-way chips without ballooning 2-input gates.
const SIZE_X_GROWTH_PER_PIN = 0.05

function pinSlotsForSide(
  pins: readonly ChipPin[],
  side: 'input' | 'output',
  halfBodyX: number,
  idPrefix: string,
): PinSlot[] {
  const count = pins.length
  if (count === 0) return []
  const span = (count - 1) * PIN_SPACING
  const startY = -span / 2
  const xPos = side === 'input' ? -(halfBodyX + PIN_OFFSET_X) : (halfBodyX + PIN_OFFSET_X)
  return pins.map((p, i) => ({
    pinId: `${idPrefix}-${side === 'input' ? 'in' : 'out'}-${i}`,
    pinName: p.name,
    side,
    position: [xPos, startY + i * PIN_SPACING, 0],
    width: p.width,
    indexOnSide: i,
  }))
}

/**
 * Computes the 3D body layout for any chip definition. The body grows along
 * local Y (the pin-column axis) to fit the larger of input or output pin
 * counts, while local X grows modestly to keep the chip-name label legible.
 * Thickness (local Z) is constant.
 *
 * @param chip - Chip definition to lay out
 * @param idPrefix - Used to derive pin IDs; pass the gate instance id when
 *   rendering. Defaults to the chip name for unit tests.
 */
export function computeChipLayout(
  chip: ChipDefinition,
  idPrefix: string = chip.name,
): ChipLayout {
  const maxPinsPerSide = Math.max(chip.inputs.length, chip.outputs.length, 1)
  const requiredSizeY = 2 * EDGE_PADDING + Math.max(0, maxPinsPerSide - 1) * PIN_SPACING
  const sizeY = Math.max(MIN_SIZE_Y, requiredSizeY)
  const sizeX = MIN_SIZE_X + SIZE_X_GROWTH_PER_PIN * maxPinsPerSide

  const halfBodyX = sizeX / 2
  const pinSlots: PinSlot[] = [
    ...pinSlotsForSide(chip.inputs, 'input', halfBodyX, idPrefix),
    ...pinSlotsForSide(chip.outputs, 'output', halfBodyX, idPrefix),
  ]

  return {
    bodyDimensions: { sizeX, sizeY, sizeZ: THICKNESS },
    pinSlots,
  }
}
