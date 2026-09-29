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
