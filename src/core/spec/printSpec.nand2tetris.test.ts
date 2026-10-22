import { describe, expect, it } from 'vitest'
import { registerProject1Builtins } from '../chips/builtins/project01'
import { DEFAULT_MAX_DEPTH, evaluateChip, evaluateChipWithCtx } from '../chips/evaluateChip'
import { createChipRegistry, registerBuiltin, type ChipRegistry } from '../chips/registry'
import { compileHDL, hdlChipDefinition, type EvalContext } from '../hdl/compiler'
import { parseHDL } from '../hdl/parser'
import { project1DependencyOrder, project1HdlSources } from '../hdl/project1HdlSources'
import type { HDLChip } from '../hdl/types'
import { project1CmpFixtures } from '../testing/project1CmpFixtures'
import { project1TstFixtures } from '../testing/project1TstFixtures'
import { testChip } from '../testing/testChip'
import { compileSpec } from './compileSpec'
import { sliceWidth, splitNetId } from './netId'
import { parseSpec } from './parseSpec'
import { printSpec } from './printSpec'
import { mulberry32, specPrograms } from './specPrograms'
import type { CircuitSpec, Net, PartId, Port, Ref } from './types'

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

const isPassThrough = (net: Net): net is Net & { driver: Extract<Ref, { kind: 'chip-in' | 'chip-out' }> } =>
  net.driver?.kind === 'chip-in' && net.sinks.some((s) => s.kind === 'chip-out')

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

  it.each([1, 4, 8, 16, 17, 20, 32])('a pass-through evaluates out = in at width %i', (width) => {
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
          const from = net.driver.pin
          if (bits(got[signal], slice?.start ?? 0) !== bits(inputs[from], net.driver.slice?.start ?? 0)) {
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

/** Every vector up to 6 input bits; above that all-zero, all-one and 12 seeded ones, as the reference panel ran them. */
function vectorsFor(doc: CircuitSpec): Array<Record<string, number>> {
  const of = (value: (p: Port) => number): Record<string, number> => Object.fromEntries(doc.ins.map((p) => [p.name, value(p)]))
  const bits = doc.ins.reduce((n, p) => n + p.width, 0)
  if (bits <= 6) {
    return Array.from({ length: 2 ** bits }, (_, v) => {
      let rest = v
      return of((p) => {
        const value = rest % 2 ** p.width
        rest = Math.floor(rest / 2 ** p.width)
        return value
      })
    })
  }
  const rng = mulberry32(SEED + bits)
  return [of(() => 0), of((p) => 2 ** p.width - 1), ...Array.from({ length: 12 }, () => of((p) => Math.floor(rng() * 2 ** p.width)))]
}

/** What a document of aliases alone gives: each OUT bit copied from the IN bit its alias names. */
function aliased(doc: CircuitSpec, inputs: Record<string, number>): Record<string, number> {
  const outs = Object.fromEntries(doc.outs.map((p) => [p.name, 0]))
  for (const net of doc.nets.filter(isPassThrough)) {
    const { signal, slice } = splitNetId(net.id)
    const width = slice ? sliceWidth(slice) : (doc.outs.find((p) => p.name === signal)?.width ?? 1)
    const value = Math.floor(inputs[net.driver.pin] / 2 ** (net.driver.slice?.start ?? 0)) % 2 ** width
    outs[signal] += value * 2 ** (slice?.start ?? 0)
  }
  return outs
}

const perBit = (width: number): string[] => Array.from({ length: width }, (_, i) => `Or(a=a[${i}], b=a[${i}], out=out[${i}]);`)

describe('the nand2tetris dialect prints one buffer per 16-bit window of an alias', () => {
  it.each([
    ['wire out = a; at 17 bits', 'W', 'a[17]', 'out[17]', 'wire out = a;', ['Or16(a=a[0..15], b=a[0..15], out=out[0..15]);', 'Or(a=a[16], b=a[16], out=out[16]);']],
    ['wire out = a; at 20 bits', 'W', 'a[20]', 'out[20]', 'wire out = a;', ['Or16(a=a[0..15], b=a[0..15], out=out[0..15]);', 'Or16(a[0..3]=a[16..19], b[0..3]=a[16..19], out[0..3]=out[16..19]);']],
    ['wire out = a; at 32 bits', 'W', 'a[32]', 'out[32]', 'wire out = a;', ['Or16(a=a[0..15], b=a[0..15], out=out[0..15]);', 'Or16(a=a[16..31], b=a[16..31], out=out[16..31]);']],
    ['a byte swap into an OUT', 'W', 'x[16]', 'y[16]', 'wire y[0..7] = x[8..15]; wire y[8..15] = x[0..7];', ['Or16(a[0..7]=x[8..15], b[0..7]=x[8..15], out[0..7]=y[0..7]);', 'Or16(a[0..7]=x[0..7], b[0..7]=x[0..7], out[0..7]=y[8..15]);']],
    ['a 32-bit OUT split into two 16-bit aliases', 'W', 'a[32]', 'out[32]', 'wire out[0..15] = a[0..15]; wire out[16..31] = a[16..31];', ['Or16(a=a[0..15], b=a[0..15], out=out[0..15]);', 'Or16(a=a[16..31], b=a[16..31], out=out[16..31]);']],
    ['a chip named Or16 at 4 bits, which keeps one Or per bit', 'Or16', 'a[4]', 'out[4]', 'wire out = a;', perBit(4)],
    ['a chip named Or16 at 20 bits, which keeps one Or per bit', 'Or16', 'a[20]', 'out[20]', 'wire out = a;', perBit(20)],
  ])('%s: the exact text, which compiles and evaluates every OUT', (_name, name, ins, outs, wires, lines) => {
    const doc = load(`CHIP ${name} { IN ${ins}; OUT ${outs}; PARTS: ${wires} }`)
    const { text, chip } = exported(doc)
    expect(text).toBe(`CHIP ${name} {\n    IN ${ins};\n    OUT ${outs};\n\n    PARTS:\n${lines.map((l) => `    ${l}\n`).join('')}}\n`)

    const registry = project1Registry()
    const compiled = compileHDL(chip, registry)
    expect(compiled.success ? [] : compiled.errors.map((e) => e.message)).toEqual([])
    const def = hdlChipDefinition(chip, text)
    const wrong = vectorsFor(doc).flatMap((inputs) => {
      const got = evaluateChip(def, inputs, registry)
      const want = aliased(doc, inputs)
      return doc.outs.every((p) => got[p.name] === want[p.name]) ? [] : [`${JSON.stringify(inputs)} gave ${JSON.stringify(got)}, want ${JSON.stringify(want)}`]
    })
    expect(wrong).toEqual([])
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

const wide = project1Registry()
registerBuiltin(wide, 'W32', [{ name: 'a', width: 32 }], [{ name: 'lo', width: 16 }, { name: 'hi', width: 16 }], ({ a = 0 }) => ({ lo: a & 0xffff, hi: a >>> 16 }))
registerBuiltin(wide, 'W17', [{ name: 'a', width: 17 }], [{ name: 'lo', width: 16 }, { name: 'top', width: 1 }], ({ a = 0 }) => ({ lo: a & 0xffff, top: a >>> 16 }))
const wideCtx: EvalContext = { registry: wide, depth: 0, maxDepth: DEFAULT_MAX_DEPTH, evalChip: evaluateChipWithCtx }
const SHAPES: Record<string, { outs: string; bound: string }> = { W32: { outs: 'lo[16], hi[16]', bound: 'hi=hi, lo=lo' }, W17: { outs: 'lo[16], top', bound: 'lo=lo, top=top' } }
const literalText = (chip: string, inputs: string): string => `CHIP T {\n    IN x;\n    OUT ${SHAPES[chip].outs};\n\n    PARTS:\n    ${chip}(${inputs}, ${SHAPES[chip].bound}); // #p1\n}\n`

function wideDoc(chip: string, binding: string): CircuitSpec {
  const { doc, diagnostics } = parseSpec(`CHIP T { IN x; OUT ${SHAPES[chip].outs}; PARTS: ${chip}(${binding}, ${SHAPES[chip].bound}); }`, { chips: wide })
  const errors = diagnostics.filter((d) => d.severity === 'error')
  if (doc === null || errors.length > 0) throw new Error(`refused: ${errors.map((d) => d.message).join('; ')}`)
  return doc
}

const WINDOWED = [
  { chip: 'W32', binding: 'a=true', windows: 'a[0..15]=true, a[16..31]=true', want: { lo: 65535, hi: 65535 } },
  { chip: 'W32', binding: 'a[8..31]=true', windows: 'a[8..23]=true, a[24..31]=true', want: { lo: 65280, hi: 65535 } },
  { chip: 'W17', binding: 'a=true', windows: 'a[0..15]=true, a[16]=true', want: { lo: 65535, top: 1 } },
]

describe('the nand2tetris dialect prints a true wider than 16 bits in 16-bit windows (§1.10.10)', () => {
  it.each(WINDOWED)('$chip($binding) prints as $chip($windows)', ({ chip, binding, windows }) => {
    expect(printSpec(wideDoc(chip, binding), { dialect: 'nand2tetris', chips: wide })).toBe(literalText(chip, windows))
  })

  it.each(WINDOWED)('$chip($binding): the exported text, re-read by compileHDL, gives the document\'s outputs', ({ chip, binding, want }) => {
    const doc = wideDoc(chip, binding)
    const viaDoc = compileSpec({ doc, diagnostics: [] }, wide)
    const parsed = parseHDL(printSpec(doc, { dialect: 'nand2tetris', chips: wide }))
    const viaExport = parsed.success ? compileHDL(parsed.chip, wide) : null
    expect({
      doc: viaDoc.success ? viaDoc.evaluate({ x: 0 }, wideCtx) : viaDoc.diagnostics,
      exported: viaExport?.success ? viaExport.evaluate({ x: 0 }, wideCtx) : viaExport,
    }).toEqual({ doc: want, exported: want })
  })

  it.each(['a[0..15]=true', 'a[16..31]=true', 'a[4..11]=true', 'a=false'])('W32(%s) prints unchanged', (binding) => {
    expect(printSpec(wideDoc('W32', binding), { dialect: 'nand2tetris', chips: wide })).toBe(literalText('W32', binding))
  })

  it.each(['a=true', 'a[8..31]=true'])('W32(%s) prints as written in the hacer dialect, and in the export when the registry lacks W32', (binding) => {
    const doc = wideDoc('W32', binding)
    expect(printSpec(doc, { chips: wide })).toContain(`    W32(${binding}, hi=hi, lo=lo); // #p1\n`)
    expect(printSpec(doc, { dialect: 'nand2tetris' })).toBe(literalText('W32', binding))
  })
})
