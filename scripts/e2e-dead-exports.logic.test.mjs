import { describe, expect, it } from 'vitest'
import { findDeadExports, formatReport, isScoped } from './e2e-dead-exports.logic.mjs'

/** A module record with every field defaulted, so a case states only what it is about. */
const mod = (file, extra = {}) => ({
  file,
  exports: [],
  imports: [],
  reexports: [],
  starReexports: [],
  namespaceImports: [],
  internalRefs: [],
  ...extra,
})

const helper = (extra) => mod('e2e/helpers/a.ts', extra)
const spec = (extra) => mod('e2e/specs/a.spec.ts', extra)

describe('isScoped', () => {
  it('covers non-spec files under e2e/', () => {
    expect(isScoped('e2e/helpers/a.ts')).toBe(true)
  })

  it('excludes specs, Vitest files and everything outside e2e/', () => {
    expect(isScoped('e2e/specs/a.spec.ts')).toBe(false)
    expect(isScoped('e2e/helpers/a.test.ts')).toBe(false)
    expect(isScoped('src/utils/a.ts')).toBe(false)
  })
})

describe('findDeadExports', () => {
  it('keeps an export another module imports', () => {
    const modules = [
      helper({ exports: [{ name: 'used', kind: 'function' }] }),
      spec({ imports: [{ from: 'e2e/helpers/a.ts', name: 'used' }] }),
    ]
    expect(findDeadExports(modules)).toEqual([])
  })

  it('reports an export nothing imports', () => {
    const modules = [helper({ exports: [{ name: 'dead', kind: 'function' }] })]
    expect(findDeadExports(modules)).toEqual([{ file: 'e2e/helpers/a.ts', name: 'dead', kind: 'function' }])
  })

  it('keeps an export its own module still references', () => {
    const modules = [helper({ exports: [{ name: 'shared', kind: 'const' }], internalRefs: ['shared'] })]
    expect(findDeadExports(modules)).toEqual([])
  })

  it('follows a star re-export through a barrel', () => {
    const modules = [
      helper({ exports: [{ name: 'used', kind: 'function' }] }),
      mod('e2e/helpers/index.ts', { starReexports: ['e2e/helpers/a.ts'] }),
      spec({ imports: [{ from: 'e2e/helpers/index.ts', name: 'used' }] }),
    ]
    expect(findDeadExports(modules)).toEqual([])
  })

  it('follows a renaming re-export, matching the alias the importer names', () => {
    const modules = [
      helper({ exports: [{ name: 'test', kind: 'const' }] }),
      mod('e2e/fixtures/index.ts', {
        reexports: [{ from: 'e2e/helpers/a.ts', name: 'test', as: 'uiTest' }],
      }),
      spec({ imports: [{ from: 'e2e/fixtures/index.ts', name: 'uiTest' }] }),
    ]
    expect(findDeadExports(modules)).toEqual([])
  })

  it('still reports an export only a barrel re-exports', () => {
    const modules = [
      helper({ exports: [{ name: 'dead', kind: 'function' }] }),
      mod('e2e/helpers/index.ts', { starReexports: ['e2e/helpers/a.ts'] }),
    ]
    expect(findDeadExports(modules).map((d) => d.name)).toEqual(['dead'])
  })

  it('treats a namespace import as using every export of its target', () => {
    const modules = [
      helper({ exports: [{ name: 'a', kind: 'const' }, { name: 'b', kind: 'const' }] }),
      spec({ namespaceImports: ['e2e/helpers/a.ts'] }),
    ]
    expect(findDeadExports(modules)).toEqual([])
  })

  it('reports nothing for an unused export outside the scope', () => {
    expect(findDeadExports([mod('src/utils/a.ts', { exports: [{ name: 'dead', kind: 'const' }] })])).toEqual([])
  })

  it('survives a re-export whose specifier did not resolve', () => {
    const modules = [
      helper({ exports: [{ name: 'dead', kind: 'const' }] }),
      spec({ imports: [{ from: null, name: 'dead' }] }),
    ]
    expect(findDeadExports(modules).map((d) => d.name)).toEqual(['dead'])
  })

  it('does not loop on barrels that re-export each other', () => {
    const modules = [
      mod('e2e/helpers/index.ts', { starReexports: ['e2e/helpers/waits/index.ts'] }),
      mod('e2e/helpers/waits/index.ts', { starReexports: ['e2e/helpers/index.ts'] }),
      spec({ imports: [{ from: 'e2e/helpers/index.ts', name: 'nowhere' }] }),
    ]
    expect(findDeadExports(modules)).toEqual([])
  })
})

describe('formatReport', () => {
  it('says so when nothing is dead', () => {
    expect(formatReport([])).toBe('E2E-DEAD-EXPORTS: 0 dead exports')
  })

  it('lists each dead export under its file', () => {
    expect(
      formatReport([
        { file: 'e2e/helpers/a.ts', name: 'one', kind: 'function' },
        { file: 'e2e/helpers/a.ts', name: 'two', kind: 'const' },
      ]),
    ).toBe(
      [
        'E2E-DEAD-EXPORTS: 2 dead exports',
        '  e2e/helpers/a.ts',
        '    function one',
        '    const two',
      ].join('\n'),
    )
  })
})
