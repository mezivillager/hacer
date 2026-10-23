import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { getBuiltinChipRegistry, parseHDL, project2HdlSources } from '@/core'
import { project2Scenarios } from './project2'

const VECTORS = fileURLToPath(new URL('../../conformance/vectors/02/', import.meta.url))
const vendored = (file: string): string => readFileSync(path.join(VECTORS, file), 'utf8')
const CHIPS = ['HalfAdder', 'FullAdder', 'Add16']

describe('project2 scenarios', () => {
  it('project2/HalfAdder, project2/FullAdder and project2/Add16, parts first', () => {
    const scenarios = project2Scenarios()
    expect(scenarios.map((scenario) => scenario.name)).toEqual(CHIPS.map((chip) => `project2/${chip}`))
    expect(scenarios.map((scenario) => scenario.name)).toEqual(scenarios.map((scenario) => `project2/${scenario.chip}`))
  })

  it('.tst and .cmp are the vendored files; .hdl is project2HdlSources', () => {
    for (const { chip, hdl, tst, cmp } of project2Scenarios()) {
      expect(tst, chip).toBe(vendored(`${chip}.tst`))
      expect(cmp, chip).toBe(vendored(`${chip}.cmp`))
      expect(hdl, chip).toBe(project2HdlSources[chip])
    }
  })

  it("each .hdl is its vendored stub's chip, built from Project 1 chips and earlier Project 2 chips", () => {
    const project1 = getBuiltinChipRegistry().list().map((def) => def.name)
    for (const [index, { chip, hdl }] of project2Scenarios().entries()) {
      const ours = parseHDL(hdl)
      const stub = parseHDL(vendored(`${chip}.hdl`))
      expect(ours.success, chip).toBe(true)
      expect(stub.success, chip).toBe(true)
      if (!ours.success || !stub.success) return
      const { name, inputs, outputs, builtin, parts } = ours.chip
      expect({ name, inputs, outputs, builtin }, chip).toEqual({ name: stub.chip.name, inputs: stub.chip.inputs, outputs: stub.chip.outputs, builtin: undefined })
      expect(parts.length, chip).toBeGreaterThan(0)
      const allowed = [...project1, ...CHIPS.slice(0, index)]
      expect(parts.map((part) => part.name).filter((part) => !allowed.includes(part)), chip).toEqual([])
    }
  })
})
