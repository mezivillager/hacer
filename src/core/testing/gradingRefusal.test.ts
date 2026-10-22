import { describe, expect, it } from 'vitest'
import { registerProject1Builtins } from '../chips/builtins/project01'
import { createChipRegistry } from '../chips/registry'
import { compileHDL } from '../hdl/compiler'
import { parseHDL } from '../hdl/parser'
import { project1HdlSources } from '../hdl/project1HdlSources'
import { gradingRefusal } from './gradingRefusal'
import { testChip, type TestReport } from './testChip'

const parts = createChipRegistry()
registerProject1Builtins(parts)

function refusalOf(hdl: string): string | null {
  const parsed = parseHDL(hdl)
  if (!parsed.success) throw new Error(parsed.errors[0].message)
  return gradingRefusal(parsed.chip, parts)
}

/** Line 1 is `CHIP C {`, line 2 the pins, line 3 `PARTS:`, so the first part is on line 4. */
const chipC = (pins: string, ...partLines: string[]): string => ['CHIP C {', pins, 'PARTS:', ...partLines, '}'].join('\n')

const OUT_READ = 'Cannot use output pin as input'
const internalPin = (pin: string): string => `Internal pins (in this case: ${pin}) cannot be subscripted or indexed`
const nameRule = (name: string): string => `Name "${name}" contains "_": a name is a letter, then letters and digits`

/** Shapes whose first cause in the reference is one compileHDL also refuses, before a later chip-OUT read or subscript. */
const DEFERRED = {
  A1: chipC('IN a, b; OUT o, p;', 'Not(in=a, in=b, out=o);', 'Not(in=o, out=p);'),
  A2: chipC('IN a, b; OUT o, p;', 'Not(in=a, out=o);', 'And(a=a, a=b, b=o, out=p);'),
  A3: chipC('IN a; OUT o, p;', 'Not(in=a, out=o);', 'Not(in=a, out=o);', 'Not(in=o, out=p);'),
  A4: chipC('IN a; OUT o;', 'Not(in=a, out=t);', 'Not(in=a, out=t);', 'Not(in=t[0], out=o);'),
  A5: chipC('IN a; OUT o, p;', 'Not(in=a[3], out=o);', 'Not(in=o, out=p);'),
  A6: chipC('IN a; OUT o, p;', 'Not(in[2]=a, out=o);', 'Not(in=o, out=p);'),
}

/** Shapes the reference refuses with a double assignment or `already defined` on line 4 or 5. */
const SAFETY = {
  S1: chipC('IN a, b; OUT o, p;', 'Nand(a=a, b=b, out=t, out=t);', 'Not(in=t, out=o);', 'Not(in=o, out=p);'),
  S2: chipC('IN a, b; OUT o, p;', 'Nand(a=a, b=b, out=o, out=o);', 'Not(in=o, out=p);'),
  S3: chipC('IN a; OUT o, p;', 'Not(in=true, in=a, out=o);', 'Not(in=o, out=p);'),
  S4: chipC('IN a; OUT o, p;', 'Not(in=a, in=a, out=o);', 'Not(in=o, out=p);'),
  S5: chipC('IN b[16]; OUT o, p;', 'Not16(in=b, out[0]=o, out[1]=o);', 'Not(in=o, out=p);'),
  S6: chipC('IN b[16]; OUT o, p;', 'Not16(in=b, out[0..7]=t, out[8..15]=t);', 'Not(in=b[0], out=o);', 'Not(in=o, out=p);'),
  S7: chipC('IN b[16]; OUT o[16], p;', 'Not16(in=b, out=o);', 'Not(in=b[0], out=o[0]);', 'Not(in=o[0], out=p);'),
  S8: chipC('IN a, b[16]; OUT o, p;', 'Not16(in=b, in[0]=a, out[0]=o);', 'Not(in=o, out=p);'),
  S9: chipC('IN b[16]; OUT o[16], p;', 'Not16(in=b, out[0..3]=o[0..3]);', 'Not16(in=b, out[0..1]=o[2..3]);', 'Not(in=o[0], out=p);'),
  S10: chipC('IN a; OUT o, p;', 'Not(in=false, in=false, out=o);', 'Not(in=o, out=p);'),
  S11: chipC('IN a; OUT o, p;', 'Not(in=a, out=o);', 'Not(in=a, out=o[0]);', 'Not(in=o, out=p);'),
  S12: chipC('IN a, b; OUT o, p;', 'Or(a=a, b=b, out=t);', 'And(a=a, b=b, out=t);', 'Not(in=t, out=o);', 'Not(in=o, out=p);'),
}

describe('gradingRefusal', () => {
  it.each([
    ['a part input bound to a chip OUT', chipC('IN a; OUT o, p;', 'Not(in=a, out=o);', 'Not(in=o, out=p);'), `Line 5: ${OUT_READ}`],
    ['a part input bound to a bit of a chip OUT', chipC('IN a[2]; OUT o[2], p;', 'Not16(in[0..1]=a, out[0..1]=o);', 'Not(in=o[1], out=p);'), `Line 5: ${OUT_READ}`],
    ['a chip OUT read before the part that writes it', chipC('IN a; OUT o, p;', 'And(a=a, b=o, out=p);', 'Not(in=a, out=o);'), `Line 4: ${OUT_READ}`],
    ['an internal pin read by subscript', chipC('IN a; OUT o;', 'Not(in=a, out=t);', 'Not(in=t[0], out=o);'), `Line 5: ${internalPin('t')}`],
    ['an internal pin written by subscript', chipC('IN a; OUT o;', 'Not(in=a, out=t[0]);', 'Not(in=t, out=o);'), `Line 4: ${internalPin('t')}`],
    ['an internal pin read by range', chipC('IN a[16]; OUT o;', 'Not16(in=a, out[0..3]=nib);', 'Not16(in[0..3]=nib[0..3], out[0]=o);'), `Line 5: ${internalPin('nib')}`],
    ['a subscript of a pin nothing drives', chipC('IN a; OUT o;', 'Not(in=x[0], out=o);'), `Line 4: ${internalPin('x')}`],
  ])("refuses %s with the reference's sentence, after the part's line", (_, hdl, refusal) => {
    expect(refusalOf(hdl)).toBe(refusal)
  })

  it.each([
    ['a chip OUT', chipC('IN a; OUT o[2];', 'Not(in=a, out=o[1]);', 'Not(in=o[1], out=o[0]);'), 'Line 5: Looping wire o'],
    [
      'an internal pin, ahead of its subscript',
      chipC('IN a; OUT out[16];', 'Not16(in[0]=t[0], out[1]=t[1]);', 'Not(in=a, out=t[0]);', 'Not16(in=t, out=out);'),
      'Line 4: Looping wire t',
    ],
  ])("refuses a part that reads and writes disjoint bits of one name with the reference's Looping wire: %s", (_, hdl, refusal) => {
    expect(refusalOf(hdl)).toBe(refusal)
  })

  it('leaves a part whose read and written bits of one name meet at one bit to compileHDL, which refuses it', () => {
    const hdl = chipC('IN a; OUT o[8];', 'Not16(in[0..3]=o[0..3], out[0..3]=o[3..6]);')
    expect(refusalOf(hdl)).toBeNull()
    const parsed = parseHDL(hdl)
    if (!parsed.success) throw new Error(parsed.errors[0].message)
    expect(compileHDL(parsed.chip, parts).success).toBe(false)
  })

  it.each([
    ['the chip', 'CHIP My_Chip { IN a; OUT o; PARTS: Not(in=a, out=o); }', nameRule('My_Chip')],
    ['an input pin', 'CHIP C { IN _a; OUT o; PARTS: Not(in=_a, out=o); }', nameRule('_a')],
    ['an output pin', 'CHIP C { IN a; OUT o_c; PARTS: Not(in=a, out=o_c); }', nameRule('o_c')],
    ['a part', chipC('IN a; OUT o;', 'Not(in=a, out=o);', 'My_Not(in=a, out=p);'), `Line 5: ${nameRule('My_Not')}`],
    ['a part pin', chipC('IN a; OUT o;', 'Not(in_1=a, out=o);'), `Line 4: ${nameRule('in_1')}`],
    ['an internal signal', chipC('IN a; OUT o;', 'Not(in=a, out=t_1);', 'Not(in=t_1, out=o);'), `Line 4: ${nameRule('t_1')}`],
  ])('refuses a "_" in the name of %s, naming it and the rule', (_, hdl, refusal) => {
    expect(refusalOf(hdl)).toBe(refusal)
  })

  it('refuses a "_" before a miswired part above it, as the grammar fails before the builder runs', () => {
    expect(refusalOf(chipC('IN a; OUT o, p;', 'Not(in=a, out=o);', 'Not(in=o, out=p);', 'Not(in=a, out=q_1);'))).toBe(`Line 6: ${nameRule('q_1')}`)
  })

  it.each(Object.keys(project1HdlSources))('finds nothing in the shipped %s', (chip) => {
    expect(refusalOf(project1HdlSources[chip])).toBeNull()
  })

  it.each([
    ['a part output bound to a chip OUT and an internal pin', chipC('IN a; OUT o, p;', 'Not(in=a, out=o, out=t);', 'Not(in=t, out=p);')],
    ['subscripts of a chip IN and of a chip OUT written', chipC('IN a[2]; OUT o[2];', 'Not(in=a[1], out=o[0]);', 'Not(in=a[0], out=o[1]);')],
    ['constants on part inputs', chipC('IN a; OUT o;', 'And(a=true, b=false, out=o);')],
    ['an IN named like a part pin', chipC('IN out; OUT o;', 'Not(in=out, out=w);', 'Not(in=w, out=o);')],
  ])('accepts %s', (_, hdl) => {
    expect(refusalOf(hdl)).toBeNull()
  })

  it.each([
    ['a part it cannot resolve', chipC('IN a; OUT o, p;', 'Foo(in=a, out=o);', 'Not(in=o, out=p);')],
    ['the chip used as its own part', 'CHIP Not { IN in; OUT out, p; PARTS: Not(in=in, out=out); Not(in=out, out=p); }'],
    ['a looping wire', chipC('IN a; OUT a;', 'Not(in=a, out=a);')],
    ['a pin the part does not have', chipC('IN a; OUT o, p;', 'Not(x=a, out=o);', 'Not(in=o, out=p);')],
    ['a write to a chip IN', chipC('IN a, b; OUT o, p;', 'Not(in=b, out=a);', 'Not(in=o, out=p);')],
    ['a write to a constant', chipC('IN a; OUT o, p;', 'Not(in=a, out=true);', 'Not(in=o, out=p);')],
  ])('leaves it to compileHDL when the reference refuses %s first', (_, hdl) => {
    expect(refusalOf(hdl)).toBeNull()
  })
})

describe('the grading path', () => {
  const graded = (hdl: string, chip = 'P'): string | null =>
    testChip({ path: `${chip}.hdl`, source: hdl }, { path: `${chip}.tst`, source: `load ${chip}.hdl,\neval,\n` }, { path: `${chip}.cmp`, source: '|o|\n' }).error

  it.each([
    ['a bit of an internal pin past its width', 'CHIP P { IN a[16]; OUT o; PARTS: Not16(in=a, out=t); Not(in=t[16], out=o); }', internalPin('t')],
    ['a bit of a nibble past its width', 'CHIP P { IN a[16]; OUT o; PARTS: Not16(in=a, out[0..3]=nib); Not(in=nib[4], out=o); }', internalPin('nib')],
    ['a range of a nibble past its width', 'CHIP P { IN a[16]; OUT o; PARTS: Not16(in=a, out[0..3]=nib); Not16(in[0..3]=nib[1..4], out[0]=o); }', internalPin('nib')],
    ['a bit of a chip OUT past its width', 'CHIP P { IN a[2]; OUT o[2], p; PARTS: Not16(in[0..1]=a, out[0..1]=o); Not(in=o[2], out=p); }', OUT_READ],
    ['a bit of a one-bit chip OUT past its width', 'CHIP P { IN a; OUT o, p; PARTS: Not(in=a, out=o); Not(in=o[1], out=p); }', OUT_READ],
    ['a subscript of a pin nothing drives', 'CHIP P { IN a; OUT o; PARTS: Not(in=x[0], out=o); }', internalPin('x')],
  ])("gives the reference's cause, not compileHDL's, for %s", (_, hdl, refusal) => {
    expect(graded(hdl)).toBe(`Line 1: ${refusal}`)
  })

  it.each([
    ['A1', 'a part input bound twice', 'Line 4: Part "Not" pin "in" bit 0 is bound by more than one connection'],
    ['A2', 'a part input bound twice', 'Line 5: Part "And" pin "a" bit 0 is bound by more than one connection'],
    ['A3', 'a chip OUT written again', 'Line 5: Signal "o" is driven by more than one part'],
    ['A4', 'an internal pin written again', 'Line 5: Signal "t" is driven by more than one part'],
    ['A5', 'a chip IN bit past its width', 'Line 4: Part "Not" pin "in" is wired to "a[3]": sub-bus index out of range ("a" has width 1)'],
    ['A6', 'a part pin bit past its width', 'Line 4: Part "Not" pin "in[2]" is out of range; "in" has width 1'],
  ] as const)("gives compileHDL's refusal on the reference's line where %s's first cause is %s", (id, _, refusal) => {
    expect(graded(DEFERRED[id], 'C')).toBe(refusal)
  })

  it.each([
    ['A1', chipC('IN a, b; OUT o, p;', 'Not(in=a, out=o);', 'Not(in=o, out=p);'), `Line 5: ${OUT_READ}`],
    ['A2', chipC('IN a, b; OUT o, p;', 'Not(in=a, out=o);', 'And(a=a, b=o, out=p);'), `Line 5: ${OUT_READ}`],
    ['A3', chipC('IN a; OUT o, p;', 'Not(in=a, out=o);', 'Not(in=a, out=q);', 'Not(in=o, out=p);'), `Line 6: ${OUT_READ}`],
    ['A4', chipC('IN a; OUT o;', 'Not(in=a, out=t);', 'Not(in=a, out=u);', 'Not(in=t[0], out=o);'), `Line 6: ${internalPin('t')}`],
    ['A5', chipC('IN a; OUT o, p;', 'Not(in=a[0], out=o);', 'Not(in=o, out=p);'), `Line 5: ${OUT_READ}`],
    ['A6', chipC('IN a; OUT o, p;', 'Not(in[0]=a, out=o);', 'Not(in=o, out=p);'), `Line 5: ${OUT_READ}`],
  ])("gives the later part's sentence again once %s's first cause is removed", (_, hdl, refusal) => {
    expect(graded(hdl, 'C')).toBe(refusal)
  })

  it.each([
    ['B1', chipC('IN a; OUT o, p;', 'Not(in=a, out=o);', 'And(a=a[3], b=o, out=p);'), `Line 5: ${OUT_READ}`],
    ['B2', chipC('IN a; OUT o, p;', 'Not(in=a, out=o);', 'And(a[1]=a, b=o, out=p);'), `Line 5: ${OUT_READ}`],
    ['B3', chipC('IN a; OUT o;', 'Not(in=a, out=t);', 'And(a=a[3], b=t[0], out=o);'), `Line 5: ${internalPin('t')}`],
    ['B5', chipC('IN a; OUT o, p;', 'Not(in=a, out=o);', 'And(out=p[3], a=o, b=a);'), `Line 5: ${OUT_READ}`],
    ['C1', chipC('IN a; OUT o, p;', 'Not(in=a, out=o);', 'Not(in=a, in=o, out=p);'), `Line 5: ${OUT_READ}`],
    ['D3', chipC('IN a, b[16]; OUT o, p;', 'Not(in=a, out=o);', 'Not16(in[0]=a, in=b, out[0]=w);', 'And(a=o, b=w, out=p);'), `Line 6: ${OUT_READ}`],
    ['D5', chipC('IN a, b[16]; OUT o[16], p;', 'Not(in=a, out=o[0]);', 'Not16(in=b, out=o);', 'Not(in=o[1], out=p);'), `Line 6: ${OUT_READ}`],
  ])("keeps the reference's sentence and line for %s", (_, hdl, refusal) => {
    expect(graded(hdl, 'C')).toBe(refusal)
  })

  /** `IN` on line 2, `OUT` on line 3, `PARTS:` on line 4, so the first part is on line 5. */
  function gradedLaidOut(out: string, partLines: readonly string[]): Pick<TestReport, 'status' | 'error'> {
    const pin = out.split('[')[0]
    const hdl = ['CHIP C {', '  IN a;', `  OUT ${out};`, '  PARTS:', ...partLines.map((line) => `  ${line}`), '}'].join('\n')
    const tst = ['load C.hdl,', 'output-file C.out,', 'compare-to C.cmp,', `output-list a%B3.1.3 ${pin}%B1.2.1;`, 'set a 0, eval, output;', 'set a 1, eval, output;']
    const cmp = [`|   a   |  ${pin}   |`, '|   0   |  10  |', '|   1   |  01  |']
    const { status, error } = testChip({ path: 'C.hdl', source: hdl }, { path: 'C.tst', source: tst.join('\n') }, { path: 'C.cmp', source: cmp.join('\n') })
    return { status, error }
  }

  it.each([
    ['a part reading o[1] and writing o[0]', 'o[2]', ['Not(in=a, out=o[1]);', 'Not(in=o[1], out=o[0]);'], 'Line 6: Looping wire o'],
    ['that part ahead of a cycle across parts', 'o[2]', ['Not(in=a, out=o[1]);', 'Not(in=o[1], out=o[0]);', 'Not(in=y, out=x);', 'Not(in=x, out=y);'], 'Line 6: Looping wire o'],
    ['two parts looping through bits of an internal pin', 'out', ['Not(in=w[1], out=w[0]);', 'Not(in=w[0], out=w[1]);', 'And(a=w[0], b=w[1], out=out);'], 'Line 5: Looping wire w'],
  ] as const)("gives the reference's Looping wire on the looping part's line for %s", (_, out, partLines, error) => {
    expect(gradedLaidOut(out, partLines)).toEqual({ status: 'error', error })
  })
})

describe('compileHDL alone', () => {
  it.each(Object.entries({ ...DEFERRED, ...SAFETY }))('refuses %s, so leaving its first cause to compileHDL never grades it', (_, hdl) => {
    const parsed = parseHDL(hdl)
    if (!parsed.success) throw new Error(parsed.errors[0].message)
    expect(compileHDL(parsed.chip, parts).success).toBe(false)
  })
})
