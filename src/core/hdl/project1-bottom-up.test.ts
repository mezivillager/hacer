// src/core/hdl/project1-bottom-up.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createChipRegistry, registerBuiltin } from '../chips/registry'
import type { ChipRegistry } from '../chips/registry'
import { evaluateChip } from '../chips/evaluateChip'
import { getBuiltinChipRegistry } from '../chips/appRegistry'
import { parseHDL } from './parser'
import { hdlChipDefinition } from './compiler'
import { project1HdlSources, project1DependencyOrder } from './project1HdlSources'

// Build a registry that contains Nand (builtin) + each Project-1 chip registered as hdl,
// in dependency order, so later chips can resolve earlier ones.
function buildHdlRegistry(): ChipRegistry {
  const reg = createChipRegistry()
  registerBuiltin(reg, 'Nand',
    [{ name: 'a', width: 1 }, { name: 'b', width: 1 }],
    [{ name: 'out', width: 1 }],
    (i) => ({ out: ~(i.a & i.b) & 1 }))
  for (const name of project1DependencyOrder) {
    const src = project1HdlSources[name]
    const parsed = parseHDL(src)
    if (!parsed.success) throw new Error(`fixture ${name} failed to parse: ${parsed.errors.map((e) => e.message).join('; ')}`)
    reg.register(hdlChipDefinition(parsed.chip, src))
  }
  return reg
}

// Exhaustive vectors for small chips; discriminating vectors for wide ones.
function inputVectors(inputs: { name: string; width: number }[]): Record<string, number>[] {
  const totalBits = inputs.reduce((s, p) => s + p.width, 0)
  if (totalBits <= 8) {
    const combos: Record<string, number>[] = []
    for (let mask = 0; mask < 1 << totalBits; mask++) {
      const v: Record<string, number> = {}
      let bit = 0
      for (const p of inputs) {
        v[p.name] = (mask >> bit) & ((1 << p.width) - 1)
        bit += p.width
      }
      combos.push(v)
    }
    return combos
  }

  // Wide path: split pins into narrow (width <= 4, e.g. sel) and wide (e.g. 16-bit data).
  // Strategy:
  //   1. Enumerate ALL values for each narrow pin (full cross-product) — this sweeps sel fully.
  //   2. For each narrow combination, emit several data assignments where every wide pin
  //      receives a DISTINCT value (pin-index–shifted from a pattern set), so a != b != c …
  //      This makes sel routing observable: the selected output differs by sel value.
  const narrowPins = inputs.filter((p) => p.width <= 4)
  const widePins = inputs.filter((p) => p.width > 4)

  // Eight visually distinct 16-bit patterns — enough to assign each of up to 8 data ports uniquely.
  const DATA_PATTERNS = [0x0000, 0xffff, 0xaaaa, 0x5555, 0x1234, 0x8001, 0x3c3c, 0xc3c3]

  // Build cross-product of all narrow-pin values.
  const narrowCombos: Record<string, number>[] = [{}]
  for (const p of narrowPins) {
    const maxVal = (1 << p.width) - 1
    const expanded: Record<string, number>[] = []
    for (const existing of narrowCombos) {
      for (let v = 0; v <= maxVal; v++) {
        expanded.push({ ...existing, [p.name]: v })
      }
    }
    narrowCombos.length = 0
    narrowCombos.push(...expanded)
  }

  // For each narrow combo, emit one vector per "pattern offset" so consecutive wide pins differ.
  // patternOffset shifts which DATA_PATTERN each wide pin starts from — producing distinct
  // per-pin values across offsets and guaranteeing a != b across the whole vector set.
  const NUM_OFFSETS = DATA_PATTERNS.length // 8 offsets → 8 data assignments per narrow combo
  const combos: Record<string, number>[] = []
  for (const narrowCombo of narrowCombos) {
    for (let offset = 0; offset < NUM_OFFSETS; offset++) {
      const v: Record<string, number> = { ...narrowCombo }
      for (let i = 0; i < widePins.length; i++) {
        const p = widePins[i]
        const mask = (1 << Math.min(p.width, 16)) - 1
        // Each wide pin i gets a pattern shifted by (i + offset) so pins are distinguishable.
        v[p.name] = DATA_PATTERNS[(i + offset) % DATA_PATTERNS.length] & mask
      }
      combos.push(v)
    }
  }
  return combos
}

describe('Project-1 bottom-up from NAND', () => {
  let hdlReg: ChipRegistry
  let builtinReg: ChipRegistry
  beforeAll(() => {
    hdlReg = buildHdlRegistry()
    builtinReg = getBuiltinChipRegistry() // 16 Project-1 builtins (the reference)
  })

  for (const name of project1DependencyOrder) {
    it(`${name} compiled-from-HDL matches the builtin reference`, () => {
      const hdlChip = hdlReg.get(name)!
      expect(hdlChip).toBeTruthy()
      const ref = builtinReg.get(name)!
      expect(ref).toBeTruthy()
      for (const inputs of inputVectors(ref.inputs)) {
        const got = evaluateChip(hdlChip, inputs, hdlReg)
        const want = evaluateChip(ref, inputs, builtinReg)
        expect({ name, inputs, got }).toEqual({ name, inputs, got: want })
      }
    })
  }
})
