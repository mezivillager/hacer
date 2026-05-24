import { describe, it, expect, beforeEach } from 'vitest'
import { createChipRegistry } from '../registry'
import { isBuiltinChip } from '../types'
import type { ChipRegistry } from '../registry'
import { registerProject1Builtins } from './project01'
import { parseCmp } from '@/core/testing/cmpParser'
import { project1CmpFixtures } from '@/core/testing/project1CmpFixtures'

const CHIP_NAMES = [
  'Nand', 'Not', 'And', 'Or', 'Xor', 'Mux', 'DMux',
  'Not16', 'And16', 'Or16', 'Mux16',
  'Or8Way', 'Mux4Way16', 'Mux8Way16', 'DMux4Way', 'DMux8Way',
] as const

const PIN_SCHEMA: Record<typeof CHIP_NAMES[number], { inputs: string[]; outputs: string[] }> = {
  Nand:       { inputs: ['a', 'b'], outputs: ['out'] },
  Not:        { inputs: ['in'], outputs: ['out'] },
  And:        { inputs: ['a', 'b'], outputs: ['out'] },
  Or:         { inputs: ['a', 'b'], outputs: ['out'] },
  Xor:        { inputs: ['a', 'b'], outputs: ['out'] },
  Mux:        { inputs: ['a', 'b', 'sel'], outputs: ['out'] },
  DMux:       { inputs: ['in', 'sel'], outputs: ['a', 'b'] },
  Not16:      { inputs: ['in'], outputs: ['out'] },
  And16:      { inputs: ['a', 'b'], outputs: ['out'] },
  Or16:       { inputs: ['a', 'b'], outputs: ['out'] },
  Mux16:      { inputs: ['a', 'b', 'sel'], outputs: ['out'] },
  Or8Way:     { inputs: ['in'], outputs: ['out'] },
  Mux4Way16:  { inputs: ['a', 'b', 'c', 'd', 'sel'], outputs: ['out'] },
  Mux8Way16:  { inputs: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'sel'], outputs: ['out'] },
  DMux4Way:   { inputs: ['in', 'sel'], outputs: ['a', 'b', 'c', 'd'] },
  DMux8Way:   { inputs: ['in', 'sel'], outputs: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] },
}

let registry: ChipRegistry

beforeEach(() => {
  registry = createChipRegistry()
  registerProject1Builtins(registry)
})

describe('registerProject1Builtins', () => {
  it('registers all 16 chips', () => {
    expect(registry.list()).toHaveLength(16)
  })
  for (const name of CHIP_NAMES) {
    it(`registers ${name}`, () => {
      expect(registry.has(name)).toBe(true)
    })
  }
})

describe('every builtin matches its .cmp fixture row-for-row', () => {
  for (const name of CHIP_NAMES) {
    it(`${name}: all rows match`, () => {
      const parsed = parseCmp(project1CmpFixtures[name])
      expect(parsed.success).toBe(true)
      if (!parsed.success) return

      const chip = registry.get(name)
      expect(chip).toBeDefined()
      if (!chip || !isBuiltinChip(chip)) {
        throw new Error(`${name} is not a registered builtin`)
      }

      const schema = PIN_SCHEMA[name]
      const colIndex = (colName: string): number =>
        parsed.file.columns.findIndex((c) => c.name === colName)

      for (let r = 0; r < parsed.file.rows.length; r++) {
        const row = parsed.file.rows[r]
        const inputs = Object.fromEntries(
          schema.inputs.map((p) => [p, row.values[colIndex(p)]])
        )
        const expected = Object.fromEntries(
          schema.outputs.map((p) => [p, row.values[colIndex(p)]])
        )
        expect(chip.implementation.evaluate(inputs), `row ${r}`).toEqual(expected)
      }
    })
  }
})

describe('idempotency', () => {
  it('does not throw when called twice', () => {
    expect(() => registerProject1Builtins(registry)).not.toThrow()
    expect(registry.list()).toHaveLength(16)
  })
})
