import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { project1HdlSources } from '@/core'
import { project1Scenarios } from './project1'

const VECTORS = fileURLToPath(new URL('../../conformance/vectors/01/', import.meta.url))
const vendored = (file: string): string => readFileSync(path.join(VECTORS, file), 'utf8')

describe('project1 scenarios', () => {
  it('one per vendored chip: project1/Nand, then project1DependencyOrder', () => {
    const scenarios = project1Scenarios()
    // project1DependencyOrder, which @/core does not export.
    const order = ['Not', 'And', 'Or', 'Xor', 'Mux', 'DMux', 'Not16', 'And16', 'Or16', 'Mux16', 'Or8Way', 'Mux4Way16', 'Mux8Way16', 'DMux4Way', 'DMux8Way']
    expect(scenarios.map((scenario) => scenario.name)).toEqual(['Nand', ...order].map((chip) => `project1/${chip}`))
    expect(scenarios.map((scenario) => scenario.name)).toEqual(scenarios.map((scenario) => `project1/${scenario.chip}`))
    const hdlFiles = readdirSync(VECTORS)
      .filter((file) => file.endsWith('.hdl'))
      .map((file) => file.slice(0, -'.hdl'.length))
    expect(hdlFiles).toHaveLength(16)
    expect(new Set(scenarios.map((scenario) => scenario.chip))).toEqual(new Set(hdlFiles))
  })

  it(".tst and .cmp are the vendored files; .hdl is project1HdlSources, except Nand's vendored BUILTIN Nand;", () => {
    for (const { chip, hdl, tst, cmp } of project1Scenarios()) {
      expect(tst, chip).toBe(vendored(`${chip}.tst`))
      expect(cmp, chip).toBe(vendored(`${chip}.cmp`))
      expect(hdl, chip).toBe(chip === 'Nand' ? vendored('Nand.hdl') : project1HdlSources[chip])
    }
    expect(vendored('Nand.hdl')).toMatch(/^\s*BUILTIN Nand;$/m)
  })
})
