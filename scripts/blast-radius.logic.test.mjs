import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AGENT_READY_PRODUCTION_IMPORTER_THRESHOLD,
  PROXY_NOTE,
  USAGE,
  blastRadius,
  extractSpecifiers,
  formatJson,
  formatReport,
  isTestFile,
  parseArgs,
  parseFilesLikelyTouched,
  resolveSpecifier,
} from './blast-radius.logic.mjs'

const root = path.join(import.meta.dirname, '..')

/** The barrel case: a seed, an index that re-exports it, and a file that only imports the index. */
function barrelFiles() {
  return {
    'src/store/types.ts': 'export type CircuitState = { n: number }\n',
    'src/store/index.ts': "export type { CircuitState } from './types'\n",
    'src/components/Panel.tsx': "import type { CircuitState } from '@/store'\n",
    'src/other.ts': "import type { CircuitState } from '@/store/types'\n",
    'src/store/types.test.ts': "import type { CircuitState } from './types'\n",
    'src/test/helpers.ts': "import type { CircuitState } from '@/store/types'\n",
    'src/unrelated.ts': "import { x } from 'react'\n",
  }
}

describe('isTestFile', () => {
  it('treats *.test.* as tests and leaves every other file in the production count', () => {
    expect(isTestFile('src/store/types.test.ts')).toBe(true)
    expect(isTestFile('src/store/types.test.tsx')).toBe(true)
    expect(isTestFile('src/store/types.ts')).toBe(false)
    // The issue names *.test.*, so a helper under src/test/ stays in the production count.
    expect(isTestFile('src/test/helpers.ts')).toBe(false)
    expect(isTestFile('src/store/testing.ts')).toBe(false)
  })
})

describe('resolveSpecifier', () => {
  const files = new Set([
    'src/store/types.ts',
    'src/store/index.ts',
    'src/store.ts',
    'src/core/hdl/index.ts',
    'src/core/hdl/compiler.ts',
  ])

  it('resolves the @/ alias to src/', () => {
    expect(resolveSpecifier('src/App.tsx', '@/store/types', files)).toBe('src/store/types.ts')
  })

  it('resolves a directory import to its index before a same-named file wins', () => {
    expect(resolveSpecifier('src/App.tsx', '@/store', files)).toBe('src/store.ts')
    const indexOnly = new Set(['src/store/index.ts'])
    expect(resolveSpecifier('src/App.tsx', '@/store', indexOnly)).toBe('src/store/index.ts')
  })

  it('resolves a relative import through an index re-export target', () => {
    expect(resolveSpecifier('src/core/index.ts', './hdl', files)).toBe('src/core/hdl/index.ts')
    expect(resolveSpecifier('src/core/hdl/index.ts', './compiler', files)).toBe('src/core/hdl/compiler.ts')
  })

  it('leaves package imports and missing files unresolved', () => {
    expect(resolveSpecifier('src/App.tsx', 'react', files)).toBe(null)
    expect(resolveSpecifier('src/App.tsx', '@/missing', files)).toBe(null)
  })
})

describe('extractSpecifiers', () => {
  it('reads import, export-from and side-effect specifiers, including across lines', () => {
    const source = `
      import { a } from '@/store/types'
      import type { b } from './types'
      import './side'
      export { c } from './types'
      export type { d } from './more'
      export * from './star'
      const dynamic = import('./dyn')
      const required = require('./req')
      export { local }
      import {
        e,
        f,
      } from '@/store/types'
    `
    expect(extractSpecifiers(source)).toEqual([
      '@/store/types',
      './types',
      './side',
      './types',
      './more',
      './star',
      './dyn',
      './req',
      '@/store/types',
    ])
  })

  it('ignores imports that appear only in comments or strings', () => {
    const source = `
      // import { a } from 'not-real'
      const s = "import { a } from 'not-real'"
      import { b } from './real'
    `
    expect(extractSpecifiers(source)).toEqual(['./real'])
  })
})

describe('blastRadius', () => {
  it('counts direct importers, follows index re-exports into the closure, and splits tests', () => {
    const result = blastRadius({ files: barrelFiles(), seeds: ['src/store/types.ts'] })

    expect(result.proxy).toBe(PROXY_NOTE)
    expect(result.seeds).toEqual(['src/store/types.ts'])
    expect(result.unmatched).toEqual([])
    expect(result.direct.production).toEqual(['src/other.ts', 'src/store/index.ts', 'src/test/helpers.ts'])
    expect(result.direct.tests).toEqual(['src/store/types.test.ts'])
    // Panel.tsx imports the barrel, not the seed: transitive, not direct.
    expect(result.transitive.production).toEqual([
      'src/components/Panel.tsx',
      'src/other.ts',
      'src/store/index.ts',
      'src/test/helpers.ts',
    ])
    expect(result.transitive.tests).toEqual(['src/store/types.test.ts'])
    expect(result.counts).toEqual({
      directProduction: 3,
      directTests: 1,
      transitiveProduction: 4,
      transitiveTests: 1,
    })
    expect(result.overThreshold).toBe(false)
    for (const file of result.direct.production) expect(result.transitive.production).toContain(file)
    for (const file of result.direct.tests) expect(result.transitive.tests).toContain(file)
    expect(formatReport(result)).toContain(PROXY_NOTE)
    expect(formatReport(result)).toContain('src/components/Panel.tsx')
  })

  it('does not list a seed as an importer of the seed set', () => {
    const files = {
      'src/a.ts': 'export const a = 1\n',
      'src/b.ts': "import { a } from './a'\nexport const b = 2\n",
      'src/c.ts': "import { a } from './a'\nimport { b } from './b'\n",
    }
    const result = blastRadius({ files, seeds: ['src/a.ts', 'src/b.ts'] })
    expect(result.direct.production).toEqual(['src/c.ts'])
    expect(result.transitive.production).toEqual(['src/c.ts'])
  })

  it('stops on a cycle', () => {
    const files = {
      'src/a.ts': "import { b } from './b'\nexport const a = 1\n",
      'src/b.ts': "import { a } from './a'\nexport const b = 2\n",
    }
    const result = blastRadius({ files, seeds: ['src/a.ts'] })
    expect(result.direct.production).toEqual(['src/b.ts'])
    expect(result.transitive.production).toEqual(['src/b.ts'])
  })

  it('expands globs and directory prefixes, and reports seeds that match nothing', () => {
    const files = {
      '.github/ISSUE_TEMPLATE/a.yml': '',
      '.github/ISSUE_TEMPLATE/b.yml': '',
      '.github/OTHER/c.yml': '',
      'docs/decisions/0001.md': '',
      'docs/decisions/nested/x.md': '',
      'docs/other.md': '',
      'src/store/actions/a.ts': '',
      'src/store/actionsExtra.ts': '',
    }
    const globs = blastRadius({ files, seeds: ['.github/ISSUE_TEMPLATE/*', 'docs/decisions/**'] })
    expect(globs.seeds).toEqual([
      '.github/ISSUE_TEMPLATE/a.yml',
      '.github/ISSUE_TEMPLATE/b.yml',
      'docs/decisions/0001.md',
      'docs/decisions/nested/x.md',
    ])
    expect(globs.unmatched).toEqual([])

    const prefix = blastRadius({ files, seeds: ['src/store/actions/'] })
    expect(prefix.seeds).toEqual(['src/store/actions/a.ts'])

    const missing = blastRadius({ files, seeds: ['src/missing.ts'] })
    expect(missing.seeds).toEqual([])
    expect(missing.unmatched).toEqual(['src/missing.ts'])
  })

  it('is over the agent-ready threshold only when production direct importers exceed it', () => {
    expect(AGENT_READY_PRODUCTION_IMPORTER_THRESHOLD).toBe(20)

    const files = { 'src/seed.ts': 'export const s = 1\n' }
    for (let i = 0; i < 20; i++) files[`src/importers/p${i}.ts`] = "import { s } from '@/seed'\n"
    files['src/importers/p0.test.ts'] = "import { s } from '@/seed'\n"
    const atThreshold = blastRadius({ files, seeds: ['src/seed.ts'] })
    expect(atThreshold.counts.directProduction).toBe(20)
    expect(atThreshold.counts.directTests).toBe(1)
    expect(atThreshold.overThreshold).toBe(false)

    files['src/importers/p20.ts'] = "import { s } from '@/seed'\n"
    const over = blastRadius({ files, seeds: ['src/seed.ts'] })
    expect(over.counts.directProduction).toBe(21)
    expect(over.overThreshold).toBe(true)
  })
})

describe('formatReport', () => {
  const report = {
    proxy: PROXY_NOTE,
    threshold: 20,
    seeds: ['src/store/types.ts'],
    unmatched: [],
    direct: { production: ['src/other.ts', 'src/store/index.ts'], tests: ['src/store/types.test.ts'] },
    transitive: {
      production: ['src/components/Panel.tsx', 'src/other.ts', 'src/store/index.ts'],
      tests: ['src/store/types.test.ts'],
    },
    counts: { directProduction: 2, directTests: 1, transitiveProduction: 3, transitiveTests: 1 },
    overThreshold: false,
  }

  it('prints the proxy sentence, both sets, and the counts', () => {
    expect(formatReport(report)).toBe(
      [
        'BLAST-RADIUS: seeds=1 directProduction=2 directTests=1 transitiveProduction=3 transitiveTests=1 overThreshold=false',
        PROXY_NOTE,
        '',
        'Seeds',
        '  src/store/types.ts',
        '',
        'Direct production importers (2)',
        '  src/other.ts',
        '  src/store/index.ts',
        '',
        'Direct test importers (1)',
        '  src/store/types.test.ts',
        '',
        'Reverse transitive closure, production (3)',
        '  src/components/Panel.tsx',
        '  src/other.ts',
        '  src/store/index.ts',
        '',
        'Reverse transitive closure, tests (1)',
        '  src/store/types.test.ts',
        '',
      ].join('\n'),
    )
  })

  it('lists seeds that matched no file', () => {
    const text = formatReport({ ...report, seeds: [], unmatched: ['src/missing.ts'] })
    expect(text).toContain('Seeds\n  (none)')
    expect(text).toContain('Unmatched seeds\n  src/missing.ts')
  })

  it('prints the same report as JSON', () => {
    expect(formatJson(report).endsWith('\n')).toBe(true)
    expect(JSON.parse(formatJson(report))).toEqual(report)
  })
})

describe('parseArgs', () => {
  it('accepts files, --json and --issue', () => {
    expect(parseArgs(['src/a.ts'])).toEqual({ ok: true, json: false, issue: null, files: ['src/a.ts'] })
    expect(parseArgs(['--json', 'src/a.ts'])).toEqual({ ok: true, json: true, issue: null, files: ['src/a.ts'] })
    expect(parseArgs(['--issue', '333'])).toEqual({ ok: true, json: false, issue: 333, files: [] })
    expect(parseArgs(['src/a.ts', '--json', '--issue', '12', 'src/b.ts'])).toEqual({
      ok: true,
      json: true,
      issue: 12,
      files: ['src/a.ts', 'src/b.ts'],
    })
  })

  it('rejects a run with nothing to measure, and a bad --issue', () => {
    expect(parseArgs([])).toEqual({ ok: false, error: USAGE })
    expect(parseArgs(['--json'])).toEqual({ ok: false, error: USAGE })
    expect(parseArgs(['--issue'])).toEqual({ ok: false, error: '--issue needs a positive issue number' })
    expect(parseArgs(['--issue', '0'])).toEqual({ ok: false, error: '--issue needs a positive issue number' })
    expect(parseArgs(['--issue', 'x'])).toEqual({ ok: false, error: '--issue needs a positive issue number' })
    expect(parseArgs(['--nope'])).toEqual({ ok: false, error: 'unknown option --nope' })
  })
})

describe('parseFilesLikelyTouched', () => {
  it('reads backtick paths from that section and stops at the next heading', () => {
    const body = `## Goal
touch \`src/ignored.ts\`

## Files likely touched
\`scripts/blast-radius.mjs\`, \`src/store/types.ts\`, \`.github/ISSUE_TEMPLATE/*\`
Run \`node scripts/blast-radius.mjs\` before agent-ready.

## Blocked by
\`src/nope.ts\`
`
    expect(parseFilesLikelyTouched(body)).toEqual([
      'scripts/blast-radius.mjs',
      'src/store/types.ts',
      '.github/ISSUE_TEMPLATE/*',
    ])
  })

  it('returns nothing when the section is absent', () => {
    expect(parseFilesLikelyTouched('## Goal\nno files\n')).toEqual([])
    expect(parseFilesLikelyTouched('')).toEqual([])
  })
})

describe('the threshold evidence stays beside the constant', () => {
  it('records the measured gap and the SWE-bench-Live patch-shape numbers', () => {
    const source = readFileSync(new URL('./blast-radius.logic.mjs', import.meta.url), 'utf8')
    const at = source.indexOf('export const AGENT_READY_PRODUCTION_IMPORTER_THRESHOLD')
    const beside = source.slice(Math.max(0, at - 1600), at)
    expect(beside).toContain('MEASUREMENTS.md')
    expect(beside).toContain('19')
    expect(beside).toContain('37')
    expect(beside).toContain('84')
    expect(beside).toContain('48%')
  })
})

describe('triage uses the measurement', () => {
  it('states the rule where issues are shaped', () => {
    const readme = readFileSync(path.join(root, 'docs/harness/README.md'), 'utf8')
    expect(readme).toContain('more than 20 production importers is not `agent-ready` as written')
    expect(readme).toContain('split it, or spike first')
    expect(readme).toContain('AGENT_READY_PRODUCTION_IMPORTER_THRESHOLD')
    expect(readme).toContain('scripts/blast-radius.logic.mjs')
    expect(readme).toContain('Run `node scripts/blast-radius.mjs` on the seeds before `agent-ready` is applied')
    expect(readme).toContain('--issue')
    expect(readme).toContain('--json')
    expect(readme).toContain(PROXY_NOTE)
  })

  it('tells every issue template to run the command before agent-ready', () => {
    const dir = path.join(root, '.github/ISSUE_TEMPLATE')
    const templates = readdirSync(dir).filter((name) => /\.(yml|yaml|md)$/.test(name))
    expect(templates.length).toBeGreaterThan(0)
    for (const name of templates) {
      const text = readFileSync(path.join(dir, name), 'utf8')
      expect(text, name).toContain('Files likely touched')
      expect(text, name).toContain('scripts/blast-radius.mjs')
      expect(text, name).toContain('agent-ready')
      expect(text, name).toMatch(/before `agent-ready` is applied/)
    }
  })

  it('records a ledger row for the measurement', () => {
    const ledger = readFileSync(path.join(root, 'docs/harness/ledger.md'), 'utf8')
    expect(ledger).toContain('#333')
    expect(ledger).toContain('scripts/blast-radius.mjs')
  })
})
