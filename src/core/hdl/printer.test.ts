// src/core/hdl/printer.test.ts
import { describe, it, expect } from 'vitest'
import { parseHDL } from './parser'
import { printHDL } from './printer'
import type { HDLChip } from './types'
import { project1HdlSources } from './project1HdlSources'

function parseOrThrow(source: string): HDLChip {
  const result = parseHDL(source)
  if (!result.success) throw new Error(`parse failed: ${result.errors.map((e) => e.message).join('; ')}`)
  return result.chip
}

/** Print the AST, parse the print, and hand back the second AST for comparison. */
function roundTrip(source: string): { printed: string; before: HDLChip; after: HDLChip } {
  const before = parseOrThrow(source)
  const printed = printHDL(before)
  return { printed, before, after: parseOrThrow(printed) }
}

// Sources the round trip must survive: the shapes the parser can produce, including the part-pin
// slices of #357 on both sides of a wire.
const CORPUS: Record<string, string> = {
  ...project1HdlSources,
  Builtin: 'CHIP Nand { IN a, b; OUT out; PARTS: BUILTIN Nand; }',
  EmptyParts: 'CHIP Stub { IN in; OUT out; PARTS: }',
  Literals: 'CHIP L { IN a; OUT out; PARTS: Nand(a=a, b=true, out=w); Nand(a=w, b=false, out=out); }',
  PartPinSlice: 'CHIP P { IN a, b; OUT out; PARTS: Or8Way(in[0]=a, in[1]=b, out=out); }',
  BothSidesSliced: 'CHIP B { IN bus[16]; OUT out[16]; PARTS: Not16(in[0..7]=bus[8..15], in[8..15]=bus[0..7], out=out); }',
  SlicedPartOutput: 'CHIP S { IN a[16]; OUT out; PARTS: Not16(in=a, out[0]=out); }',
  SlicedLiteral: 'CHIP T { IN a; OUT out[16]; PARTS: Not16(in[0..3]=true, in[4..15]=false, out=out); }',
}

describe('printHDL', () => {
  it('emits a slice on the part pin', () => {
    expect(printHDL(parseOrThrow(CORPUS.PartPinSlice))).toContain('Or8Way(in[0]=a, in[1]=b, out=out)')
  })

  it('emits both sides of a connection independently', () => {
    expect(printHDL(parseOrThrow(CORPUS.BothSidesSliced))).toContain('in[0..7]=bus[8..15]')
  })

  it('emits pin widths, BUILTIN bodies and literals', () => {
    const printed = printHDL(parseOrThrow(CORPUS.Builtin))
    expect(printed).toContain('CHIP Nand {')
    expect(printed).toContain('BUILTIN Nand;')
    expect(printHDL(parseOrThrow(CORPUS.Literals))).toContain('b=true')
    expect(printHDL(parseOrThrow(CORPUS.SlicedPartOutput))).toContain('IN a[16];')
  })

  for (const [name, source] of Object.entries(CORPUS)) {
    it(`round-trips ${name} to the same tree`, () => {
      const { before, after } = roundTrip(source)
      expect(after).toEqual(before)
    })
  }

  it('is idempotent: printing a re-parsed print gives the same text', () => {
    for (const source of Object.values(CORPUS)) {
      const { printed, after } = roundTrip(source)
      expect(printHDL(after)).toBe(printed)
    }
  })
})
