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

// Exhaustive vectors for small chips; representative vectors for wide ones.
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
  // wide: a handful of representative vectors
  const samples = [0, 1, 0xffff, 0xaaaa, 0x5555, 0x1234, 0x8001]
  const combos: Record<string, number>[] = []
  for (const s of samples) {
    const v: Record<string, number> = {}
    for (const p of inputs) v[p.name] = s & ((1 << Math.min(p.width, 31)) - 1 || 0xffff)
    combos.push(v)
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
