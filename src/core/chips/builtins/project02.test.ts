import { describe, expect, it } from 'vitest'
import { parseCmp } from '@/core/testing/cmpParser'
import { createChipRegistry } from '../registry'
import { isBuiltinChip, type ChipPin } from '../types'
import { registerProject2Builtins } from './project02'

const CMP = import.meta.glob<string>('../../../../conformance/vectors/02/{HalfAdder,FullAdder,Add16}.cmp', { query: '?raw', import: 'default', eager: true })
const official = (chip: string): string => CMP[`../../../../conformance/vectors/02/${chip}.cmp`]

const pin = (name: string, width = 1): ChipPin => ({ name, width })

// The web IDE's pins (simulator/src/chip/builtins/arithmetic/), in the order each official .tst lists them.
const PINS: Record<string, { inputs: ChipPin[]; outputs: ChipPin[] }> = {
  HalfAdder: { inputs: [pin('a'), pin('b')], outputs: [pin('sum'), pin('carry')] },
  FullAdder: { inputs: [pin('a'), pin('b'), pin('c')], outputs: [pin('sum'), pin('carry')] },
  Add16: { inputs: [pin('a', 16), pin('b', 16)], outputs: [pin('out', 16)] },
}

const registered = () => {
  const registry = createChipRegistry()
  registerProject2Builtins(registry)
  return registry
}

describe('registerProject2Builtins', () => {
  it("registers HalfAdder, FullAdder and Add16 on the web IDE's pins", () => {
    const chips = registered().list().map(({ name, inputs, outputs, implementation }) => ({ name, inputs, outputs, type: implementation.type }))
    expect(chips).toEqual(Object.entries(PINS).map(([name, pins]) => ({ name, ...pins, type: 'builtin' })))
  })

  // HalfAdder.cmp heads its carry column `car`, so a column is bound by its place, as the reference compares text.
  it.each(Object.keys(PINS))('%s agrees with every row of its official .cmp, read by column position', (name) => {
    const parsed = parseCmp(official(name))
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    const chip = registered().get(name)
    expect(chip?.implementation.type).toBe('builtin')
    if (!chip || !isBuiltinChip(chip)) return
    const { inputs, outputs } = PINS[name]
    expect(parsed.file.columns).toHaveLength(inputs.length + outputs.length)
    expect(parsed.file.rows.length).toBeGreaterThan(0)
    for (const [row, { values }] of parsed.file.rows.entries()) {
      const given = Object.fromEntries(inputs.map(({ name: input }, i) => [input, values[i]]))
      const expected = Object.fromEntries(outputs.map(({ name: output }, i) => [output, values[inputs.length + i]]))
      expect(chip.implementation.evaluate(given), `row ${row + 1}`).toEqual(expected)
    }
  })
})
