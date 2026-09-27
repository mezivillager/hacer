import { afterEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { VENDORED_PROJECTS } from './sync-vectors.logic.mjs'

// #544's verifier seeded a stale 02/Stale.tst and the sync kept it, exiting 0: after a pin bump
// that drops a file, the oracle would keep the old vector and `git diff` would stay clean. The gap
// was in the CLI's wiring, not a pure decision, so this runs the CLI on a disposable checkout.

const SCRIPT = path.join(import.meta.dirname, 'sync-vectors.mjs')
const cleanupDirs = []

afterEach(() => {
  while (cleanupDirs.length > 0) rmSync(cleanupDirs.pop(), { recursive: true, force: true })
})

/** A web-ide checkout in miniature: each vendored project's index.ts ships one P<nn>.hdl. */
function disposableCheckout() {
  const root = mkdtempSync(path.join(tmpdir(), 'sync-vectors-'))
  cleanupDirs.push(root)
  for (const project of VENDORED_PROJECTS) {
    const dir = path.join(root, 'web-ide', 'projects', 'src', `project_${project}`)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      path.join(dir, 'index.ts'),
      `import * as Chip from "./01_chip.js";\n\nexport const CHIPS = {\n  "P${project}.hdl": Chip.hdl,\n};\n`,
    )
    writeFileSync(path.join(dir, '01_chip.ts'), `export const hdl = \`CHIP P${project} {}\`;\n`)
  }
  return { webIde: path.join(root, 'web-ide'), vectors: path.join(root, 'vectors') }
}

function sync({ webIde, vectors }) {
  return spawnSync(process.execPath, ['--experimental-strip-types', SCRIPT, webIde, vectors], { encoding: 'utf8' })
}

describe('sync-vectors.mjs', () => {
  it('leaves each vendored project directory holding exactly the files upstream ships', () => {
    const checkout = disposableCheckout()
    const result = sync(checkout)
    expect(result.status, result.stderr).toBe(0)
    for (const project of VENDORED_PROJECTS) {
      expect(readdirSync(path.join(checkout.vectors, project))).toEqual([`P${project}.hdl`])
    }
  })

  it('refuses a file upstream no longer ships, naming it, before it writes anything or deletes it', () => {
    const checkout = disposableCheckout()
    const seeded = VENDORED_PROJECTS.at(-1)
    mkdirSync(path.join(checkout.vectors, seeded), { recursive: true })
    writeFileSync(path.join(checkout.vectors, seeded, 'Stale.tst'), 'load Stale.hdl,\n')

    const result = sync(checkout)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(new RegExp(`conformance/vectors/${seeded} holds Stale\\.tst`))
    expect(readdirSync(checkout.vectors)).toEqual([seeded])
    expect(readdirSync(path.join(checkout.vectors, seeded))).toEqual(['Stale.tst'])
    expect(existsSync(path.join(checkout.vectors, 'LICENSE'))).toBe(false)
  })
})
