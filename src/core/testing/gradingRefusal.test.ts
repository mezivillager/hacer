import { describe, expect, it } from 'vitest'
import { registerProject1Builtins } from '../chips/builtins/project01'
import { createChipRegistry } from '../chips/registry'
import { parseHDL } from '../hdl/parser'
import { project1HdlSources } from '../hdl/project1HdlSources'
import { gradingRefusal } from './gradingRefusal'
import { testChip } from './testChip'

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
  const graded = (hdl: string): string | null =>
    testChip({ path: 'P.hdl', source: hdl }, { path: 'P.tst', source: 'load P.hdl,\neval,\n' }, { path: 'P.cmp', source: '|o|\n' }).error

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
})
