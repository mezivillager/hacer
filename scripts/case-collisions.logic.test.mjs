import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { findCaseCollisions, formatReport, parseArgs } from './case-collisions.logic.mjs'

const SCRIPT = path.join(import.meta.dirname, 'case-collisions.mjs')
const CLEAN = { ok: true, file: [], directory: [], stem: [] }
const NFC = '\u00e9'
const NFD = 'e\u0301'

describe('findCaseCollisions', () => {
  it('reports Foo.tsx beside foo.ts as a stem collision — import "./foo" resolves to either on macOS', () => {
    expect(findCaseCollisions(['src/Foo.tsx', 'src/foo.ts'])).toEqual({
      ok: false,
      file: [],
      directory: [],
      stem: [['src/Foo.tsx', 'src/foo.ts']],
    })
  })

  it('reports Foo.ts beside foo.ts as a full-path collision, once', () => {
    expect(findCaseCollisions(['src/Foo.ts', 'src/foo.ts'])).toEqual({
      ok: false,
      file: [['src/Foo.ts', 'src/foo.ts']],
      directory: [],
      stem: [],
    })
  })

  it('reports directories Bar/ and bar/ as a directory collision', () => {
    expect(findCaseCollisions(['Bar/a.ts', 'bar/b.ts'])).toEqual({
      ok: false,
      file: [],
      directory: [['Bar/', 'bar/']],
      stem: [],
    })
  })

  it('reports both incidents from #511 and #515', () => {
    const result = findCaseCollisions([
      'mission-control/src/Process.tsx',
      'mission-control/src/process.ts',
      'mission-control/src/Timeline.tsx',
      'mission-control/src/timeline.ts',
    ])
    expect(result.stem).toEqual([
      ['mission-control/src/Process.tsx', 'mission-control/src/process.ts'],
      ['mission-control/src/Timeline.tsx', 'mission-control/src/timeline.ts'],
    ])
    expect(result.ok).toBe(false)
  })

  it('reports a module beside a same-stem directory that differs by case and holds an index module', () => {
    expect(findCaseCollisions(['src/Timeline.tsx', 'src/timeline/index.ts']).stem).toEqual([
      ['src/Timeline.tsx', 'src/timeline/index.ts'],
    ])
  })

  it('reads .d.ts and .json as resolvable without their extension', () => {
    expect(findCaseCollisions(['src/Env.ts', 'src/env.d.ts']).stem).toEqual([['src/Env.ts', 'src/env.d.ts']])
    expect(findCaseCollisions(['src/Config.ts', 'src/config.json']).stem).toEqual([['src/Config.ts', 'src/config.json']])
  })

  it('still reports files below a colliding directory when their own names differ by case', () => {
    const result = findCaseCollisions(['A/x.ts', 'a/X.ts'])
    expect(result.directory).toEqual([['A/', 'a/']])
    expect(result.file).toEqual([['A/x.ts', 'a/X.ts']])
  })

  it('reports a colliding directory pair once, not each same-named file below it', () => {
    expect(findCaseCollisions(['Foo/index.ts', 'foo/index.ts', 'Foo/util.ts', 'foo/util.ts'])).toEqual({
      ok: false,
      file: [],
      directory: [['Foo/', 'foo/']],
      stem: [],
    })
  })

  it('reports a three-way directory collision once with its same-named files', () => {
    const result = findCaseCollisions(['Foo/a.ts', 'foo/a.ts', 'FOO/a.ts'])
    expect(result.file).toEqual([])
    expect(result.directory).toEqual([['FOO/', 'Foo/', 'foo/']])
  })

  it('reports a same-named file pair in the same directory as a file collision, not a directory one', () => {
    expect(findCaseCollisions(['src/A.ts', 'src/a.ts'])).toEqual({
      ok: false,
      file: [['src/A.ts', 'src/a.ts']],
      directory: [],
      stem: [],
    })
  })

  it('treats an NFC name and its NFD form as one path, as APFS does', () => {
    expect(NFC).not.toBe(NFD)
    expect(NFC.normalize('NFD')).toBe(NFD)
    expect(findCaseCollisions([`src/${NFC}.ts`, `src/${NFD}.ts`])).toEqual({
      ok: false,
      file: [[`src/${NFD}.ts`, `src/${NFC}.ts`]],
      directory: [],
      stem: [],
    })
  })

  it('reports an NFC/NFD pair that also differs by case, and shows the names as tracked', () => {
    const upper = `src/${NFC.toUpperCase()}.ts`
    const lowerDecomposed = `src/${NFD}.ts`
    expect(findCaseCollisions([upper, lowerDecomposed]).file).toEqual([[lowerDecomposed, upper]])
  })

  it('reports an NFC/NFD directory pair once, with the same-named file below it', () => {
    expect(findCaseCollisions([`${NFC}/a.ts`, `${NFD}/a.ts`])).toEqual({
      ok: false,
      file: [],
      directory: [[`${NFD}/`, `${NFC}/`]],
      stem: [],
    })
  })

  it('reports an NFC module beside an NFD module of another extension as a stem collision', () => {
    expect(findCaseCollisions([`src/${NFC}.tsx`, `src/${NFD}.ts`]).stem).toEqual([[`src/${NFD}.ts`, `src/${NFC}.tsx`]])
  })

  it('passes the shapes that are not case collisions', () => {
    expect(
      findCaseCollisions([
        'mission-control/src/Timeline.tsx',
        'mission-control/src/timelineDays.ts',
        'src/foo.ts',
        'src/foo.tsx',
        'src/foo.test.ts',
        'src/timeline.ts',
        'src/timeline/index.ts',
        'docs/Readme.md',
        'docs/README.txt',
        'docs/Readme/notes.md',
      ]),
    ).toEqual(CLEAN)
  })

  it('passes an empty tree', () => {
    expect(findCaseCollisions([])).toEqual(CLEAN)
  })
})

describe('formatReport', () => {
  it('prints one PASS line with the counts when clean', () => {
    expect(formatReport(CLEAN)).toBe('CASE-COLLISIONS: PASS 0 file · 0 directory · 0 stem\n')
  })

  it('names every group on its own line when failing', () => {
    const result = findCaseCollisions(['Bar/a.ts', 'bar/b.ts', 'src/Foo.tsx', 'src/foo.ts', 'src/Baz.ts', 'src/baz.ts'])
    expect(formatReport(result)).toBe(
      [
        'CASE-COLLISIONS: FAIL 1 file · 1 directory · 1 stem — one path on a case-insensitive filesystem (macOS)',
        '  file: src/Baz.ts ↔ src/baz.ts',
        '  directory: Bar/ ↔ bar/',
        '  stem: src/Foo.tsx ↔ src/foo.ts',
        '',
      ].join('\n'),
    )
  })
})

describe('parseArgs', () => {
  it('defaults the root and takes --root', () => {
    expect(parseArgs([], { root: '/repo' })).toEqual({ ok: true, root: '/repo' })
    expect(parseArgs(['--root', '/other'], { root: '/repo' })).toEqual({ ok: true, root: '/other' })
  })

  it('rejects an unknown flag or a missing value', () => {
    expect(parseArgs(['--nope'], { root: '/repo' }).ok).toBe(false)
    expect(parseArgs(['--root'], { root: '/repo' }).ok).toBe(false)
  })
})

describe('CLI', () => {
  const dirs = []
  afterEach(() => {
    while (dirs.length > 0) rmSync(dirs.pop(), { recursive: true, force: true })
  })

  function repoWithIndex(paths) {
    const dir = mkdtempSync(path.join(tmpdir(), 'case-collisions-'))
    dirs.push(dir)
    const git = (...args) => {
      const run = spawnSync('git', ['-C', dir, '-c', 'core.ignorecase=false', ...args], { encoding: 'utf8' })
      if (run.status !== 0) throw new Error(`git ${args.join(' ')}: ${run.stderr}`)
      return run.stdout.trim()
    }
    git('init', '-q')
    const blob = git('hash-object', '-w', '--stdin')
    for (const file of paths) git('update-index', '--add', '--cacheinfo', `100644,${blob},${file}`)
    return dir
  }

  it('exits 1 on an index holding Foo.ts and foo.ts and names the pair', () => {
    const root = repoWithIndex(['src/Foo.ts', 'src/foo.ts', 'src/ok.ts'])
    const result = spawnSync(process.execPath, [SCRIPT, '--root', root], { encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('  file: src/Foo.ts ↔ src/foo.ts')
  })

  it('exits 0 on the live tree', () => {
    const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' })
    expect(result.status).toBe(0)
    expect(result.stdout).toBe('CASE-COLLISIONS: PASS 0 file · 0 directory · 0 stem\n')
  })
})
