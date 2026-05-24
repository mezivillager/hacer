import { describe, it, expect } from 'vitest'
import { computeChipLayout } from './chipBodyLayout'
import type { ChipDefinition } from '@/core/chips/types'

function defOf(
  name: string,
  inputs: Array<[string, number]>,
  outputs: Array<[string, number]>,
): ChipDefinition {
  return {
    name,
    inputs: inputs.map(([n, w]) => ({ name: n, width: w })),
    outputs: outputs.map(([n, w]) => ({ name: n, width: w })),
    implementation: { type: 'builtin', evaluate: () => ({}) },
  }
}

describe('computeChipLayout', () => {
  // The 3D body axis convention is documented in chipBodyLayout.ts:
  //   - sizeX (local X) → input-to-output direction
  //   - sizeY (local Y) → pin column length (becomes world Z after the
  //     standard [PI/2, 0, 0] rotation: pins lie on the ground plane,
  //     perpendicular to wiring direction)
  //   - sizeZ (local Z) → thickness (becomes world Y after rotation:
  //     the slim vertical height above the ground plane)
  //
  // These tests pin that contract so the gates stay flat after rotation.

  it('Not (1 input, 1 output): minimum body matches legacy AND/NAND scale', () => {
    const layout = computeChipLayout(defOf('Not', [['in', 1]], [['out', 1]]))
    expect(layout.bodyDimensions.sizeX).toBeGreaterThanOrEqual(1.0)
    expect(layout.bodyDimensions.sizeY).toBeGreaterThanOrEqual(0.8)
    expect(layout.bodyDimensions.sizeZ).toBeCloseTo(0.4)
    expect(layout.pinSlots).toHaveLength(2)
    const inSlot = layout.pinSlots.find((p) => p.pinName === 'in')
    const outSlot = layout.pinSlots.find((p) => p.pinName === 'out')
    expect(inSlot?.side).toBe('input')
    expect(outSlot?.side).toBe('output')
    expect(inSlot?.width).toBe(1)
  })

  it('pins are arranged along local Y (so they lie flat after [PI/2, 0, 0] rotation)', () => {
    const layout = computeChipLayout(defOf('Mux',
      [['a', 1], ['b', 1], ['sel', 1]],
      [['out', 1]]))
    expect(layout.pinSlots).toHaveLength(4)
    const inputs = layout.pinSlots.filter((p) => p.side === 'input')
    expect(inputs).toHaveLength(3)
    // Pins must vary along local Y, NOT local Z. After the gate's default
    // [PI/2, 0, 0] rotation, local Y maps to world Z (the ground-plane direction
    // perpendicular to wire flow). If pins varied along local Z instead they
    // would project upward into the air, making the chip render as a vertical
    // slab — see the bug fixed alongside this test.
    const ys = inputs.map((p) => p.position[1]).sort()
    expect(new Set(ys).size).toBe(3)
    expect(inputs.every((p) => p.position[2] === 0)).toBe(true)
  })

  it('Mux8Way16 (9 inputs, 1 output): body grows along local Y to fit pins', () => {
    const layout = computeChipLayout(defOf('Mux8Way16',
      [['a', 16], ['b', 16], ['c', 16], ['d', 16],
       ['e', 16], ['f', 16], ['g', 16], ['h', 16], ['sel', 3]],
      [['out', 16]]))
    expect(layout.pinSlots).toHaveLength(10)
    const inputs = layout.pinSlots.filter((p) => p.side === 'input')
    expect(inputs).toHaveLength(9)
    const notLayout = computeChipLayout(defOf('Not', [['in', 1]], [['out', 1]]))
    // Pin-column length lives on local Y now, not local Z.
    expect(layout.bodyDimensions.sizeY).toBeGreaterThan(notLayout.bodyDimensions.sizeY)
    // Thickness (local Z) stays constant regardless of pin count.
    expect(layout.bodyDimensions.sizeZ).toBeCloseTo(notLayout.bodyDimensions.sizeZ)
  })

  it('width labels propagate to pin slots', () => {
    const layout = computeChipLayout(defOf('Not16', [['in', 16]], [['out', 16]]))
    expect(layout.pinSlots.find((p) => p.pinName === 'in')?.width).toBe(16)
    expect(layout.pinSlots.find((p) => p.pinName === 'out')?.width).toBe(16)
  })

  it('outputs are placed on opposite side from inputs (local X)', () => {
    const layout = computeChipLayout(defOf('And', [['a', 1], ['b', 1]], [['out', 1]]))
    const inX = layout.pinSlots.find((p) => p.side === 'input')!.position[0]
    const outX = layout.pinSlots.find((p) => p.side === 'output')!.position[0]
    expect(Math.sign(inX)).not.toBe(Math.sign(outX))
  })

  it('pins fit inside the body along the pin-column axis (local Y)', () => {
    // Regression guard: each pin's Y must lie within +-(sizeY/2) of the body
    // center, otherwise pins would float past the chip's visible ends.
    const layout = computeChipLayout(defOf('Or8Way',
      [['a', 1], ['b', 1], ['c', 1], ['d', 1],
       ['e', 1], ['f', 1], ['g', 1], ['h', 1]],
      [['out', 1]]))
    const halfY = layout.bodyDimensions.sizeY / 2
    for (const slot of layout.pinSlots) {
      expect(Math.abs(slot.position[1])).toBeLessThanOrEqual(halfY + 1e-9)
    }
  })
})
