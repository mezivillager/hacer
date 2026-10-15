// The documents `src/store/legacyWriterCorpus.test.ts` recorded, imported and checked against the official
// Project 1 vectors and against `evaluateCircuit`. Both are read as raw text, so this adds no layer edge.
import { describe, expect, it } from 'vitest'
import { evaluateCircuit } from '@/simulation/topologicalEval'
import { getBuiltinChipRegistry } from '../chips/appRegistry'
import { DEFAULT_MAX_DEPTH, evaluateChip, evaluateChipWithCtx } from '../chips/evaluateChip'
import { compileHDL, hdlChipDefinition, type EvalContext } from '../hdl/compiler'
import { parseHDL } from '../hdl/parser'
import { deserializeCircuit } from '../serialization/deserialize'
import type { SerializedCircuit } from '../serialization/types'
import { testChip } from '../testing'
import { compileSpec } from './compileSpec'
import { fromLegacyCircuit } from './fromLegacyCircuit'
import { printSpec } from './printSpec'
import { mulberry32 } from './specPrograms'
import type { CircuitSpec } from './types'

type Vector = Record<string, number>

const SEED = 0x377
const CHIPS = ['Not', 'And', 'Or', 'Xor', 'Mux', 'DMux']
const DAGS = Array.from({ length: 32 }, (_, i) => `dag-${String(i).padStart(2, '0')}`)
const RECORDED = import.meta.glob<string>('../../store/__snapshots__/characterization/legacy-writer/*.json', { query: '?raw', import: 'default', eager: true })
const OFFICIAL = import.meta.glob<string>('../../../conformance/vectors/01/*.{tst,cmp}', { query: '?raw', import: 'default', eager: true })

const CORPUS = Object.keys(RECORDED).sort().map((path) => JSON.parse(RECORDED[path]) as SerializedCircuit)

const registry = getBuiltinChipRegistry()
const ctx: EvalContext = { registry, depth: 0, maxDepth: DEFAULT_MAX_DEPTH, evalChip: evaluateChipWithCtx }

function imported(saved: SerializedCircuit): CircuitSpec {
  const { doc, sidecar } = fromLegacyCircuit(saved)
  if (doc === null) throw new Error(`${saved.name} does not import: ${JSON.stringify(sidecar.notes)}`)
  return doc
}

/** Every 1-bit input vector up to six inputs; above that, 64 seeded ones. */
function vectorsFor(saved: SerializedCircuit): Vector[] {
  const names = saved.inputNodes.map((n) => n.name)
  const exhaustive = names.length <= 6
  const rng = mulberry32(SEED)
  return Array.from({ length: exhaustive ? 2 ** names.length : 64 }, (_, v) => {
    const bits = exhaustive ? v : Math.floor(rng() * 2 ** names.length)
    return Object.fromEntries(names.map((name, i) => [name, Math.floor(bits / 2 ** i) % 2]))
  })
}

function legacy(saved: SerializedCircuit, inputs: Vector): Vector {
  const { document } = deserializeCircuit(saved)
  if (document === null) throw new Error(`${saved.name} does not load`)
  for (const n of document.inputNodes) n.value = inputs[n.name]
  const result = evaluateCircuit(document)
  if (result.status !== 'ok') throw new Error(`${saved.name}: evaluateCircuit reports a cycle`)
  return Object.fromEntries(document.outputNodes.map((n) => [n.name, n.value]))
}

type Evaluate = (inputs: Vector) => Vector

function throughCompileSpec(doc: CircuitSpec): Evaluate {
  const compiled = compileSpec({ doc, diagnostics: [] }, registry)
  if (!compiled.success) throw new Error(compiled.diagnostics.map((d) => d.message).join('; '))
  return (inputs) => compiled.evaluate(inputs, ctx)
}

function throughExport(doc: CircuitSpec): Evaluate {
  const text = printSpec(doc, { dialect: 'nand2tetris' })
  const parsed = parseHDL(text)
  if (!parsed.success) throw new Error(`the export does not parse: ${parsed.errors.map((e) => e.message).join('; ')}\n${text}`)
  const compiled = compileHDL(parsed.chip, registry)
  if (!compiled.success) throw new Error(compiled.errors.map((e) => e.message).join('; '))
  const def = hdlChipDefinition(parsed.chip, text)
  return (inputs) => evaluateChip(def, inputs, registry)
}

/** Each vector on which an evaluation of the import differs from `evaluateCircuit`, by legacy port names. */
function mismatches(saved: SerializedCircuit, vectors: Vector[]): string[] {
  const doc = imported(saved)
  const runs = [['compileSpec', throughCompileSpec(doc)], ['export', throughExport(doc)]] as const
  return vectors.flatMap((vector) => {
    const want = legacy(saved, vector)
    const inputs = Object.fromEntries(saved.inputNodes.map((n, k) => [doc.ins[k].name, vector[n.name]]))
    return runs.flatMap(([via, run]) => {
      const out = run(inputs)
      const got = Object.fromEntries(saved.outputNodes.map((n, k) => [n.name, out[doc.outs[k].name]]))
      return JSON.stringify(got) === JSON.stringify(want) ? [] : [`${JSON.stringify(vector)} via ${via}: ${JSON.stringify(got)}, legacy ${JSON.stringify(want)}`]
    })
  })
}

function official(chip: string, ext: 'tst' | 'cmp'): { path: string; source: string } {
  const source = OFFICIAL[`../../../conformance/vectors/01/${chip}.${ext}`]
  if (source === undefined) throw new Error(`conformance/vectors/01/${chip}.${ext} is missing`)
  return { path: `${chip}.${ext}`, source }
}

describe('writer corpus', () => {
  it('reads the recorded corpus', () => {
    expect(CORPUS.map((d) => d.name).sort()).toEqual([...CHIPS, ...DAGS].sort())
    expect(CORPUS.flatMap((d) => [...d.inputNodes, ...d.outputNodes]).every((n) => n.width === 1)).toBe(true)
    expect(CORPUS.flatMap((d) => d.busComponents)).toEqual([])
  })

  it.each(CHIPS.map((chip) => [chip, chip]))('%s: the import passes the official conformance/vectors/01/%s.tst/.cmp', (chip) => {
    const saved = CORPUS.find((d) => d.name === chip)
    if (!saved) throw new Error(`no recorded ${chip}`)
    const report = testChip({ path: `${chip}.hdl`, source: printSpec(imported(saved), { dialect: 'nand2tetris' }) }, official(chip, 'tst'), official(chip, 'cmp'))
    expect(report).toMatchObject({ status: 'pass', chip, failure: null, error: null })
    expect(report.rows?.expected).toBeGreaterThan(0)
  })

  it.each(CORPUS.map((d) => [d.name, d] as const))('%s: the import evaluates as evaluateCircuit does on every vector', (_name, saved) => {
    const vectors = vectorsFor(saved)
    expect(vectors).toHaveLength(Math.min(2 ** saved.inputNodes.length, 64))
    expect(mismatches(saved, vectors)).toEqual([])
  })
})
