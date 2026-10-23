import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { getBuiltinChipRegistry, parseHDL, project2HdlSources } from '@/core'
import { project2Scenarios } from './project2'

const VECTORS = fileURLToPath(new URL('../../conformance/vectors/02/', import.meta.url))
const vendored = (file: string): string => readFileSync(path.join(VECTORS, file), 'utf8')
const CHIPS = ['HalfAdder', 'FullAdder', 'Add16', 'Inc16', 'ALU']
const SCRIPTS = [...CHIPS, 'ALU-basic']
const scriptOf = (name: string): string => name.replace(/^project2\//, '')

describe('project2 scenarios', () => {
  it('one per vendored .tst, parts first: six scripts over five chips', () => {
    const scenarios = project2Scenarios()
    expect(scenarios.map((scenario) => scenario.name)).toEqual(SCRIPTS.map((script) => `project2/${script}`))
    const tsts = readdirSync(VECTORS).filter((file) => file.endsWith('.tst')).map((file) => file.slice(0, -'.tst'.length))
    expect([...SCRIPTS].sort()).toEqual(tsts.sort())
    expect(scenarios.map((scenario) => scenario.chip)).toEqual([...CHIPS, 'ALU'])
  })

  it('each scenario is the chip its .tst loads', () => {
    for (const { name, chip, tst } of project2Scenarios()) {
      expect(tst.match(/^load (\S+)\.hdl,/m)?.[1], name).toBe(chip)
    }
  })

  it('.tst and .cmp are the vendored files of the script; .hdl is project2HdlSources', () => {
    for (const { name, chip, hdl, tst, cmp } of project2Scenarios()) {
      expect(tst, name).toBe(vendored(`${scriptOf(name)}.tst`))
      expect(cmp, name).toBe(vendored(`${scriptOf(name)}.cmp`))
      expect(hdl, name).toBe(project2HdlSources[chip])
    }
  })

  it("each .hdl is its vendored stub's chip, built from Project 1 chips and earlier Project 2 chips", () => {
    const project1 = getBuiltinChipRegistry().list().map((def) => def.name)
    expect(Object.keys(project2HdlSources)).toEqual(CHIPS)
    for (const [index, chip] of CHIPS.entries()) {
      const ours = parseHDL(project2HdlSources[chip])
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
