// The built `hacer` bin, run by plain `node`: Vite only builds it, never runs it.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { project1HdlSources } from '@/core'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const VECTORS = path.join(ROOT, 'conformance/vectors/01')
const CHIPS = readdirSync(VECTORS)
  .filter((file) => file.endsWith('.hdl'))
  .map((file) => file.slice(0, -'.hdl'.length))
const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
  bin: Record<string, string>
  scripts: Record<string, string>
}
// Each test spawns node; under a loaded machine that outruns vitest's 5 s default.
const SPAWN_TIMEOUT = 30_000

let work = ''
let bin = ''

beforeAll(() => {
  work = mkdtempSync(path.join(tmpdir(), 'hacer-cli-'))
  bin = path.join(work, 'cli', 'index.js')
  // The repo's own `build:cli` script, redirected into the scratch directory.
  const [tool, ...args] = pkg.scripts['build:cli'].split(' ')
  expect(tool).toBe('vite')
  const vite = path.join(ROOT, 'node_modules/vite/bin/vite.js')
  const build = spawnSync(
    process.execPath,
    [vite, ...args, '--outDir', path.dirname(bin), '--emptyOutDir', '--logLevel', 'error'],
    { cwd: ROOT, encoding: 'utf8' },
  )
  expect(build.status, build.stderr).toBe(0)
}, 60_000)

afterAll(() => {
  rmSync(work, { recursive: true, force: true })
})

const hacer = (...args: string[]) => spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' })
const vector = (chip: string, ext: 'hdl' | 'tst' | 'cmp'): string => path.join(VECTORS, `${chip}.${ext}`)

describe('the hacer bin under plain node', { timeout: SPAWN_TIMEOUT }, () => {
  it('is the package bin', () => {
    expect(pkg.bin.hacer).toBe('dist/cli/index.js')
  })

  it('exits 1 on the vendored Xor template and names the first mismatching row', () => {
    const run = hacer('test', vector('Xor', 'hdl'), vector('Xor', 'tst'), vector('Xor', 'cmp'))
    expect(run.stdout).toBe('FAIL Xor row 2: out expected 1, got 0\n')
    expect(run.status).toBe(1)
  })

  it('finds the 16 Project-1 vectors', () => {
    expect(CHIPS).toHaveLength(16)
  })

  it.each(CHIPS)('exits 0 on %s with a correct implementation', (chip) => {
    // Nand.hdl is vendored as `BUILTIN Nand;`, already correct; the other 15 are written from
    // project1HdlSources.
    let hdl = vector(chip, 'hdl')
    if (chip !== 'Nand') {
      const source = project1HdlSources[chip]
      expect(source, `no implementation for ${chip}`).toBeDefined()
      hdl = path.join(work, `${chip}.hdl`)
      writeFileSync(hdl, source)
    }
    const run = hacer('test', hdl, vector(chip, 'tst'), vector(chip, 'cmp'))
    expect(run.stderr).toBe('')
    expect(run.stdout).toMatch(new RegExp(`^PASS ${chip} (\\d+)/\\1 rows\\n$`))
    expect(run.status).toBe(0)
  })

  it('prints the Xor template\'s output table with run-tst, without comparing', () => {
    const run = hacer('run-tst', vector('Xor', 'hdl'), vector('Xor', 'tst'))
    expect(run.stdout).toBe('| a | b |out|\n| 0 | 0 | 0 |\n| 0 | 1 | 0 |\n| 1 | 0 | 0 |\n| 1 | 1 | 0 |\n')
    expect(run.status).toBe(0)
  })

  it('prints JSON that parses with --json', () => {
    const run = hacer('test', '--json', vector('Xor', 'hdl'), vector('Xor', 'tst'), vector('Xor', 'cmp'))
    expect(JSON.parse(run.stdout)).toMatchObject({
      status: 'fail',
      chip: 'Xor',
      failure: { row: 2, column: 'out', expected: '1', actual: '0' },
    })
    expect(run.status).toBe(1)
  })
})
