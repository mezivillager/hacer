import { describe, it, expect } from 'vitest'
import {
  checkIssueFacts,
  checkPackageClaims,
  extractPackageClaims,
  formatIssueFacts,
  parseManifest,
  pathIndex,
  versionMatches,
} from './issue-facts.logic.mjs'

const PACKAGE_JSON = JSON.stringify({
  dependencies: { react: '^19.3.0', '@react-three/fiber': '^9.8.0' },
  devDependencies: { vitest: '^4.1.2' },
})

const LOCK = [
  "lockfileVersion: '9.0'",
  'importers:',
  '  .:',
  '    dependencies:',
  "      '@react-three/fiber':",
  '        specifier: ^9.8.0',
  'packages:',
  "  '@react-three/fiber@9.8.1':",
  '  react@19.3.0:',
  '  vitest@4.1.2:',
  '  esbuild@0.25.0:',
  'snapshots:',
  "  '@react-three/fiber@9.8.1(react@19.3.0)':",
].join('\n')

const manifest = parseManifest(PACKAGE_JSON, LOCK)

// #355's criteria as filed on 2026-09-22 (the first occurrence #394 cites).
const ISSUE_355 = [
  '## Acceptance criteria',
  '- [ ] a failing test first: a chip whose output is assembled from two or more slice writes evaluates the same',
  '- [ ] a **property test** over slice-assembled signals: evaluation is invariant under permutation of the parts. `fast-check` is already a dependency',
  '## Files likely touched',
  '`src/core/hdl/compiler.ts`, its tests',
].join('\n')

describe('extractPackageClaims', () => {
  it('reads a bare name on a line that calls it a dependency', () => {
    expect(extractPackageClaims(ISSUE_355)).toEqual([{ line: 3, name: 'fast-check', version: null }])
  })

  it('ignores a bare name on a line with no dependency word, and dependency-cruiser is not one', () => {
    expect(extractPackageClaims('run `pr-hygiene` on `main`')).toEqual([])
    expect(extractPackageClaims('a `dependency-cruiser` rule named `engine-no-state`')).toEqual([])
  })

  it('reads a scoped name and a name@version anywhere', () => {
    expect(extractPackageClaims('`@xyflow/react` was rejected; `react@19.2.x` is held')).toEqual([
      { line: 1, name: '@xyflow/react', version: null },
      { line: 1, name: 'react', version: '19.2.x' },
    ])
  })

  it('leaves paths, the @/ alias, node builtins and bare versions alone', () => {
    const text = 'the dependency in `package.json`, `src/core/index.ts`, `@/lib/notify`, `fs`, `19.2.x`'
    expect(extractPackageClaims(text)).toEqual([])
  })
})

describe('parseManifest', () => {
  it('collects direct names from every dependency field and each resolved version from the lockfile', () => {
    expect([...manifest.direct].sort()).toEqual(['@react-three/fiber', 'react', 'vitest'])
    expect([...manifest.locked.get('@react-three/fiber')]).toEqual(['9.8.1'])
    expect([...manifest.locked.get('esbuild')]).toEqual(['0.25.0'])
  })
})

describe('versionMatches', () => {
  it.each([
    ['19.3', '19.3.0', true],
    ['^9.8.0', '9.8.0', true],
    ['19.x', '19.3.0', true],
    ['19.2.x', '19.3.0', false],
    ['9.8.0.1', '9.8.0', false],
  ])('%s against %s is %s', (stated, locked, expected) => {
    expect(versionMatches(stated, locked)).toBe(expected)
  })
})

describe('checkPackageClaims', () => {
  const claim = (name, version = null) => ({ line: 1, name, version })

  it('sorts each claim into missing, transitive, wrong version or nothing', () => {
    const findings = checkPackageClaims(
      [claim('fast-check'), claim('esbuild'), claim('react', '19.2.x'), claim('react', '19.3'), claim('vitest')],
      manifest,
    )
    expect(findings.map((f) => [f.name, f.kind, f.locked])).toEqual([
      ['fast-check', 'missing', []],
      ['esbuild', 'transitive', ['0.25.0']],
      ['react', 'version', ['19.3.0']],
    ])
  })
})

describe('pathIndex', () => {
  const exists = pathIndex(['scripts/backlog.mjs', 'src/core/chips/chip.ts'])

  it('knows a file, its directories and any run of whole segments', () => {
    for (const path of ['scripts/backlog.mjs', 'scripts', 'backlog.mjs', 'chips/chip.ts', 'core/chips']) {
      expect(exists(path)).toBe(true)
    }
  })

  it('never matches inside a segment', () => {
    expect(exists('log.mjs')).toBe(false)
    expect(exists('scripts/issue-facts.mjs')).toBe(false)
  })
})

describe('checkIssueFacts on #355', () => {
  it('reports `fast-check` as in neither manifest file, and nothing else', () => {
    const facts = checkIssueFacts(ISSUE_355, { manifest, exists: pathIndex(['src/core/hdl/compiler.ts']) })
    expect(formatIssueFacts('#355', facts)).toBe(
      [
        'PACKAGE #355:3 fast-check — in neither package.json nor pnpm-lock.yaml',
        'ISSUE-FACTS: #355 · 1 package · 0 path',
      ].join('\n'),
    )
  })

  it('reports a cited path the tree does not have', () => {
    const facts = checkIssueFacts(ISSUE_355, { manifest, exists: pathIndex(['src/core/hdl/parser.ts']) })
    expect(formatIssueFacts('#355', facts).split('\n')).toContain('DEAD PATH #355:5 src/core/hdl/compiler.ts')
  })
})
