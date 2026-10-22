/** HACER's engine beside the reference simulator on one `.tst`. Dev-only: nothing under src/ imports it. */
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { outTable } from '@/cli/outTable'
import { loadChipTest, runTest } from '@/core'

export interface Disagreement {
  chip: string
  line: number
  expected: string
  actual: string
}

/** One chip's case: the HDL under test and the official `.tst` / `.cmp`. */
export interface Vector {
  chip: string
  hdl: string
  tst: string
  cmp: string
}

export type Verdict =
  | { chip: string; status: 'agree' }
  | { chip: string; status: 'disagree'; disagreements: Disagreement[] }
  | { chip: string; status: 'rejected' }
  | { chip: string; status: 'error'; engine: 'hacer' | 'reference'; error: string }

/** An engine's `.out`, or why it wrote none. */
export type Out = { out: string } | { error: string }

export interface ReferenceSimulator {
  run(hdl: string, tst: string): Promise<Out>
}

const MISSING = '(no line)'

const lines = (text: string): string[] => (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n')

/** Every line where HACER's `.out` (actual) differs from the reference's (expected), numbered from 1. */
export function compareOutputs(chip: string, expected: string, actual: string): Disagreement[] {
  const want = lines(expected)
  const got = lines(actual)
  return Array.from({ length: Math.max(want.length, got.length) }, (_, i) => ({
    chip,
    line: i + 1,
    expected: want[i] ?? MISSING,
    actual: got[i] ?? MISSING,
  })).filter(({ expected: line, actual: other }) => line !== other)
}

export const formatDisagreement = ({ chip, line, expected, actual }: Disagreement): string =>
  `${chip} line ${line}: expected ${expected}, actual ${actual}`

export function describeVerdict(verdict: Verdict): string {
  switch (verdict.status) {
    case 'agree':
      return `AGREE ${verdict.chip}`
    case 'rejected':
      return `REJECTED ${verdict.chip}: the reference's .out is not the official .cmp, so agreement proves nothing`
    case 'error':
      return `ERROR ${verdict.chip}: ${verdict.engine} wrote no .out: ${verdict.error}`
    case 'disagree':
      return ['DISAGREE', ...verdict.disagreements.map(formatDisagreement)].join('\n')
  }
}

/** `hacer run-tst`'s path: the `.hdl`'s own chip, the whole script run with nothing to stop it at a `.cmp` mismatch. */
function hacerOut({ chip, hdl, tst }: Vector): Out {
  const loaded = loadChipTest({ path: `${chip}.hdl`, source: hdl }, { path: `${chip}.tst`, source: tst })
  if ('status' in loaded) return { error: loaded.error ?? loaded.status }
  const script = { commands: loaded.script.commands.filter((cmd) => cmd.type !== 'compare-to') }
  const result = runTest(script, { registry: loaded.registry, chip: loaded.own })
  return result.error === null ? { out: outTable(script, result.outputRows) } : { error: result.error }
}

/** Both engines on one vector. A pass needs both: the same `.out` line for line, and the reference accepting it as the `.cmp`. */
export async function differential(reference: ReferenceSimulator, vector: Vector): Promise<Verdict> {
  const { chip } = vector
  const expected = await reference.run(vector.hdl, vector.tst)
  if ('error' in expected) return { chip, status: 'error', engine: 'reference', error: expected.error }
  const actual = hacerOut(vector)
  if ('error' in actual) return { chip, status: 'error', engine: 'hacer', error: actual.error }
  const disagreements = compareOutputs(chip, expected.out, actual.out)
  if (disagreements.length > 0) return { chip, status: 'disagree', disagreements }
  return expected.out.trim() === vector.cmp.trim() ? { chip, status: 'agree' } : { chip, status: 'rejected' }
}

/** jiffies' `Result`, the shape every reference call returns. */
type Result<T> = { ok: T } | { err: { message: string } }

interface ReferenceTest {
  with(chip: unknown): ReferenceTest
  run(): Promise<void>
  log(): string
}

interface ReferenceModules {
  builder: { parse(hdl: string): Promise<Result<unknown>> }
  tst: { TST: { parse(tst: string): Result<unknown> } }
  chiptst: { ChipTest: { from(tst: unknown): Result<ReferenceTest> } }
}

/** The built reference under `dir`: its HDL builder and its `ChipTest`, driven the way web-ide's own runner drives them. */
export async function loadReference(dir: string): Promise<ReferenceSimulator> {
  const load = async <T>(file: string): Promise<T> => (await import(pathToFileURL(path.join(dir, 'simulator/build', file)).href)) as T
  const builder = await load<ReferenceModules['builder']>('chip/builder.js')
  const { TST } = await load<ReferenceModules['tst']>('languages/tst.js')
  const { ChipTest } = await load<ReferenceModules['chiptst']>('test/chiptst.js')
  return {
    async run(hdl, tst) {
      const chip = await builder.parse(hdl)
      if ('err' in chip) return { error: chip.err.message }
      const script = TST.parse(tst)
      if ('err' in script) return { error: script.err.message }
      const test = ChipTest.from(script.ok)
      if ('err' in test) return { error: test.err.message }
      const run = test.ok.with(chip.ok)
      await run.run()
      return { out: run.log() }
    },
  }
}
