import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { project1DependencyOrder, project1HdlSources } from '@/core'
import {
  compareOutputs,
  describeVerdict,
  differential,
  formatDisagreement,
  loadReference,
  type ReferenceSimulator,
  type Vector,
  type Verdict,
} from './harness'
import { referenceDir } from './reference'

const VECTORS = path.resolve(import.meta.dirname, '../vectors/01')
const official = (chip: string, ext: 'hdl' | 'tst' | 'cmp'): string => readFileSync(path.join(VECTORS, `${chip}.${ext}`), 'utf-8')
const vector = (chip: string, hdl: string): Vector => ({ chip, hdl, tst: official(chip, 'tst'), cmp: official(chip, 'cmp') })

describe('compareOutputs', () => {
  it('reports a disagreement as chip, line, expected, actual', () => {
    const reference = '|  in  | out  |\n|  0   |  1   |\n|  1   |  0   |\n'
    const hacer = '|  in  | out  |\n|  0   |  1   |\n|  1   |  1   |\n'
    const found = compareOutputs('Not', reference, hacer)
    expect(found).toEqual([{ chip: 'Not', line: 3, expected: '|  1   |  0   |', actual: '|  1   |  1   |' }])
    expect(found.map(formatDisagreement)).toEqual(['Not line 3: expected |  1   |  0   |, actual |  1   |  1   |'])
  })

  it('counts a line only one engine wrote as a disagreement', () => {
    expect(compareOutputs('Not', '| a |\n| 0 |\n', '| a |\n')).toEqual([{ chip: 'Not', line: 2, expected: '| 0 |', actual: '(no line)' }])
  })

  it('finds nothing between two identical .out files', () => {
    expect(compareOutputs('And', official('And', 'cmp'), official('And', 'cmp'))).toEqual([])
  })
})

describe('Project 1: HACER beside the reference simulator, on the official .tst', () => {
  let reference: ReferenceSimulator
  beforeAll(async () => {
    reference = await loadReference(referenceDir)
  })

  it('covers all 15 Project-1 chips', () => {
    expect(project1DependencyOrder).toHaveLength(15)
  })

  it.each(project1DependencyOrder)('%s: both engines write the same .out, and it is the official .cmp', async (chip) => {
    const verdict = await differential(reference, vector(chip, project1HdlSources[chip]))
    expect(describeVerdict(verdict)).toBe(`AGREE ${chip}`)
  })

  it('is not vacuous: the upstream stub .hdl is rejected for every chip', async () => {
    const verdicts: Verdict[] = []
    for (const chip of project1DependencyOrder) verdicts.push(await differential(reference, vector(chip, official(chip, 'hdl'))))
    expect(verdicts.map((verdict) => `${verdict.chip} ${verdict.status}`)).toEqual(project1DependencyOrder.map((chip) => `${chip} rejected`))
  })
})
