import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { runCli } from '@/cli/runCli'
import { project1DependencyOrder, project1HdlSources, project2HdlSources } from '@/core'
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

const VECTORS = path.resolve(import.meta.dirname, '../vectors')
type Project = '01' | '02'
const official = (file: string, ext: 'hdl' | 'tst' | 'cmp', project: Project = '01'): string =>
  readFileSync(path.join(VECTORS, project, `${file}.${ext}`), 'utf-8')
const vector = (chip: string, hdl: string, project: Project = '01', script = chip): Vector => ({
  script,
  chip,
  hdl,
  tst: official(script, 'tst', project),
  cmp: official(script, 'cmp', project),
})

describe('compareOutputs', () => {
  it('reports a disagreement as chip, line, expected, actual', () => {
    const reference = '|  in  | out  |\n|  0   |  1   |\n|  1   |  0   |\n'
    const hacer = '|  in  | out  |\n|  0   |  1   |\n|  1   |  1   |\n'
    const found = compareOutputs('Not', reference, hacer)
    expect(found).toEqual([{ script: 'Not', line: 3, expected: '|  1   |  0   |', actual: '|  1   |  1   |' }])
    expect(found.map(formatDisagreement)).toEqual(['Not line 3: expected |  1   |  0   |, actual |  1   |  1   |'])
  })

  it('counts a line only one engine wrote as a disagreement', () => {
    expect(compareOutputs('Not', '| a |\n| 0 |\n', '| a |\n')).toEqual([{ script: 'Not', line: 2, expected: '| 0 |', actual: '(no line)' }])
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
    expect(verdicts.map((verdict) => `${verdict.script} ${verdict.status}`)).toEqual(project1DependencyOrder.map((chip) => `${chip} rejected`))
  })
})

describe('Project 2: all six scripts beside the reference simulator, on the official .tst', () => {
  // Each script and the chip it loads, parts first: ALU-basic.tst loads ALU.hdl.
  const scripts: [script: string, chip: string][] = [
    ['HalfAdder', 'HalfAdder'], ['FullAdder', 'FullAdder'], ['Add16', 'Add16'], ['Inc16', 'Inc16'], ['ALU', 'ALU'], ['ALU-basic', 'ALU'],
  ]
  let reference: ReferenceSimulator
  beforeAll(async () => {
    reference = await loadReference(referenceDir)
  })

  it('covers every .tst in conformance/vectors/02/, six scripts over five chips, each beside the chip it loads', () => {
    const tsts = readdirSync(path.join(VECTORS, '02')).filter((file) => file.endsWith('.tst')).map((file) => file.slice(0, -'.tst'.length))
    expect(scripts.map(([script]) => script).sort()).toEqual(tsts.sort())
    expect([...new Set(scripts.map(([, chip]) => chip))]).toEqual(Object.keys(project2HdlSources))
    for (const [script, chip] of scripts) expect(official(script, 'tst', '02').match(/^load (\S+)\.hdl,/m)?.[1], script).toBe(chip)
  })

  it.each(scripts)('%s: both engines write the same .out, and it is the official .cmp', async (script, chip) => {
    const verdict = await differential(reference, vector(chip, project2HdlSources[chip], '02', script))
    expect(describeVerdict(verdict)).toBe(`AGREE ${script}`)
  })

  it('ALU and ALU-basic, two scripts over one chip, get a verdict each', async () => {
    const verdicts: Verdict[] = []
    for (const script of ['ALU', 'ALU-basic']) verdicts.push(await differential(reference, vector('ALU', project2HdlSources.ALU, '02', script)))
    expect(verdicts.map(describeVerdict)).toEqual(['AGREE ALU', 'AGREE ALU-basic'])
  })

  it('is not vacuous: the upstream stub .hdl is rejected for every script', async () => {
    const verdicts: Verdict[] = []
    for (const [script, chip] of scripts) verdicts.push(await differential(reference, vector(chip, official(chip, 'hdl', '02'), '02', script)))
    expect(verdicts.map((verdict) => `${verdict.script} ${verdict.status}`)).toEqual(scripts.map(([script]) => `${script} rejected`))
  })
})

describe("HACER's side of a verdict is what `hacer run-tst` prints", () => {
  const reference: ReferenceSimulator = { run: async () => ({ out: '| a |\n| 0 |\n' }) }
  const not = vector('Not', project1HdlSources.Not)

  it('takes its .out from runCli, fed the vector through an in-memory reader', async () => {
    vi.mocked(runCli).mockReturnValueOnce({ exitCode: 0, stdout: '| a |\n| 1 |\n', stderr: '' })
    const verdict = await differential(reference, not)
    expect(verdict).toEqual({
      script: 'Not',
      status: 'disagree',
      disagreements: [{ script: 'Not', line: 2, expected: '| 0 |', actual: '| 1 |' }],
    })
    const [argv, read] = vi.mocked(runCli).mock.lastCall ?? []
    expect(argv).toEqual(['run-tst', 'Not.hdl', 'Not.tst'])
    expect([read?.('Not.hdl'), read?.('Not.tst')]).toEqual([not.hdl, not.tst])
    expect(() => read?.('Not.cmp')).toThrow()
  })

  it('runs a script under its own name, beside the chip it loads', async () => {
    vi.mocked(runCli).mockReturnValueOnce({ exitCode: 0, stdout: '| a |\n| 0 |\n', stderr: '' })
    expect(await differential(reference, { script: 'ALU-basic', chip: 'ALU', hdl: 'hdl', tst: 'tst', cmp: '| a |\n| 0 |\n' })).toEqual({ script: 'ALU-basic', status: 'agree' })
    const [argv, read] = vi.mocked(runCli).mock.lastCall ?? []
    expect(argv).toEqual(['run-tst', 'ALU.hdl', 'ALU-basic.tst'])
    expect([read?.('ALU.hdl'), read?.('ALU-basic.tst')]).toEqual(['hdl', 'tst'])
  })

  it("reports runCli's stderr when it wrote no .out", async () => {
    vi.mocked(runCli).mockReturnValueOnce({ exitCode: 1, stdout: '| a |\n', stderr: 'ERROR Not: boom\n' })
    expect(await differential(reference, not)).toEqual({ script: 'Not', status: 'error', engine: 'hacer', error: 'ERROR Not: boom' })
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
