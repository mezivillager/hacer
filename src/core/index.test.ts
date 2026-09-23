// src/core/index.test.ts — the engine's front door, and the proof that it stays headless (#336).
//
// Three things are asserted here, and the third is the point of the issue.
//
// 1. The public surface is an exact list. Every export is a commitment; adding one has to be a
//    deliberate edit to this test, not a side effect of a sub-index growing.
// 2. One chip compiles and runs end to end through the two entry points, with no DOM global
//    defined — the `node` Vitest project gives that environment, and the test asserts it rather
//    than assuming it.
// 3. The transitive import closure of both entry points reaches nothing but `src/core` and
//    `src/simulation`, imports no package at all, and touches no browser global.
//
// Why (3) is a file walk and not `await import(...)`: importing the index in Node proves almost
// nothing. `react`, `zustand` and `three` all import cleanly in Node, so an index that pulled one
// in would still load. #401 records the same failure mode from #181 — a verification command that
// could not have caught what it claimed to check. The closure walk fails on the import itself, and
// the `contains` assertions below make a vacuous pass (an empty or unresolved graph) fail too.

import { describe, expect, it } from 'vitest'

import * as coreSurface from './index'
import {
  compileHDL,
  createChipRegistry,
  evaluateChip,
  getBuiltinChipRegistry,
  hdlChipDefinition,
  parseCmp,
  parseHDL,
  parseTST,
  registerBuiltin,
  registerProject1Builtins,
  runTest,
} from './index'
import * as simulationSurface from '@/simulation'
import { clampToWidth, maskForWidth, readSubBus, writeSubBus } from '@/simulation'

// ── (1) the public surface ──────────────────────────────────────────────────────────────────────

/** `src/core/index.ts`'s runtime exports, in namespace order (ESM namespace keys are sorted). */
const CORE_EXPORTS = [
  'DEFAULT_MAX_DEPTH',
  'combineRegistries',
  'compareCmpRow',
  'compileHDL',
  'createChipRegistry',
  'evaluateChip',
  'evaluateChipWithCtx',
  'getBuiltinChipRegistry',
  'getUserChipRegistry',
  'hdlChipDefinition',
  'isBuiltinChip',
  'isCircuitChip',
  'isHDLChip',
  'parseCmp',
  'parseHDL',
  'parseTST',
  'printHDL',
  'registerBuiltin',
  'registerProject1Builtins',
  'runTest',
  'validateChipDefinition',
]

const SIMULATION_EXPORTS = ['clampToWidth', 'createBusPins', 'maskForWidth', 'readSubBus', 'writeSubBus']

describe('the engine entry points', () => {
  it('exports exactly the documented public surface', () => {
    expect(Object.keys(coreSurface).sort()).toEqual([...CORE_EXPORTS].sort())
    expect(Object.keys(simulationSurface).sort()).toEqual([...SIMULATION_EXPORTS].sort())
  })

  // ── (2) one chip, end to end, with no DOM ─────────────────────────────────────────────────────

  it('runs with no DOM global defined', () => {
    // The `node` Vitest project's whole promise. Asserted, so moving this file to `jsdom` fails.
    for (const global of ['window', 'document', 'localStorage', 'sessionStorage']) {
      expect(global in globalThis).toBe(false)
    }
  })

  it('compiles and runs one chip end to end through the entry points', () => {
    // A registry holding the one primitive HACER is built from.
    const registry = createChipRegistry()
    registerBuiltin(
      registry,
      'Nand',
      [
        { name: 'a', width: 1 },
        { name: 'b', width: 1 },
      ],
      [{ name: 'out', width: 1 }],
      (i) => ({ out: ~(i.a & i.b) & 1 }),
    )

    // Compile `Not` out of that one Nand.
    const source = 'CHIP Not { IN in; OUT out; PARTS: Nand(a=in, b=in, out=out); }'
    const parsed = parseHDL(source)
    if (!parsed.success) throw new Error(parsed.errors.map((e) => e.message).join('; '))

    const compiled = compileHDL(parsed.chip, registry)
    expect(compiled.success).toBe(true)

    const not = hdlChipDefinition(parsed.chip, source)
    registry.register(not)
    expect(evaluateChip(not, { in: 0 }, registry)).toEqual({ out: 1 })
    expect(evaluateChip(not, { in: 1 }, registry)).toEqual({ out: 0 })

    // …and run it against a `.tst`/`.cmp` pair, the conformance path a CLI or MCP tool drives.
    const script = parseTST(
      'load Not.hdl, compare-to Not.cmp, output-list in out;\nset in 0, eval, output;\nset in 1, eval, output;',
    )
    if (!script.success) throw new Error(script.errors.map((e) => e.message).join('; '))
    const cmp = parseCmp('|in |out|\n| 0 | 1 |\n| 1 | 0 |')
    if (!cmp.success) throw new Error(cmp.errors.map((e) => e.message).join('; '))

    const result = runTest(script.script, { registry, cmpData: cmp.file })
    expect(result.error).toBeNull()
    expect(result.firstFailure).toBeNull()
    expect(result.passed).toBe(true)
    expect(result.outputRows).toHaveLength(2)
  })

  it('exposes the builtin registry and the bus operations a surface needs', () => {
    expect(getBuiltinChipRegistry().has('Nand')).toBe(true)

    const fresh = createChipRegistry()
    registerProject1Builtins(fresh)
    expect(fresh.list().length).toBeGreaterThan(10)

    expect(maskForWidth(4)).toBe(0b1111)
    expect(readSubBus(0b1010, 1, 2)).toBe(0b01)
    expect(writeSubBus(0b0000, 0b11, 1, 2)).toBe(0b0110)
    expect(clampToWidth(0b10110, 4)).toBe(0b0110)
  })
})

// ── (3) the closure: what the front door actually pulls in ──────────────────────────────────────

// Sources come from `import.meta.glob`, not `node:fs`, for two reasons: `tsconfig.app.json`
// deliberately narrows `types` to `vitest/globals`, and widening it would loosen the very boundary
// this test defends; and a walk built on Vite's own module map cannot disagree with what Vite
// resolves at build time. Paths below are always `src`-relative POSIX strings ('core/index.ts').

const dirOf = (file: string): string => file.slice(0, file.lastIndexOf('/'))

const normalise = (file: string): string => {
  const parts: string[] = []
  for (const part of file.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

/** `import.meta.glob` keys are relative to this file's directory; make them `src`-relative. */
const fromGlobKey = (key: string): string => normalise(`${dirOf('core/index.test.ts')}/${key}`)

/** Every `.ts`/`.tsx` file under `src/` — keys only, so nothing is loaded. */
const ALL_SRC = new Set(Object.keys(import.meta.glob('../**/*.{ts,tsx}')).map(fromGlobKey))

/** The engine's own sources, eagerly, as text — the only files the walk ever reads. */
const ENGINE_SOURCES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob('../{core,simulation}/**/*.ts', { query: '?raw', import: 'default', eager: true }),
  ).map(([key, source]) => [fromGlobKey(key), source as string]),
)

const ENTRY_POINTS = ['core/index.ts', 'simulation/index.ts']

/** The repo's tsconfig `paths`, as the walk needs them: prefix → directory under `src/`. */
const ALIASES: Record<string, string> = {
  '@/': '',
  '@components/': 'components/',
  '@gates/': 'gates/',
  '@simulation/': 'simulation/',
  '@store/': 'store/',
}

/** `from '…'`, a side-effect `import '…'`, and `import('…')`. Matches `export … from` too. */
const SPECIFIER_PATTERNS = [
  /\bfrom\s*['"]([^'"]+)['"]/g,
  /^\s*import\s*['"]([^'"]+)['"]/gm,
  /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g,
]

/** Comments stripped, so prose ("…describes the document.") cannot trip the global scan. */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1')

/**
 * Resolve one specifier to a file under `src/`, or `null` when it names a package.
 * An unresolvable relative/aliased specifier throws: a walk that silently skipped an edge would be
 * exactly the kind of check that proves nothing.
 */
function resolveSpecifier(specifier: string, fromFile: string): string | null {
  const alias = Object.keys(ALIASES).find((prefix) => specifier.startsWith(prefix))
  let base: string
  if (specifier.startsWith('.')) base = normalise(`${dirOf(fromFile)}/${specifier}`)
  else if (alias !== undefined) base = normalise(`${ALIASES[alias]}${specifier.slice(alias.length)}`)
  else return null

  const hit = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((c) => ALL_SRC.has(c))
  if (hit === undefined) throw new Error(`index.test.ts: cannot resolve "${specifier}" from src/${fromFile}`)
  return hit
}

interface Closure {
  /** Engine files reached, sorted. */
  files: string[]
  /** Files reached outside `src/core` / `src/simulation` — the walk stops at each one. */
  strays: string[]
  /** Package specifiers found on the way. */
  packages: string[]
}

function walkClosure(entryPoints: string[]): Closure {
  const files = new Set<string>()
  const strays = new Set<string>()
  const packages = new Set<string>()
  const queue = [...entryPoints]

  while (queue.length > 0) {
    const file = queue.pop()
    if (file === undefined || files.has(file) || strays.has(file)) continue
    const source = ENGINE_SOURCES[file]
    if (source === undefined) {
      // Outside the engine. Recorded, and not traversed: the failure should name the edge itself.
      strays.add(file)
      continue
    }
    files.add(file)
    for (const pattern of SPECIFIER_PATTERNS) {
      for (const match of source.matchAll(pattern)) {
        const resolved = resolveSpecifier(match[1], file)
        if (resolved === null) packages.add(match[1])
        else queue.push(resolved)
      }
    }
  }
  return { files: [...files].sort(), strays: [...strays].sort(), packages: [...packages].sort() }
}

describe('the engine entry points are headless', () => {
  const closure = walkClosure(ENTRY_POINTS)

  it('reaches the engine modules it claims to export', () => {
    // Non-vacuity. Without this, an entry point that exported nothing would pass every assertion
    // below — which is how #181's headless check came to prove nothing (#401).
    expect(closure.files).toEqual(
      expect.arrayContaining([
        'core/chips/evaluateChip.ts',
        'core/chips/registry.ts',
        'core/hdl/compiler.ts',
        'core/hdl/parser.ts',
        'core/hdl/printer.ts',
        'core/testing/cmpParser.ts',
        'core/testing/engine.ts',
        'core/testing/tstParser.ts',
        'simulation/busOps.ts',
      ]),
    )
    expect(closure.files.length).toBeGreaterThan(10)
  })

  it('reaches no file outside src/core and src/simulation', () => {
    // A `@/store/…`, `@/components/…` or `@/lib/notify` import lands here — including a type-only
    // one, which is still a coupling that stops the engine being lifted out.
    expect(closure.strays).toEqual([])
  })

  it('imports no package — not React, Zustand or three, and not a Node builtin either', () => {
    // The engine depends on nothing but itself today, so the allowlist is empty on purpose:
    // a new dependency is a decision, and it gets recorded here.
    expect(closure.packages).toEqual([])
  })

  it('touches no browser global', () => {
    const FORBIDDEN = 'window|document|localStorage|sessionStorage|navigator|alert|matchMedia|requestAnimationFrame'
    // No `g` flag: `RegExp.test` is stateful with one, and this regex is reused across files.
    const used = new RegExp(String.raw`(?:\btypeof\s+(?:${FORBIDDEN})\b)|\b(?:${FORBIDDEN})\s*[.([]`)
    const offenders = closure.files.filter((file) => used.test(stripComments(ENGINE_SOURCES[file])))
    expect(offenders).toEqual([])
  })
})
