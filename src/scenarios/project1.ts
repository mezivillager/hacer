/** Project 1's chips as scenarios: the vendored `.tst`/`.cmp`, run against `project1HdlSources`. */
import { readFileSync } from 'node:fs'
import { project1HdlSources } from '@/core'
import type { ChipScenario } from './types'

const VECTORS = new URL('../../conformance/vectors/01/', import.meta.url)

/** A vendored Project 1 file, read from `conformance/vectors/01/`. */
export const project1Vector = (chip: string, ext: 'hdl' | 'tst' | 'cmp'): string =>
  readFileSync(new URL(`${chip}.${ext}`, VECTORS), 'utf8')

export function project1Scenario(chip: string): ChipScenario {
  return { name: `project1/${chip}`, chip, hdl: '', tst: '', cmp: '' }
}

export function project1Scenarios(): ChipScenario[] {
  return Object.keys(project1HdlSources).map(project1Scenario)
}
