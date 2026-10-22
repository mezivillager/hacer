import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { runCli } from '@/cli/runCli'
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
import { BUILT, current, referenceDir } from './reference'

vi.mock('@/cli/runCli', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/cli/runCli')>()
  return { ...original, runCli: vi.fn(original.runCli) }
})

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

describe("HACER's side of a verdict is what `hacer run-tst` prints", () => {
  const reference: ReferenceSimulator = { run: async () => ({ out: '| a |\n| 0 |\n' }) }
  const not = vector('Not', project1HdlSources.Not)

  it('takes its .out from runCli, fed the vector through an in-memory reader', async () => {
    vi.mocked(runCli).mockReturnValueOnce({ exitCode: 0, stdout: '| a |\n| 1 |\n', stderr: '' })
    const verdict = await differential(reference, not)
    expect(verdict).toEqual({
      chip: 'Not',
      status: 'disagree',
      disagreements: [{ chip: 'Not', line: 2, expected: '| 0 |', actual: '| 1 |' }],
    })
    const [argv, read] = vi.mocked(runCli).mock.lastCall ?? []
    expect(argv).toEqual(['run-tst', 'Not.hdl', 'Not.tst'])
    expect([read?.('Not.hdl'), read?.('Not.tst')]).toEqual([not.hdl, not.tst])
    expect(() => read?.('Not.cmp')).toThrow()
  })

  it("reports runCli's stderr when it wrote no .out", async () => {
    vi.mocked(runCli).mockReturnValueOnce({ exitCode: 1, stdout: '| a |\n', stderr: 'ERROR Not: boom\n' })
    expect(await differential(reference, not)).toEqual({ chip: 'Not', status: 'error', engine: 'hacer', error: 'ERROR Not: boom' })
  })
})

describe('current: whether the cached reference can be trusted', () => {
  const made: string[] = []
  afterEach(() => {
    for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  const cacheWith = (provenance: string, built: readonly string[]): string => {
    const dir = mkdtempSync(path.join(tmpdir(), 'hacer-differential-current-'))
    made.push(dir)
    writeFileSync(path.join(dir, 'provenance.json'), provenance)
    for (const file of built) {
      mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
      writeFileSync(path.join(dir, file), '')
    }
    return dir
  }
  const written = (): string => readFileSync(path.join(referenceDir, 'provenance.json'), 'utf-8')
  const beforeLockfile = (): string => {
    const { pin } = JSON.parse(written()) as { pin: unknown }
    return JSON.stringify({ pin, typeErrors: 0 })
  }

  it('trusts the cache this run just built', () => {
    expect(current()).toBe(true)
    expect(current(cacheWith(written(), BUILT))).toBe(true)
  })

  it.each(BUILT)('rebuilds when %s is gone, whatever the provenance says', (file) => {
    expect(current(cacheWith(written(), BUILT.filter((built) => built !== file)))).toBe(false)
  })

  it('rebuilds a cache whose install did not come from the pinned lockfile', () => {
    expect(current(cacheWith(beforeLockfile(), BUILT))).toBe(false)
  })
})
