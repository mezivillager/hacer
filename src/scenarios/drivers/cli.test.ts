// The `cli` column of the scenario × driver suite: each scenario through the built `hacer` bin.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { threeGateScenario, type NandScenario, type Scenario } from '..'
import { runCliScenario } from './cli'
import { runScenario, SCENARIOS } from './core'

// Each test spawns node; under a loaded machine that outruns vitest's 5 s default.
const SPAWN_TIMEOUT = 30_000

let work = ''
let bin = ''

// The spawned entry: the repo's own `build:cli` script, redirected into a scratch directory, so
// the suite never needs `pnpm run build` first and never touches dist/.
beforeAll(() => {
  const root = fileURLToPath(new URL('../../../', import.meta.url))
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> }
  const [tool, ...args] = pkg.scripts['build:cli'].split(' ')
  expect(tool).toBe('vite')
  work = mkdtempSync(path.join(tmpdir(), 'hacer-cli-driver-'))
  bin = path.join(work, 'cli', 'index.js')
  const vite = path.join(root, 'node_modules/vite/bin/vite.js')
  const build = spawnSync(
    process.execPath,
    [vite, ...args, '--outDir', path.dirname(bin), '--emptyOutDir', '--logLevel', 'error'],
    { cwd: root, encoding: 'utf8' },
  )
  expect(build.status, build.stderr).toBe(0)
}, 120_000)

afterAll(() => {
  rmSync(work, { recursive: true, force: true })
})

describe('cli scenario driver', { timeout: SPAWN_TIMEOUT }, () => {
  it.each(SCENARIOS)('$name: hacer test passes, as the core driver does', (scenario) => {
    expect(runScenario(scenario).ok).toBe(true)
    expect(runCliScenario(scenario, bin)).toEqual({ name: scenario.name, ok: true, errors: [] })
  })

  it('fails with the core driver when the recorded vector is wrong', () => {
    const { expectations } = threeGateScenario
    const wrong: NandScenario = {
      ...threeGateScenario,
      expectations: { ...expectations, outputs: { ...expectations.outputs, gate3: 0 } },
    }
    expect(runScenario(wrong).ok).toBe(false)
    expect(runCliScenario(wrong, bin)).toEqual({
      name: wrong.name,
      ok: false,
      errors: ['row 1: g2out expected 0, got 1'],
    })
  })

  it('reports the core driver\'s errors for a scenario that does not translate, without spawning', () => {
    const doubled: Scenario = {
      ...threeGateScenario,
      wires: [...threeGateScenario.wires, { fromGate: 1, fromPin: 'out-0', toGate: 2, toPin: 'in-0' }],
    }
    const cli = runCliScenario(doubled, path.join(work, 'no-such-bin.js'))
    expect(cli).toEqual({ name: doubled.name, ok: false, errors: ['gate 2 pin in-0 has 2 drivers'] })
    expect(cli.errors).toEqual(runScenario(doubled).errors)
  })
})
