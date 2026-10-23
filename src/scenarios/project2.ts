/** Project 2's chips as scenarios: the vendored `.tst`/`.cmp`, run against `project2HdlSources`. */
import { readFileSync } from 'node:fs'
import { project2HdlSources } from '@/core'
import type { ChipScenario } from './types'

const VECTORS = new URL('../../conformance/vectors/02/', import.meta.url)

/** A vendored Project 2 file, read from `conformance/vectors/02/`. */
export const project2Vector = (chip: string, ext: 'hdl' | 'tst' | 'cmp'): string =>
  readFileSync(new URL(`${chip}.${ext}`, VECTORS), 'utf8')

export function project2Scenario(chip: string): ChipScenario {
  return { name: `project2/${chip}`, chip, hdl: project2HdlSources[chip], tst: project2Vector(chip, 'tst'), cmp: project2Vector(chip, 'cmp') }
}

/** In `project2HdlSources`' order, parts first. */
export function project2Scenarios(): ChipScenario[] {
  return Object.keys(project2HdlSources).map(project2Scenario)
}
