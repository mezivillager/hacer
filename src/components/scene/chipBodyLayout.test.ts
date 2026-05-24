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
  it('Not (1 input, 1 output): minimum body size', () => {
    const layout = computeChipLayout(defOf('Not', [['in', 1]], [['out', 1]]))
    expect(layout.bodyDimensions.width).toBeGreaterThanOrEqual(2)
    expect(layout.pinSlots).toHaveLength(2)
    const inSlot = layout.pinSlots.find((p) => p.pinName === 'in')
    const outSlot = layout.pinSlots.find((p) => p.pinName === 'out')
    expect(inSlot?.side).toBe('input')
    expect(outSlot?.side).toBe('output')
    expect(inSlot?.width).toBe(1)
  })

  it('Mux (3 inputs, 1 output): inputs spaced along the input edge', () => {
    const layout = computeChipLayout(defOf('Mux',
      [['a', 1], ['b', 1], ['sel', 1]],
      [['out', 1]]))
    expect(layout.pinSlots).toHaveLength(4)
    const inputs = layout.pinSlots.filter((p) => p.side === 'input')
    expect(inputs).toHaveLength(3)
    const zs = inputs.map((p) => p.position[2]).sort()
    expect(new Set(zs).size).toBe(3)
  })

  it('Mux8Way16 (9 inputs, 1 output): body grows to accommodate', () => {
    const layout = computeChipLayout(defOf('Mux8Way16',
      [['a', 16], ['b', 16], ['c', 16], ['d', 16],
       ['e', 16], ['f', 16], ['g', 16], ['h', 16], ['sel', 3]],
      [['out', 16]]))
    expect(layout.pinSlots).toHaveLength(10)
    const inputs = layout.pinSlots.filter((p) => p.side === 'input')
    expect(inputs).toHaveLength(9)
    const notLayout = computeChipLayout(defOf('Not', [['in', 1]], [['out', 1]]))
    expect(layout.bodyDimensions.depth).toBeGreaterThan(notLayout.bodyDimensions.depth)
  })

  it('width labels propagate to pin slots', () => {
    const layout = computeChipLayout(defOf('Not16', [['in', 16]], [['out', 16]]))
    expect(layout.pinSlots.find((p) => p.pinName === 'in')?.width).toBe(16)
    expect(layout.pinSlots.find((p) => p.pinName === 'out')?.width).toBe(16)
  })

  it('outputs are placed on opposite side from inputs', () => {
    const layout = computeChipLayout(defOf('And', [['a', 1], ['b', 1]], [['out', 1]]))
    const inX = layout.pinSlots.find((p) => p.side === 'input')!.position[0]
    const outX = layout.pinSlots.find((p) => p.side === 'output')!.position[0]
    expect(Math.sign(inX)).not.toBe(Math.sign(outX))
  })
})
