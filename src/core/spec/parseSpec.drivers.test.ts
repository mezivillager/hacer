import { describe, expect, it } from 'vitest'
import { parseSpec } from './parseSpec'
import type { SpecDiagnostic } from './types'

const chip = (ports: string, parts: string): string => `CHIP X {\n    ${ports}\n    PARTS:\n${parts}\n}\n`

function diagnosticsOf(source: string): SpecDiagnostic[] {
  const result = parseSpec(source)
  if (result.doc === null) throw new Error(result.diagnostics.map((d) => d.message).join('; '))
  return result.diagnostics.filter((d) => d.code === 'multiple-drivers')
}

// §1.8: two sources on one bit parse, and the drawing shows the diagnostic compileSpec will refuse on.
describe('parseSpec — two sources on the same bit (§1.8)', () => {
  it('diagnoses two nets driving one bit of a signal, naming both', () => {
    const found = diagnosticsOf(chip('IN a[2], b; OUT out[2];', '    Not(in=b, out=out[0]); // #p1\n    Not16(in[0..1]=a, out[0..1]=out); // #p2'))
    expect(found).toEqual([expect.objectContaining({ severity: 'error', message: expect.stringMatching(/"out\[0\]".*"out"|"out".*"out\[0\]"/) })])
  })

  it('diagnoses C8, one input pin bound by two nets, and keeps both bindings', () => {
    const result = parseSpec(chip('IN a, b; OUT out;', '    Not(in=a, in=b, out=out); // #p1'))
    expect(result.diagnostics.filter((d) => d.code === 'multiple-drivers')).toEqual([expect.objectContaining({ partId: 'p1' })])
    expect(result.doc?.nets.filter((n) => n.sinks.some((s) => s.kind === 'part-pin' && s.pin === 'in')).map((n) => n.id)).toEqual(['a', 'b'])
  })

  it('accepts disjoint bits on either side: a dissolved joiner, and a pin bound in pieces', () => {
    expect(diagnosticsOf(chip('IN a, b; OUT out[2], any;', '    Not(in=a, out=out[0]); // #p1\n    Not(in=b, out=out[1]); // #p2\n    Or8Way(in[0]=a, in[1]=b, out=any); // #p3'))).toEqual([])
  })
})

// A chip input is one source however it is read: whole, sliced, or in overlapping slices (§1 fan-out).
describe('parseSpec — reads of a chip input are fan-out, never a second source', () => {
  it.each([
    ['read whole and sliced', chip('IN a[16]; OUT out[16], o;', '    Not16(in=a, out=out); // #p1\n    Not(in=a[0], out=o); // #p2')],
    ['read in overlapping slices', chip('IN a[4]; OUT o, p;', '    Or8Way(in[0..2]=a[0..2], out=o); // #p1\n    Or8Way(in[0..1]=a[2..3], out=p); // #p2')],
  ])('accepts a chip input %s', (_shape, source) => {
    const result = parseSpec(source)
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([])
  })

  it("accepts Project 5's Memory, which reads address whole-ish, sliced and overlapping", () => {
    const memory = `CHIP Memory { IN in[16], load, address[15]; OUT out[16];
    PARTS:
    DMux4Way(in=load, sel=address[13..14], a=l0, b=l1, c=ls, d=lk);
    Or(a=l0, b=l1, out=lr);
    RAM16K(in=in, load=lr, address=address[0..13], out=ro);
    Screen(in=in, load=ls, address=address[0..12], out=so);
    Keyboard(out=ko);
    Mux4Way16(a=ro, b=ro, c=so, d=ko, sel=address[13..14], out=out);
}`
    expect(diagnosticsOf(memory)).toEqual([])
  })

  it("accepts Project 5's CPU shape, and an unknown chip's output bound twice is not a pin bound twice", () => {
    const cpu = `CHIP CPU { IN inM[16], instruction[16], reset; OUT outM[16], writeM, addressM[15], pc[15];
    PARTS:
    Mux16(a=instruction, b=aluOut, sel=instruction[15], out=aIn);
    Not(in=instruction[15], out=isA);
    Or(a=isA, b=instruction[5], out=loadA);
    ARegister(in=aIn, load=loadA, out=aOut, out[0..14]=addressM);
    And(a=instruction[15], b=instruction[3], out=writeM);
    Not16(in=aOut, out=aluOut);
}`
    expect(diagnosticsOf(cpu)).toEqual([])
  })
})

describe('parseSpec — what an unknown chip and a written chip input report', () => {
  it("does not call an unknown chip's outputs undriven, since the chip may drive them", () => {
    const result = parseSpec(chip('IN in[16], load; OUT out[16];', '    RAM16K(in=in, load=load, address=in[0..13], out=ro); // #p1\n    Not16(in=ro, out=out); // #p2'))
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toEqual(['unknown-chip'])
  })

  it('names the part that writes a chip input', () => {
    const result = parseSpec(chip('IN a, b; OUT out;', '    Not(in=b, out=a); // #p1\n    Not(in=a, out=out); // #p2'))
    expect(result.diagnostics).toEqual([expect.objectContaining({ code: 'multiple-drivers', partId: 'p1', message: expect.stringContaining('p1.out') })])
  })
})

// A wire from a chip input writes the chip output it targets, so unlike a read it claims that output's bits.
describe('parseSpec — a wire from a chip input is a source of its target', () => {
  it.each([
    ['a part and a whole wire', 'IN a, b[2]; OUT out[2];', '    Not(in=a, out=out[0]); // #p1\n    wire out = b;'],
    ['a part and a sliced wire', 'IN a, b[2]; OUT out[2];', '    Not(in=a, out=out[0]); // #p1\n    wire out[0..1] = b;'],
    ['a part writing a slice and a wire on one of its bits', 'IN a[2], b; OUT out[2];', '    Not16(in[0..1]=a, out[0..1]=out); // #p1\n    wire out[1] = b;'],
    ['two wires on one bit', 'IN a[2], b; OUT out[2];', '    wire out = a;\n    wire out[0] = b;'],
    ['a chip-input wire and an output alias', 'IN a, b[2]; OUT x[2], y[2];', '    Not16(in[0..1]=b, out[0..1]=y); // #p1\n    wire x[0] = a;\n    wire x = y;'],
  ])('diagnoses %s on one output bit', (_shape, ports, parts) => {
    expect(diagnosticsOf(chip(ports, parts))).toEqual([expect.objectContaining({ code: 'multiple-drivers', severity: 'error' })])
  })

  it('accepts a wire and a part on disjoint bits of one output, the dissolved joiner', () => {
    expect(diagnosticsOf(chip('IN a, b; OUT out[2];', '    Not(in=a, out=out[0]); // #p1\n    wire out[1] = b;'))).toEqual([])
  })
})
