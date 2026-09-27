import { afterEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { EXCLUDED, VENDORED_PROJECTS } from './sync-vectors.logic.mjs'

// #544's verifier seeded a stale 02/Stale.tst and the sync kept it, exiting 0: after a pin bump
// that drops a file, the oracle would keep the old vector and `git diff` would stay clean. The gap
// was in the CLI's wiring, not a pure decision, so this runs the CLI on a disposable checkout.

const SCRIPT = path.join(import.meta.dirname, 'sync-vectors.mjs')
const cleanupDirs = []

afterEach(() => {
  while (cleanupDirs.length > 0) rmSync(cleanupDirs.pop(), { recursive: true, force: true })
})

/**
 * A web-ide checkout in miniature: each vendored project's index.ts ships one P<nn>.hdl, plus
 * the files EXCLUDED names for it, since an exclusion that matches nothing shipped is refused.
 */
function disposableCheckout() {
  const root = mkdtempSync(path.join(tmpdir(), 'sync-vectors-'))
  cleanupDirs.push(root)
  for (const project of VENDORED_PROJECTS) {
    const dir = path.join(root, 'web-ide', 'projects', 'src', `project_${project}`)
    mkdirSync(dir, { recursive: true })
    const excluded = Object.keys(EXCLUDED[project] ?? {}).map((file) => `  "${file}": Chip.hdl,\n`).join('')
    writeFileSync(
      path.join(dir, 'index.ts'),
      `import * as Chip from "./01_chip.js";\n\nexport const CHIPS = {\n  "P${project}.hdl": Chip.hdl,\n${excluded}};\n`,
    )
    writeFileSync(path.join(dir, '01_chip.ts'), `export const hdl = \`CHIP P${project} {}\`;\n`)
  }
  return { webIde: path.join(root, 'web-ide'), vectors: path.join(root, 'vectors') }
}

function sync({ webIde, vectors }) {
  return spawnSync(process.execPath, ['--experimental-strip-types', SCRIPT, webIde, vectors], { encoding: 'utf8' })
}

describe('sync-vectors.mjs', () => {
  it('leaves each vendored project directory holding exactly the files upstream ships, less its exclusions', () => {
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

  it('refuses once, naming the stray files in every vendored directory, before it writes anything', () => {
    const checkout = disposableCheckout()
    const [first, last] = [VENDORED_PROJECTS[0], VENDORED_PROJECTS.at(-1)]
    for (const [project, stray] of [[first, 'Stale.tst'], [last, 'Extra.cmp']]) {
      mkdirSync(path.join(checkout.vectors, project), { recursive: true })
      writeFileSync(path.join(checkout.vectors, project, stray), '| stray |\n')
    }

    const result = sync(checkout)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(new RegExp(`vectors/${first} holds Stale\\.tst; conformance/vectors/${last} holds Extra\\.cmp`))
    expect(readdirSync(checkout.vectors).sort()).toEqual([first, last])
    expect(readdirSync(path.join(checkout.vectors, first))).toEqual(['Stale.tst'])
    expect(readdirSync(path.join(checkout.vectors, last))).toEqual(['Extra.cmp'])
  })

  it('refuses a hand-copied excluded file such as 05/MaxRam.tst, and neither writes nor deletes anything', () => {
    const checkout = disposableCheckout()
    mkdirSync(path.join(checkout.vectors, '05'), { recursive: true })
    writeFileSync(path.join(checkout.vectors, '05', 'MaxRam.tst'), 'load Max.hack,\n')

    const result = sync(checkout)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(/conformance\/vectors\/05 holds MaxRam\.tst\. Upstream does not ship them at [0-9a-f]{40}, or EXCLUDED/)
    expect(readdirSync(checkout.vectors)).toEqual(['05'])
    expect(readdirSync(path.join(checkout.vectors, '05'))).toEqual(['MaxRam.tst'])
  })

  it("disregards a dotfile such as Finder's .DS_Store, syncing around it and leaving it in place", () => {
    const checkout = disposableCheckout()
    const project = VENDORED_PROJECTS[0]
    mkdirSync(path.join(checkout.vectors, project), { recursive: true })
    writeFileSync(path.join(checkout.vectors, project, '.DS_Store'), 'Finder\n')

    const result = sync(checkout)

    expect(result.status, result.stderr).toBe(0)
    expect(readdirSync(path.join(checkout.vectors, project)).sort()).toEqual(['.DS_Store', `P${project}.hdl`])
  })
})
