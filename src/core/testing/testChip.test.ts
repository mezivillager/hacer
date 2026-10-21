import { describe, expect, it } from 'vitest'
import { loadChipTest, testChip } from './testChip'

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
