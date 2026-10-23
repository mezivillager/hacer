/** Project 2's scripts as scenarios: the vendored `.tst`/`.cmp`, run against `project2HdlSources`. */
import { readFileSync } from 'node:fs'
import { project2HdlSources } from '@/core'
import type { ChipScenario } from './types'

const VECTORS = new URL('../../conformance/vectors/02/', import.meta.url)

const vendored = (script: string, ext: 'tst' | 'cmp'): string => readFileSync(new URL(`${script}.${ext}`, VECTORS), 'utf8')

function project2Scenario(script: string, chip = script): ChipScenario {
  return { name: `project2/${script}`, chip, hdl: project2HdlSources[chip], tst: vendored(script, 'tst'), cmp: vendored(script, 'cmp') }
}

/** One per vendored `.tst`, in `project2HdlSources`' order, parts first; `ALU-basic.tst` loads `ALU.hdl`. */
export function project2Scenarios(): ChipScenario[] {
  return [...Object.keys(project2HdlSources).map((chip) => project2Scenario(chip)), project2Scenario('ALU-basic', 'ALU')]
}
