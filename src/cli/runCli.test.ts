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
