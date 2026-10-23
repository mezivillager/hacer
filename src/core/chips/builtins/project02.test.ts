import { describe, expect, it } from 'vitest'
import { hdlChipDefinition } from '@/core/hdl/compiler'
import { parseHDL } from '@/core/hdl/parser'
import { project2HdlSources } from '@/core/hdl/project2HdlSources'
import { parseCmp } from '@/core/testing/cmpParser'
import { evaluateChip } from '../evaluateChip'
import { createChipRegistry } from '../registry'
import { isBuiltinChip, type ChipPin } from '../types'
import { registerProject1Builtins } from './project01'
import { registerProject2Builtins } from './project02'

const CMP = import.meta.glob<string>('../../../../conformance/vectors/02/{HalfAdder,FullAdder,Add16,Inc16,ALU}.cmp', { query: '?raw', import: 'default', eager: true })
const official = (chip: string): string => CMP[`../../../../conformance/vectors/02/${chip}.cmp`]

const pin = (name: string, width = 1): ChipPin => ({ name, width })

// The web IDE's pins (simulator/src/chip/builtins/arithmetic/), in the order each official .tst lists them.
const PINS: Record<string, { inputs: ChipPin[]; outputs: ChipPin[] }> = {
  HalfAdder: { inputs: [pin('a'), pin('b')], outputs: [pin('sum'), pin('carry')] },
  FullAdder: { inputs: [pin('a'), pin('b'), pin('c')], outputs: [pin('sum'), pin('carry')] },
  Add16: { inputs: [pin('a', 16), pin('b', 16)], outputs: [pin('out', 16)] },
  Inc16: { inputs: [pin('in', 16)], outputs: [pin('out', 16)] },
  ALU: {
    inputs: [pin('x', 16), pin('y', 16), pin('zx'), pin('nx'), pin('zy'), pin('ny'), pin('f'), pin('no')],
    outputs: [pin('out', 16), pin('zr'), pin('ng')],
  },
}

const registered = () => {
  const registry = createChipRegistry()
  registerProject2Builtins(registry)
  return registry
}

describe('registerProject2Builtins', () => {
  it("registers HalfAdder, FullAdder, Add16, Inc16 and ALU on the web IDE's pins", () => {
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

  // The official vectors use 18 of the 64 words, where the web IDE's 18-word table and the bitwise definition agree.
  it("the ALU builtin agrees with HACER's ALU HDL on all 64 control words", () => {
    const registry = createChipRegistry()
    registerProject1Builtins(registry)
    registerProject2Builtins(registry)
    const builtin = registry.get('ALU')
    expect(builtin?.implementation.type).toBe('builtin')
    const ast = parseHDL(project2HdlSources.ALU)
    expect(ast.success).toBe(true)
    if (!builtin || !isBuiltinChip(builtin) || !ast.success) return
    const hdl = hdlChipDefinition(ast.chip, project2HdlSources.ALU)

    const grid = [0, 1, 2, 3, 17, 0x00ff, 0x5555, 0x7fff, 0x8000, 0xaaaa, 0xff00, 0xfffe, 0xffff]
    const control = ['zx', 'nx', 'zy', 'ny', 'f', 'no']
    const differs: string[] = []
    for (let word = 0; word < 64; word++) {
      const bits = Object.fromEntries(control.map((name, i) => [name, (word >> (5 - i)) & 1]))
      for (const x of grid) {
        for (const y of grid) {
          const inputs = { x, y, ...bits }
          const want = evaluateChip(hdl, inputs, registry)
          const got = builtin.implementation.evaluate(inputs)
          if (JSON.stringify(got) !== JSON.stringify(want)) differs.push(`word ${word.toString(2).padStart(6, '0')} x=${x} y=${y}: HDL ${JSON.stringify(want)}, builtin ${JSON.stringify(got)}`)
        }
      }
    }
    expect(differs.slice(0, 5)).toEqual([])
  })
})
