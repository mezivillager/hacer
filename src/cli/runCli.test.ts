import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { project1HdlSources } from '@/core'
import { runCli } from './runCli'

const VECTORS = fileURLToPath(new URL('../../conformance/vectors/01/', import.meta.url))

/** Reads a bare file name from the vendored vectors, unless `overrides` holds it in memory. */
const reader =
  (overrides: Record<string, string> = {}) =>
  (file: string): string =>
    file in overrides ? overrides[file] : readFileSync(path.join(VECTORS, file), 'utf8')

const vectorArgs = (chip: string): string[] => ['test', `${chip}.hdl`, `${chip}.tst`, `${chip}.cmp`]

// Every vendored `.hdl` except Nand's (`BUILTIN Nand;`) is an empty-PARTS template.
const TEMPLATES = readdirSync(VECTORS)
  .filter((file) => file.endsWith('.hdl') && file !== 'Nand.hdl')
  .map((file) => file.slice(0, -'.hdl'.length))

describe('runCli', () => {
  it('finds the 15 vendored templates', () => {
    expect(TEMPLATES).toHaveLength(15)
  })

  it.each(TEMPLATES)('fails the empty %s template: its builtin namesake never stands in', (chip) => {
    const out = runCli(vectorArgs(chip), reader())
    expect(out.exitCode).toBe(1)
    expect(out.stdout).toMatch(new RegExp(`^FAIL ${chip} row \\d+: `))
  })

  it('passes a correct implementation and counts the rows it matched', () => {
    const out = runCli(vectorArgs('Xor'), reader({ 'Xor.hdl': project1HdlSources.Xor }))
    expect(out).toEqual({ exitCode: 0, stdout: 'PASS Xor 4/4 rows\n', stderr: '' })
  })

  it('refuses a .tst that loads a chip other than the one the .hdl defines', () => {
    // Running it would test the builtin And, not the file.
    const out = runCli(['test', 'Xor.hdl', 'And.tst', 'And.cmp'], reader({ 'Xor.hdl': project1HdlSources.Xor }))
    expect(out.exitCode).toBe(1)
    expect(out.stdout).toBe('ERROR Xor: And.tst loads And.hdl, but Xor.hdl defines Xor\n')
  })

  it('reports a parse error with its file, line and column', () => {
    const out = runCli(vectorArgs('Xor'), reader({ 'Xor.hdl': 'CHIP Xor {\n  IN a b;' }))
    expect(out.exitCode).toBe(1)
    expect(out.stdout).toMatch(/^ERROR Xor\.hdl:\d+:\d+: /)
  })

  it('refuses an unconnected part input, naming what the nand2tetris simulator reads and how to match it', () => {
    const out = runCli(vectorArgs('And'), reader({ 'And.hdl': 'CHIP And {\n  IN a, b;\n  OUT out;\n  PARTS:\n  Nand(a=a, out=out);\n}' }))
    expect(out).toEqual({ exitCode: 1, stdout: 'ERROR And: Line 5: Part "Nand" input pin "b" is not connected: the nand2tetris simulator reads it as 0; bind b=false to do the same\n', stderr: '' })
  })

  it("refuses a chip that names itself with the reference's sentence and line", () => {
    const out = runCli(vectorArgs('Not'), reader({ 'Not.hdl': 'CHIP Not {\n  IN in;\n  OUT out;\n\n  PARTS:\n  Not(in=in, out=out);\n}' }))
    expect(out).toEqual({ exitCode: 1, stdout: 'ERROR Not: Line 6: Cannot use chip Not to implement itself\n', stderr: '' })
  })

  it('reports an unreadable file as an error, not a crash', () => {
    const out = runCli(['test', 'Missing.hdl', 'Xor.tst', 'Xor.cmp'], reader())
    expect(out.exitCode).toBe(1)
    expect(out.stdout).toMatch(/^ERROR .*Missing\.hdl/)
  })

  it('prints the report as one JSON object with --json', () => {
    const out = runCli(['test', '--json', ...vectorArgs('Xor').slice(1)], reader())
    expect(out.exitCode).toBe(1)
    expect(JSON.parse(out.stdout)).toEqual({
      status: 'fail',
      chip: 'Xor',
      rows: { passed: 1, expected: 4 },
      failure: { row: 2, column: 'out', expected: '1', actual: '0' },
      error: null,
    })
  })

  it.each([
    ['Xor', 'BUILTIN Xor;'],
    ['Xor', 'BUILTIN And;'],
    ['Xor', 'BUILTIN Nand;'],
  ])('refuses %s.hdl as `%s`: a builtin stands in for the design, so it can never pass', (chip, parts) => {
    const hdl = `CHIP ${chip} {\n  IN a, b;\n  OUT out;\n  PARTS:\n  ${parts}\n}`
    const out = runCli(vectorArgs(chip), reader({ [`${chip}.hdl`]: hdl }))
    expect(out.exitCode).toBe(1)
    expect(out.stdout).toMatch(new RegExp(`^ERROR ${chip}: ${parts.slice(0, -1)} in ${chip}: .*built from parts`))
    const json = runCli(['test', '--json', ...vectorArgs(chip).slice(1)], reader({ [`${chip}.hdl`]: hdl }))
    expect(JSON.parse(json.stdout)).toMatchObject({ status: 'error', chip, rows: null })
  })

  it.each(['BUILTIN;', 'BUILTIN Xor;'])('refuses Xor.hdl as `%s` without PARTS: for the builtin, not a parse error', (body) => {
    const out = runCli(vectorArgs('Xor'), reader({ 'Xor.hdl': `CHIP Xor {\n  IN a, b;\n  OUT out;\n  ${body}\n}` }))
    expect(out).toMatchObject({ exitCode: 1, stderr: '' })
    expect(out.stdout).toMatch(/^ERROR Xor: BUILTIN Xor in Xor: .*built from parts/)
  })

  it.each(['BUILTIN;', 'BUILTIN Nand;'])('passes Nand.hdl as `%s` without PARTS: a primitive runs on its builtin', (body) => {
    const out = runCli(vectorArgs('Nand'), reader({ 'Nand.hdl': `CHIP Nand {\n  IN a, b;\n  OUT out;\n  ${body}\n}` }))
    expect(out).toEqual({ exitCode: 0, stdout: 'PASS Nand 4/4 rows\n', stderr: '' })
  })

  it('passes the vendored Nand.hdl, `BUILTIN Nand;`: a primitive may be its own builtin', () => {
    expect(runCli(vectorArgs('Nand'), reader())).toEqual({ exitCode: 0, stdout: 'PASS Nand 4/4 rows\n', stderr: '' })
  })

  it('prints bus values in a mismatch as the .cmp writes them, not in decimal', () => {
    const out = runCli(vectorArgs('Mux16'), reader())
    expect(out.stdout).toBe('FAIL Mux16 row 4: out expected 0001001000110100, got 0000000000000000\n')
    const json = runCli(['test', '--json', ...vectorArgs('Mux16').slice(1)], reader())
    expect(JSON.parse(json.stdout)).toMatchObject({
      failure: { row: 4, column: 'out', expected: '0001001000110100', actual: '0000000000000000' },
    })
  })

  it.each([
    [['--json']],
    [['test', '--json', 'Xor.hdl', 'Xor.tst']],
    [['run', '--json', 'Xor.hdl', 'Xor.tst', 'Xor.cmp']],
    [['run-tst', '--json', 'Xor.hdl', 'Xor.tst']],
  ])('exits 2 with the usage as a JSON report on stdout for %j', (argv: string[]) => {
    const out = runCli(argv, reader())
    expect(out).toMatchObject({ exitCode: 2, stderr: '' })
    expect(JSON.parse(out.stdout)).toEqual({
      status: 'error',
      chip: null,
      rows: null,
      failure: null,
      error: expect.stringMatching(/^usage: hacer test /),
    })
  })

  it.each([
    [[]],
    [['test', 'Xor.hdl', 'Xor.tst']],
    [['test', 'Xor.tst', 'Xor.hdl', 'Xor.cmp']],
    [['run', 'Xor.hdl', 'Xor.tst', 'Xor.cmp']],
  ])('exits 2 with usage on stderr for %j', (argv: string[]) => {
    const out = runCli(argv, reader())
    expect(out.exitCode).toBe(2)
    expect(out.stdout).toBe('')
    expect(out.stderr).toMatch(/^usage: hacer test /)
  })
})

describe('runCli run-tst', () => {
  const CHIPS = readdirSync(VECTORS)
    .filter((file) => file.endsWith('.hdl'))
    .map((file) => file.slice(0, -'.hdl'.length))

  it.each(CHIPS)('prints the table a correct %s writes, which is its .cmp', (chip) => {
    // Nand.hdl is vendored as `BUILTIN Nand;`, already correct.
    const hdl = chip === 'Nand' ? {} : { [`${chip}.hdl`]: project1HdlSources[chip] }
    const out = runCli(['run-tst', `${chip}.hdl`, `${chip}.tst`], reader(hdl))
    expect(out).toEqual({ exitCode: 0, stdout: reader()(`${chip}.cmp`), stderr: '' })
  })

  it('prints the empty Xor template\'s outputs without comparing them, and exits 0', () => {
    const out = runCli(['run-tst', 'Xor.hdl', 'Xor.tst'], reader())
    expect(out).toEqual({
      exitCode: 0,
      stdout: '| a | b |out|\n| 0 | 0 | 0 |\n| 0 | 1 | 0 |\n| 1 | 0 | 0 |\n| 1 | 1 | 0 |\n',
      stderr: '',
    })
  })

  it('exits 1 with the rows so far and the error on stderr when the script fails to run', () => {
    const broken = 'CHIP Xor {\n  IN a, b;\n  OUT out;\n  PARTS:\n  Nope(a=a, out=out);\n}'
    const out = runCli(['run-tst', 'Xor.hdl', 'Xor.tst'], reader({ 'Xor.hdl': broken }))
    expect(out.exitCode).toBe(1)
    expect(out.stdout).toBe('| a | b |out|\n')
    expect(out.stderr).toMatch(/^ERROR Xor: .*Nope/)
  })

  it('exits 1 under test and run-tst when the .tst sets a pin the chip does not have', () => {
    // Apart from `set zzz 0`, the script matches Not.cmp row for row.
    const files = {
      'Not.hdl': project1HdlSources.Not,
      'Not.tst': 'load Not.hdl,\ncompare-to Not.cmp,\noutput-list in out;\n\nset zzz 0,\nset in 0,\neval,\noutput;\n\nset in 1,\neval,\noutput;\n',
    }
    const tested = runCli(vectorArgs('Not'), reader(files))
    expect(tested.exitCode).toBe(1)
    expect(tested.stdout).toMatch(/^ERROR Not: line 5\b.*"zzz"/)
    const ran = runCli(['run-tst', 'Not.hdl', 'Not.tst'], reader(files))
    expect(ran.exitCode).toBe(1)
    expect(ran.stderr).toMatch(/^ERROR Not: line 5\b.*"zzz"/)
  })

  it('refuses a .tst that loads a chip other than the one the .hdl defines', () => {
    const out = runCli(['run-tst', 'Xor.hdl', 'And.tst'], reader({ 'Xor.hdl': project1HdlSources.Xor }))
    expect(out).toEqual({ exitCode: 1, stdout: '', stderr: 'ERROR Xor: And.tst loads And.hdl, but Xor.hdl defines Xor\n' })
  })

  it('reports an unreadable file as an error, not a crash', () => {
    const out = runCli(['run-tst', 'Missing.hdl', 'Xor.tst'], reader())
    expect(out.exitCode).toBe(1)
    expect(out.stderr).toMatch(/^ERROR .*Missing\.hdl/)
  })

  it('is listed by --help', () => {
    expect(runCli(['--help'], reader()).stdout).toContain('hacer run-tst <chip.hdl> <chip.tst>')
  })

  it.each([
    [['run-tst', 'Xor.hdl']],
    [['run-tst', 'Xor.tst', 'Xor.hdl']],
    [['run-tst', 'Xor.hdl', 'Xor.tst', 'Xor.cmp']],
  ])('exits 2 with usage on stderr for %j', (argv: string[]) => {
    const out = runCli(argv, reader())
    expect(out).toMatchObject({ exitCode: 2, stdout: '' })
    expect(out.stderr).toContain('hacer run-tst <chip.hdl> <chip.tst>')
  })
})

describe('runCli test — a slice past the end of a bus is refused, not graded (#371)', () => {
  const OR8WAY_READS_IN8 = `CHIP Or8Way {
    IN in[8];
    OUT out;
    PARTS:
    Or(a=in[0], b=in[1], out=o1); Or(a=o1, b=in[2], out=o2); Or(a=o2, b=in[3], out=o3);
    Or(a=o3, b=in[4], out=o4); Or(a=o4, b=in[5], out=o5); Or(a=o5, b=in[6], out=o6);
    Or(a=o6, b=in[7], out=o7); Or(a=o7, b=in[8], out=out);
}`

  it('refuses an Or8Way that reads in[8], which the official vectors alone would pass', () => {
    const out = runCli(vectorArgs('Or8Way'), reader({ 'Or8Way.hdl': OR8WAY_READS_IN8 }))
    expect(out.exitCode).toBe(1)
    expect(out.stdout).toMatch(/^ERROR Or8Way: .*Part "Or" pin "b" is wired to "in\[8\]": sub-bus index out of range \("in" has width 8\)/)
  })
})

describe('runCli — grading refuses an Or8Way the official vectors pass but the reference does not build (#840)', () => {
  const ORS = ['Or(a=in[0], b=in[1], out=t1);', 'Or(a=t1, b=in[2], out=t2);', 'Or(a=t2, b=in[3], out=t3);', 'Or(a=t3, b=in[4], out=t4);', 'Or(a=t4, b=in[5], out=t5);', 'Or(a=t5, b=in[6], out=t6);']
  // The parts start on line 5.
  const or8Way = (...parts: string[]): string => `CHIP Or8Way {\n  IN in[8];\n  OUT out;\n  PARTS:\n  ${parts.join('\n  ')}\n}`
  const CORRECT = or8Way(...ORS, 'Or(a=t6, b=in[7], out=out);')
  const READS_OUT = or8Way(...ORS, 'Or(a=t6, b=in[7], out=out);', 'Not(in=out, out=spare);')

  it('passes the correct Or8Way, the control', () => {
    expect(runCli(vectorArgs('Or8Way'), reader({ 'Or8Way.hdl': CORRECT }))).toEqual({ exitCode: 0, stdout: 'PASS Or8Way 5/5 rows\n', stderr: '' })
  })

  it.each([
    ['a part reading the chip OUT', READS_OUT, 'Line 12: Cannot use output pin as input'],
    [
      'an internal pin written and read by subscript',
      or8Way(...ORS, 'Or(a=t6, b=in[7], out=t[0]);', 'Or(a=t[0], b=false, out=out);'),
      'Line 11: Internal pins (in this case: t) cannot be subscripted or indexed',
    ],
    [
      'internal names with "_"',
      CORRECT.replace(/\bt(\d)\b/g, 'o_$1'),
      'Line 5: Name "o_1" contains "_": a name is a letter, then letters and digits',
    ],
  ])("refuses %s with the reference's cause", (_, hdl, error) => {
    expect(runCli(vectorArgs('Or8Way'), reader({ 'Or8Way.hdl': hdl }))).toEqual({ exitCode: 1, stdout: `ERROR Or8Way: ${error}\n`, stderr: '' })
  })

  it('refuses it under run-tst as under test, before printing a row', () => {
    const out = runCli(['run-tst', 'Or8Way.hdl', 'Or8Way.tst'], reader({ 'Or8Way.hdl': READS_OUT }))
    expect(out).toEqual({ exitCode: 1, stdout: '', stderr: 'ERROR Or8Way: Line 12: Cannot use output pin as input\n' })
  })
})

describe('runCli — a chip the registry refuses to register is an error report, not a crash (#868)', () => {
  const files = { 'C.hdl': 'CHIP C { IN a; OUT a; PARTS: Not(in=a, out=a); }', 'C.tst': 'load C.hdl,\neval,\n', 'C.cmp': '|a|\n' }

  it("names the chip and the registry's reason under test, test --json and run-tst", () => {
    expect(runCli(['test', 'C.hdl', 'C.tst', 'C.cmp'], reader(files))).toEqual({ exitCode: 1, stdout: 'ERROR C: Duplicate pin name: "a"\n', stderr: '' })
    const json = runCli(['test', '--json', 'C.hdl', 'C.tst', 'C.cmp'], reader(files))
    expect(JSON.parse(json.stdout)).toEqual({ status: 'error', chip: 'C', rows: null, failure: null, error: 'Duplicate pin name: "a"' })
    expect(runCli(['run-tst', 'C.hdl', 'C.tst'], reader(files))).toEqual({ exitCode: 1, stdout: '', stderr: 'ERROR C: Duplicate pin name: "a"\n' })
  })
})

describe("runCli — a BUILTIN body declares the builtin's own pins (#919)", () => {
  it("exits 1 under run-tst on a Foo declaring IN a over BUILTIN Not, naming both sides, where test keeps R771's refusal", () => {
    const files = {
      'Foo.hdl': 'CHIP Foo { IN a; OUT out; BUILTIN Not; }',
      'Foo.tst': 'load Foo.hdl,\noutput-list a out;\n\nset a 0,\neval,\noutput;\n\nset a 1,\neval,\noutput;\n',
      'Foo.cmp': '| a |out|\n| 0 | 1 |\n| 1 | 0 |\n',
    }
    expect(runCli(['run-tst', 'Foo.hdl', 'Foo.tst'], reader(files))).toEqual({ exitCode: 1, stdout: '', stderr: 'ERROR Foo: Foo declares IN a, but builtin Not declares IN in\n' })
    const tested = runCli(['test', 'Foo.hdl', 'Foo.tst', 'Foo.cmp'], reader(files))
    expect(tested.exitCode).toBe(1)
    expect(tested.stdout).toMatch(/^ERROR Foo: BUILTIN Not in Foo: /)
  })

  it('exits 1 under run-tst on CHIP Nand { IN x, y; OUT out; BUILTIN; } with a .tst over x y out', () => {
    const files = {
      'Nand.hdl': 'CHIP Nand { IN x, y; OUT out; BUILTIN; }',
      'Nand.tst': 'load Nand.hdl,\noutput-list x y out;\n\nset x 0,\nset y 0,\neval,\noutput;\n\nset x 1,\nset y 1,\neval,\noutput;\n',
    }
    expect(runCli(['run-tst', 'Nand.hdl', 'Nand.tst'], reader(files))).toEqual({ exitCode: 1, stdout: '', stderr: 'ERROR Nand: Nand declares IN x, y, but builtin Nand declares IN a, b\n' })
  })
})
