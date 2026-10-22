/** HACER's engine beside the reference simulator on one `.tst`. Dev-only: nothing under src/ imports it. */

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

export const compareOutputs: (chip: string, expected: string, actual: string) => Disagreement[] = () => []

export const formatDisagreement: (disagreement: Disagreement) => string = () => ''

export const describeVerdict: (verdict: Verdict) => string = () => ''

export const differential: (reference: ReferenceSimulator, vector: Vector) => Promise<Verdict> = () => {
  throw new Error('not implemented')
}

export const loadReference: (dir: string) => Promise<ReferenceSimulator> = () => {
  throw new Error('not implemented')
}
