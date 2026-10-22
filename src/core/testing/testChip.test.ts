import { describe, expect, it } from 'vitest'
import { loadChipTest, testChip, type TestSource } from './testChip'

describe('a chip the registry refuses to register', () => {
  it.each([
    ['an IN and an OUT of one name', 'C', 'CHIP C { IN a; OUT a; PARTS: Not(in=a, out=a); }', 'Duplicate pin name: "a"'],
    ['an IN and an OUT of one name, no parts', 'C', 'CHIP C { IN a; OUT a; PARTS: }', 'Duplicate pin name: "a"'],
    ['two INs of one name', 'C', 'CHIP C { IN a, a; OUT o; PARTS: Not(in=a, out=o); }', 'Duplicate pin name: "a"'],
    ['two OUTs of one name', 'C', 'CHIP C { IN a; OUT o, o; PARTS: Not(in=a, out=o); }', 'Duplicate pin name: "o"'],
    ['two names each used twice', 'C', 'CHIP C { IN a, b; OUT a, b; PARTS: }', 'Duplicate pin name: "a"; Duplicate pin name: "b"'],
    ['a primitive BUILTIN as itself', 'Nand', 'CHIP Nand { IN a, b; OUT a; BUILTIN Nand; }', 'Duplicate pin name: "a"'],
  ])("is an error report naming the chip and the registry's reason, from testChip and loadChipTest: %s", (_, chip, hdl, reason) => {
    const hdlFile = { path: `${chip}.hdl`, source: hdl }
    const tstFile = { path: `${chip}.tst`, source: `load ${chip}.hdl,\neval,\n` }
    const report = { status: 'error', chip, rows: null, failure: null, error: reason }
    expect(testChip(hdlFile, tstFile, { path: `${chip}.cmp`, source: '|a|\n' })).toEqual(report)
    expect(loadChipTest(hdlFile, tstFile)).toEqual(report)
  })
})

describe("a BUILTIN body declares the builtin's own pins (#919)", () => {
  const VECTORS = import.meta.glob<string>('../../../conformance/vectors/01/Nand.{tst,cmp}', { query: '?raw', import: 'default', eager: true })
  const vector = (file: string): TestSource => ({ path: file, source: VECTORS[`../../../conformance/vectors/01/${file}`] })
  const nand = (ins: string): TestSource => ({ path: 'Nand.hdl', source: `CHIP Nand { IN ${ins}; OUT out; BUILTIN; }` })

  it.each([
    ['x, y', 'Nand declares IN x, y, but builtin Nand declares IN a, b'],
    ['a[2], b', 'Nand declares IN a[2], b, but builtin Nand declares IN a, b'],
  ])('refuses CHIP Nand { IN %s; OUT out; BUILTIN; } from testChip and loadChipTest, naming both sides', (ins, error) => {
    const report = { status: 'error', chip: 'Nand', rows: null, failure: null, error }
    expect(testChip(nand(ins), vector('Nand.tst'), vector('Nand.cmp'))).toEqual(report)
    expect(loadChipTest(nand(ins), vector('Nand.tst'))).toEqual(report)
  })

  it('passes CHIP Nand { IN b, a; OUT out; BUILTIN; }, which differs from the builtin only in order, on the course vectors', () => {
    expect(testChip(nand('b, a'), vector('Nand.tst'), vector('Nand.cmp'))).toEqual({ status: 'pass', chip: 'Nand', rows: { passed: 4, expected: 4 }, failure: null, error: null })
  })
})
