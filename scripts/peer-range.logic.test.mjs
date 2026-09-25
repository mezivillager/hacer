import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readInstalledSet } from './peer-range.mjs'
import { checkPeerRanges, formatReport, inPeerSet, parseArgs, satisfiesRange } from './peer-range.logic.mjs'

// #410's pair, copied from the registry on 2026-09-25 (`npm view @react-three/fiber@9.7.0`),
// not from the issue prose: react 19.3.0, fiber 9.7.0 peer react `>=19 <19.3`.
// three stays 0.184.0 because the react-and-react-three Dependabot group does not bump it.
// react-dom 19.3.0 is the grouped companion; its own peer is `^19.3.0` (registry).
const ISSUE_410 = path.join(import.meta.dirname, 'fixtures', 'peer-range', 'issue-410')
const EMPTY_ALLOW = path.join(import.meta.dirname, 'fixtures', 'peer-range', 'empty-allow.json')
const SCRIPT = path.join(import.meta.dirname, 'peer-range.mjs')
const DEFAULTS = { modules: '/default/node_modules', allow: '/default/allow.json' }

const cleanupDirs = []
afterEach(() => {
  while (cleanupDirs.length > 0) rmSync(cleanupDirs.pop(), { recursive: true, force: true })
})

/** @param {string} name @param {string} version @param {Array<{name: string, range: string, optional?: boolean}>} [peers] @param {Record<string, string | null>} [resolved] */
function pkg(name, version, peers = [], resolved = {}) {
  return {
    name,
    version,
    peers: peers.map((peer) => ({ optional: false, ...peer })),
    resolved,
  }
}

describe('inPeerSet', () => {
  it('is react, react-dom, three, and @react-three/*', () => {
    expect(inPeerSet('react')).toBe(true)
    expect(inPeerSet('react-dom')).toBe(true)
    expect(inPeerSet('three')).toBe(true)
    expect(inPeerSet('@react-three/fiber')).toBe(true)
    expect(inPeerSet('@react-three/test-renderer')).toBe(true)
    expect(inPeerSet('react-native')).toBe(false)
    expect(inPeerSet('three-stdlib')).toBe(false)
    expect(inPeerSet('@react-three')).toBe(false)
  })
})

describe('satisfiesRange', () => {
  // [version, range, satisfies]
  const rows = [
    ['19.3.0', '>=19 <19.3', false],
    ['19.2.6', '>=19 <19.3', true],
    ['19.0.0', '>=19 <19.3', true],
    ['18.9.9', '>=19 <19.3', false],
    ['19.3.0', '>=19 <19.4', true],
    ['19.2.6', '^19', true],
    ['20.0.0', '^19', false],
    ['18.0.0', '^19', false],
    ['19.3.0', '^19.3.0', true],
    ['19.2.6', '^19.3.0', false],
    ['19.4.0', '^19.2.6', true],
    ['19.2.6', '^19.2.6', true],
    ['20.0.0', '^19.2.6', false],
    ['0.184.0', '>=0.156', true],
    ['0.156.0', '>=0.156', true],
    ['0.155.0', '>=0.156', false],
    ['9.5.0', '^9.0.0', true],
    ['9.5.0', '>=9.0.0', true],
    ['10.0.0', '^9.0.0', false],
    ['8.9.0', '^9.0.0', false],
    ['0.184.1', '^0.184.0', true],
    ['0.185.0', '^0.184.0', false],
    ['0.0.3', '^0.0.3', true],
    ['0.0.4', '^0.0.3', false],
    ['19.2.9', '~19.2.6', true],
    ['19.3.0', '~19.2.6', false],
    ['17.0.1', '^16.8 || ^17.0', true],
    ['16.9.0', '^16.8 || ^17.0', true],
    ['18.0.0', '^16.8 || ^17.0', false],
    ['1.2.3', '*', true],
    ['1.0.0-rc.1', '*', true],
    ['19.3.0-rc.1', '>=19 <19.4', false],
    ['19.3.0-rc.1', '>=19.3.0-rc.0 <19.4', true],
    ['19.4.0-rc.1', '>=19.3.0-rc.0 <19.4', false],
    ['9.5.0', '9', true],
    ['10.0.0', '9', false],
    ['9.5.0', '9.5.0', true],
    ['9.5.1', '9.5.0', false],
  ]

  it.each(rows)('%s vs %s → %s', (version, range, satisfies) => {
    expect(satisfiesRange(version, range)).toEqual({ ok: true, satisfies })
  })

  it('fails closed on a range or version it cannot read', () => {
    expect(satisfiesRange('19.3.0', '1.0.0 - 2.0.0').ok).toBe(false)
    expect(satisfiesRange('not-a-version', '>=19').ok).toBe(false)
    expect(satisfiesRange('19.3.0', '').ok).toBe(false)
    expect(satisfiesRange('19.3.0', '>=19 <19.3 || nope').ok).toBe(false)
  })
})

describe('checkPeerRanges', () => {
  const fiber410 = () => pkg(
    '@react-three/fiber',
    '9.7.0',
    [
      { name: 'react', range: '>=19 <19.3' },
      { name: 'react-dom', range: '>=19 <19.3', optional: true },
      { name: 'three', range: '>=0.156' },
      { name: 'expo', range: '>=43.0', optional: true },
    ],
    { react: '19.3.0', 'react-dom': '19.3.0', three: '0.184.0', expo: null },
  )

  it('fails when react 19.3.0 is outside fiber 9.7.0’s range', () => {
    const result = checkPeerRanges({ packages: [fiber410(), pkg('react', '19.3.0')], allow: [] })
    expect(result.ok).toBe(false)
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        dependent: '@react-three/fiber',
        dependentVersion: '9.7.0',
        peer: 'react',
        range: '>=19 <19.3',
        resolved: '19.3.0',
        optional: false,
        kind: 'mismatch',
      }),
      expect.objectContaining({
        dependent: '@react-three/fiber',
        peer: 'react-dom',
        resolved: '19.3.0',
        optional: true,
        kind: 'mismatch',
      }),
    ]))
    expect(result.violations.map((v) => v.peer).sort()).toEqual(['react', 'react-dom'])
  })

  it('passes the same fiber range on react 19.2.6', () => {
    const fiber = fiber410()
    fiber.resolved.react = '19.2.6'
    fiber.resolved['react-dom'] = '19.2.6'
    const result = checkPeerRanges({
      packages: [fiber, pkg('react', '19.2.6'), pkg('react-dom', '19.2.6', [{ name: 'react', range: '^19.2.6' }], { react: '19.2.6' })],
      allow: [],
    })
    expect(result.violations).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('passes react 19.3.0 once the range is widened to <19.4', () => {
    const fiber = fiber410()
    fiber.peers = fiber.peers.map((peer) => (
      peer.name === 'react' || peer.name === 'react-dom' ? { ...peer, range: '>=19 <19.4' } : peer
    ))
    const result = checkPeerRanges({ packages: [fiber], allow: [] })
    expect(result.violations).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('does not flag a missing optional peer', () => {
    const result = checkPeerRanges({
      packages: [pkg('@react-three/fiber', '9.5.0', [{ name: 'expo', range: '>=43.0', optional: true }], { expo: null })],
      allow: [],
    })
    expect(result.checked).toBe(1)
    expect(result.violations).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('flags a missing required peer', () => {
    const result = checkPeerRanges({
      packages: [pkg('@react-three/fiber', '9.7.0', [{ name: 'react', range: '>=19 <19.3' }], { react: null })],
      allow: [],
    })
    expect(result.violations).toEqual([
      expect.objectContaining({ peer: 'react', kind: 'missing', resolved: null }),
    ])
    expect(result.ok).toBe(false)
  })

  it('fails closed when a declared range cannot be read', () => {
    const result = checkPeerRanges({
      packages: [pkg('react-dom', '19.2.6', [{ name: 'react', range: '1.0.0 - 2.0.0' }], { react: '19.2.6' })],
      allow: [],
    })
    expect(result.violations).toEqual([
      expect.objectContaining({ kind: 'unparsed', range: '1.0.0 - 2.0.0' }),
    ])
    expect(result.ok).toBe(false)
  })

  it('ignores an unmet peer on a package outside the set', () => {
    const result = checkPeerRanges({
      packages: [
        pkg('three-stdlib', '2.36.1', [{ name: 'three', range: '>=1' }], { three: '0.184.0' }),
        pkg('react', '19.2.6'),
      ],
      allow: [],
    })
    expect(result.ok).toBe(true)
    expect(result.violations).toEqual([])
    expect(result.packages).toBe(1)
  })

  it('fails when the set is not installed, so an empty tree cannot pass', () => {
    const result = checkPeerRanges({ packages: [], allow: [] })
    expect(result.ok).toBe(false)
    expect(result.checked).toBe(0)
    expect(result.allowErrors).toEqual(['no React, @react-three/* or three package was installed'])
  })

  it('suppresses only the allowed pair, and only with a reason', () => {
    const packages = [fiber410()]
    const allowed = checkPeerRanges({
      packages,
      allow: [{
        dependent: '@react-three/fiber',
        peer: 'react',
        range: '>=19 <19.3',
        reason: 'accepted until fiber 9.8.0 is the installed version',
      }],
    })
    expect(allowed.violations.map((v) => v.peer)).toEqual(['react-dom'])
    expect(allowed.suppressed).toEqual([
      expect.objectContaining({ peer: 'react', reason: 'accepted until fiber 9.8.0 is the installed version' }),
    ])
    expect(allowed.ok).toBe(false)

    const both = checkPeerRanges({
      packages,
      allow: [
        { dependent: '@react-three/fiber', peer: 'react', range: '>=19 <19.3', reason: 'react held for a measured reason' },
        { dependent: '@react-three/fiber', peer: 'react-dom', range: '>=19 <19.3', reason: 'react-dom held for a measured reason' },
      ],
    })
    expect(both.violations).toEqual([])
    expect(both.ok).toBe(true)
  })

  it('rejects an allow entry with no reason and does not suppress', () => {
    const result = checkPeerRanges({
      packages: [fiber410()],
      allow: [{ dependent: '@react-three/fiber', peer: 'react', range: '>=19 <19.3', reason: '   ' }],
    })
    expect(result.violations.map((v) => v.peer).sort()).toEqual(['react', 'react-dom'])
    expect(result.allowErrors).toContain('allow entry for @react-three/fiber / react / >=19 <19.3 has no reason')
    expect(result.ok).toBe(false)
  })

  it('rejects an allow entry that matches no current violation', () => {
    const result = checkPeerRanges({
      packages: [pkg('react', '19.2.6')],
      allow: [{ dependent: '@react-three/fiber', peer: 'react', range: '>=19 <19.2', reason: 'stale' }],
    })
    expect(result.allowErrors).toEqual([
      'allow entry for @react-three/fiber / react / >=19 <19.2 matches no current violation',
    ])
    expect(result.ok).toBe(false)
  })

  it('does not let an allow entry hide an unreadable range', () => {
    const result = checkPeerRanges({
      packages: [pkg('react-dom', '19.2.6', [{ name: 'react', range: '1.0.0 - 2.0.0' }], { react: '19.2.6' })],
      allow: [{ dependent: 'react-dom', peer: 'react', range: '1.0.0 - 2.0.0', reason: 'please ignore' }],
    })
    expect(result.violations).toEqual([expect.objectContaining({ kind: 'unparsed' })])
    expect(result.allowErrors).toEqual([
      'allow entry for react-dom / react / 1.0.0 - 2.0.0 matches no current violation',
    ])
    expect(result.ok).toBe(false)
  })
})

describe('formatReport', () => {
  it('prints the #410 mismatch as a failing line', () => {
    const text = formatReport({
      ok: false,
      packages: 4,
      checked: 9,
      violations: [{
        dependent: '@react-three/fiber',
        dependentVersion: '9.7.0',
        peer: 'react',
        range: '>=19 <19.3',
        resolved: '19.3.0',
        optional: false,
        kind: 'mismatch',
      }],
      suppressed: [],
      allowErrors: [],
    })
    expect(text).toBe([
      'PEER-RANGE: FAIL',
      '@react-three/fiber@9.7.0 requires react@19.3.0 to satisfy >=19 <19.3',
      'PEER-RANGE: FAIL packages=4 checked=9 violations=1',
      '',
    ].join('\n'))
  })

  it('prints a pass line with the counts, so a check of nothing is visible', () => {
    const text = formatReport({
      ok: true,
      packages: 6,
      checked: 12,
      violations: [],
      suppressed: [],
      allowErrors: [],
    })
    expect(text).toBe('PEER-RANGE: PASS packages=6 checked=12 violations=0\n')
  })
})

describe('parseArgs', () => {
  it('defaults and reads --modules and --allow', () => {
    expect(parseArgs([], DEFAULTS)).toEqual({ ok: true, modules: DEFAULTS.modules, allow: DEFAULTS.allow })
    expect(parseArgs(['--modules', 'tree', '--allow', 'list.json'], DEFAULTS)).toEqual({
      ok: true,
      modules: 'tree',
      allow: 'list.json',
    })
  })

  it('rejects a missing value or an unknown flag', () => {
    expect(parseArgs(['--modules'], DEFAULTS).ok).toBe(false)
    expect(parseArgs(['--nope'], DEFAULTS).ok).toBe(false)
  })
})

describe('readInstalledSet', () => {
  it('fails the checked-in #410 tree', () => {
    const set = readInstalledSet(ISSUE_410)
    const result = checkPeerRanges({ packages: set.packages, allow: [] })
    expect(result.packages).toBe(4)
    expect(result.checked).toBe(9)
    expect(result.ok).toBe(false)
    expect(result.violations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        dependent: '@react-three/fiber',
        peer: 'react',
        resolved: '19.3.0',
        range: '>=19 <19.3',
        kind: 'mismatch',
      }),
    ]))
    expect(result.violations.map((v) => v.peer).sort()).toEqual(['react', 'react-dom'])
    const report = formatReport(result)
    expect(report).toContain('@react-three/fiber@9.7.0 requires react@19.3.0 to satisfy >=19 <19.3')
    expect(report).toContain('(optional peer is installed)')
  })

  it('uses a nested peer ahead of the top-level copy', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'peer-range-nested-'))
    cleanupDirs.push(root)
    const write = (rel, json) => {
      const file = path.join(root, rel)
      mkdirSync(path.dirname(file), { recursive: true })
      writeFileSync(file, JSON.stringify(json))
    }
    write('react/package.json', { name: 'react', version: '19.3.0' })
    write('@react-three/fiber/package.json', {
      name: '@react-three/fiber',
      version: '9.7.0',
      peerDependencies: { react: '>=19 <19.3' },
    })
    write('@react-three/fiber/node_modules/react/package.json', { name: 'react', version: '19.2.6' })
    const set = readInstalledSet(root)
    const result = checkPeerRanges({ packages: set.packages, allow: [] })
    expect(result.violations).toEqual([])
    expect(result.ok).toBe(true)
  })

  it('follows a symlink, which is how pnpm lays a package out', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'peer-range-link-'))
    cleanupDirs.push(root)
    const real = path.join(root, 'real')
    const modules = path.join(root, 'modules')
    mkdirSync(real)
    mkdirSync(modules)
    writeFileSync(path.join(real, 'package.json'), JSON.stringify({ name: 'react', version: '19.2.6' }))
    symlinkSync(real, path.join(modules, 'react'))
    const set = readInstalledSet(modules)
    expect(set.packages).toEqual([
      expect.objectContaining({ name: 'react', version: '19.2.6', peers: [] }),
    ])
  })
})

describe('CLI', () => {
  it('exits 1 on the #410 fixture and names the pair', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--modules', ISSUE_410, '--allow', EMPTY_ALLOW], {
      encoding: 'utf8',
    })
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('PEER-RANGE: FAIL')
    expect(result.stdout).toContain('@react-three/fiber@9.7.0 requires react@19.3.0 to satisfy >=19 <19.3')
  })

  it('exits 0 on the installed tree', () => {
    const modules = path.join(import.meta.dirname, '..', 'node_modules')
    const result = spawnSync(process.execPath, [SCRIPT, '--modules', modules, '--allow', EMPTY_ALLOW], {
      encoding: 'utf8',
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('PEER-RANGE: PASS')
  })
})

describe('allow-list file', () => {
  it('is a JSON array whose entries each carry a reason', () => {
    const allow = JSON.parse(readFileSync(path.join(import.meta.dirname, 'peer-range.allow.json'), 'utf8'))
    expect(Array.isArray(allow)).toBe(true)
    for (const entry of allow) {
      expect(entry.reason.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('installed tree on this checkout', () => {
  it('passes, and the React / R3F / three packages were actually read', () => {
    const set = readInstalledSet(path.join(import.meta.dirname, '..', 'node_modules'))
    expect(set.packages.map((p) => p.name)).toEqual(expect.arrayContaining([
      'react',
      'react-dom',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/test-renderer',
    ]))
    const result = checkPeerRanges({ packages: set.packages, allow: [] })
    expect(result.violations).toEqual([])
    expect(result.allowErrors).toEqual([])
    expect(result.checked).toBeGreaterThan(0)
    expect(result.ok).toBe(true)
  })
})
