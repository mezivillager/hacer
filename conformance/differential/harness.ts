/** HACER's engine beside the reference simulator on one `.tst`. Dev-only: nothing under src/ imports it. */
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { runCli } from '@/cli/runCli'

export interface Disagreement {
  script: string
  line: number
  expected: string
  actual: string
}

/** One script's case: the official `<script>.tst` / `.cmp`, and the HDL under test of the chip that `.tst` loads. */
export interface Vector {
  script: string
  chip: string
  hdl: string
  tst: string
  cmp: string
}

/** A script's verdict: two scripts over one chip, as `ALU.tst` and `ALU-basic.tst`, get one each. */
export type Verdict =
  | { script: string; status: 'agree' }
  | { script: string; status: 'disagree'; disagreements: Disagreement[] }
  | { script: string; status: 'rejected' }
  | { script: string; status: 'error'; engine: 'hacer' | 'reference'; error: string }

/** An engine's `.out`, or why it wrote none. */
export type Out = { out: string } | { error: string }

export interface ReferenceSimulator {
  run(hdl: string, tst: string): Promise<Out>
}

const MISSING = '(no line)'

const lines = (text: string): string[] => (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n')

/** Every line where HACER's `.out` (actual) differs from the reference's (expected), numbered from 1. */
export function compareOutputs(script: string, expected: string, actual: string): Disagreement[] {
  const want = lines(expected)
  const got = lines(actual)
  return Array.from({ length: Math.max(want.length, got.length) }, (_, i) => ({
    script,
    line: i + 1,
    expected: want[i] ?? MISSING,
    actual: got[i] ?? MISSING,
  })).filter(({ expected: line, actual: other }) => line !== other)
}

export const formatDisagreement = ({ script, line, expected, actual }: Disagreement): string =>
  `${script} line ${line}: expected ${expected}, actual ${actual}`

export function describeVerdict(verdict: Verdict): string {
  switch (verdict.status) {
    case 'agree':
      return `AGREE ${verdict.script}`
    case 'rejected':
      return `REJECTED ${verdict.script}: the reference's .out is not the official .cmp, so agreement proves nothing`
    case 'error':
      return `ERROR ${verdict.script}: ${verdict.engine} wrote no .out: ${verdict.error}`
    case 'disagree':
      return ['DISAGREE', ...verdict.disagreements.map(formatDisagreement)].join('\n')
  }
}

/** What `hacer run-tst <chip>.hdl <chip>.tst` prints: the shipped command's own `runCli`, reading the vector from memory. */
function hacerOut({ chip, hdl, tst }: Vector): Out {
  const read = (file: string): string => {
    if (file === `${chip}.hdl`) return hdl
    if (file === `${chip}.tst`) return tst
    throw new Error(`${file}: not part of this vector`)
  }
  const { exitCode, stdout, stderr } = runCli(['run-tst', `${chip}.hdl`, `${chip}.tst`], read)
  return exitCode === 0 ? { out: stdout } : { error: stderr.trim() }
}

/** Both engines on one vector. A pass needs both: the same `.out` line for line, and the reference accepting it as the `.cmp`. */
export async function differential(reference: ReferenceSimulator, vector: Vector): Promise<Verdict> {
  const { chip: script } = vector
  const expected = await reference.run(vector.hdl, vector.tst)
  if ('error' in expected) return { script, status: 'error', engine: 'reference', error: expected.error }
  const actual = hacerOut(vector)
  if ('error' in actual) return { script, status: 'error', engine: 'hacer', error: actual.error }
  const disagreements = compareOutputs(script, expected.out, actual.out)
  if (disagreements.length > 0) return { script, status: 'disagree', disagreements }
  return expected.out.trim() === vector.cmp.trim() ? { script, status: 'agree' } : { script, status: 'rejected' }
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
