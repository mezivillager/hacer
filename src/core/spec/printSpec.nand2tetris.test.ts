import { describe, expect, it } from 'vitest'
import { registerProject1Builtins } from '../chips/builtins/project01'
import { evaluateChip } from '../chips/evaluateChip'
import { createChipRegistry, type ChipRegistry } from '../chips/registry'
import { compileHDL, hdlChipDefinition } from '../hdl/compiler'
import { parseHDL } from '../hdl/parser'
import { project1DependencyOrder, project1HdlSources } from '../hdl/project1HdlSources'
import type { HDLChip } from '../hdl/types'
import { project1CmpFixtures } from '../testing/project1CmpFixtures'
import { project1TstFixtures } from '../testing/project1TstFixtures'
import { testChip } from '../testing/testChip'
import { sliceWidth, splitNetId } from './netId'
import { parseSpec } from './parseSpec'
import { printSpec } from './printSpec'
import { mulberry32, specPrograms } from './specPrograms'
import type { CircuitSpec, Net, PartId } from './types'

/** Issue number, so a failure replays from this file alone: program k is `specProgram(mulberry32(SEED + k), ...)`. */
const SEED = 0x168
const DOCUMENTS = 200

function load(source: string): CircuitSpec {
  const { doc, diagnostics } = parseSpec(source)
  if (doc === null) throw new Error(`refused: ${diagnostics.map((d) => d.message).join('; ')}\n${source}`)
  return doc
}

function exported(doc: CircuitSpec): { text: string; chip: HDLChip } {
  const text = printSpec(doc, { dialect: 'nand2tetris' })
  const parsed = parseHDL(text)
  if (!parsed.success) throw new Error(`parseHDL refused the export: ${parsed.errors.map((e) => e.message).join('; ')}\n${text}`)
  return { text, chip: parsed.chip }
}

function project1Registry(): ChipRegistry {
  const registry = createChipRegistry()
  registerProject1Builtins(registry)
  return registry
}

const isPassThrough = (net: Net): boolean => net.driver?.kind === 'chip-in' && net.sinks.some((s) => s.kind === 'chip-out')

function bindingsOf(doc: CircuitSpec, partId: PartId): string {
  return doc.nets
    .flatMap((net) => [net.driver, ...net.sinks].flatMap((r) => (r?.kind === 'part-pin' && r.partId === partId ? [`${r.pin}${JSON.stringify(r.slice ?? null)}=${net.id}`] : [])))
    .sort()
    .join(' ')
}

const docs = specPrograms(DOCUMENTS, SEED).map(load)

describe('nand2tetris dialect', () => {
  it('every generated document exports text that parseHDL accepts, with no wire statement', () => {
    const failures = docs.flatMap((doc) => {
      const text = printSpec(doc, { dialect: 'nand2tetris' })
      const parsed = parseHDL(text)
      if (!parsed.success) return [`${doc.name}: ${parsed.errors.map((e) => e.message).join('; ')}`]
      return /\bwire\b|hacer-spec|hacer-sidecar/.test(text) ? [`${doc.name} keeps HACER-only text:\n${text}`] : []
    })
    expect(failures).toEqual([])
  })

  it("injected buffers come after every declared part, and every declared part's id reads back", () => {
    let buffered = 0
    const failures = docs.flatMap((doc) => {
      const { text, chip } = exported(doc)
      const declared = chip.parts.slice(0, doc.parts.length).map((p) => ({ id: p.id, chip: p.name }))
      const injected = chip.parts.slice(doc.parts.length)
      const passThroughs = doc.nets.filter(isPassThrough).length
      if (injected.length > 0) buffered++
      const back = load(text)
      const ok =
        JSON.stringify(declared) === JSON.stringify(doc.parts) &&
        doc.parts.every((p) => bindingsOf(back, p.id) === bindingsOf(doc, p.id)) &&
        injected.every((p) => p.id === undefined && (p.name === 'Or' || p.name === 'Or16')) &&
        injected.length >= passThroughs &&
        (injected.length === 0) === (passThroughs === 0)
      return ok ? [] : [`${doc.name}: parts ${JSON.stringify(doc.parts)} exported as\n${text}`]
    })
    expect(failures).toEqual([])
    expect(buffered).toBeGreaterThan(DOCUMENTS / 10)
  })

  it.each([1, 4, 8, 16])('a pass-through evaluates out = in at width %i', (width) => {
    const bus = (name: string): string => (width > 1 ? `${name}[${width}]` : name)
    const doc = load(`CHIP Pass${width} {\n    IN ${bus('a')}, s;\n    OUT ${bus('out')}, ns;\n    PARTS:\n    wire out = a;\n    Not(in=s, out=ns); // #p1\n}\n`)
    const { text, chip } = exported(doc)
    const registry = project1Registry()
    const def = hdlChipDefinition(chip, text)

    const rng = mulberry32(SEED + width)
    const mask = 2 ** width - 1
    const values = width <= 8 ? Array.from({ length: mask + 1 }, (_, v) => v) : [0, mask, ...Array.from({ length: 64 }, () => Math.floor(rng() * (mask + 1)))]
    const wrong = values.flatMap((a) => [0, 1].flatMap((s) => {
      const got = evaluateChip(def, { a, s }, registry)
      return got.out === a && got.ns === 1 - s ? [] : [`a=${a} s=${s} gave ${JSON.stringify(got)}`]
    }))
    expect(wrong).toEqual([])
  })

  it('every generated pass-through, whole or sliced, evaluates bit for bit after export', () => {
    const registry = project1Registry()
    const rng = mulberry32(SEED)
    let checked = 0
    const failures = docs.flatMap((doc) => {
      const passThroughs = doc.nets.filter(isPassThrough)
      if (passThroughs.length === 0) return []
      const { text, chip } = exported(doc)
      const compiled = compileHDL(chip, registry)
      if (!compiled.success) return [`${doc.name}: ${compiled.errors.map((e) => e.message).join('; ')}\n${text}`]
      const def = hdlChipDefinition(chip, text)
      for (let round = 0; round < 8; round++) {
        const inputs = Object.fromEntries(doc.ins.map((p) => [p.name, Math.floor(rng() * 2 ** p.width)]))
        const got = evaluateChip(def, inputs, registry)
        for (const net of passThroughs) {
          const { signal, slice } = splitNetId(net.id)
          const width = slice ? sliceWidth(slice) : (doc.outs.find((p) => p.name === signal)?.width ?? 1)
          const bits = (value: number, start: number): number => Math.floor(value / 2 ** start) % 2 ** width
          const from = net.driver?.pin ?? ''
          if (bits(got[signal], slice?.start ?? 0) !== bits(inputs[from], net.driver?.slice?.start ?? 0)) {
            return [`${doc.name}: ${net.id} = ${from} broke for inputs ${JSON.stringify(inputs)}, got ${JSON.stringify(got)}\n${text}`]
          }
        }
      }
      checked++
      return []
    })
    expect(failures).toEqual([])
    expect(checked).toBeGreaterThan(DOCUMENTS / 10)
  })
})

describe('Project 1 through the spec printer', () => {
  it.each(project1DependencyOrder)('%s passes its .tst/.cmp', (name) => {
    const text = printSpec(load(project1HdlSources[name]), { dialect: 'nand2tetris' })
    const report = testChip(
      { path: `${name}.hdl`, source: text },
      { path: `${name}.tst`, source: project1TstFixtures[name] },
      { path: `${name}.cmp`, source: project1CmpFixtures[name] },
    )
    expect(report).toMatchObject({ status: 'pass', chip: name, failure: null, error: null })
    expect(report.rows?.expected).toBeGreaterThan(0)
  })
})
