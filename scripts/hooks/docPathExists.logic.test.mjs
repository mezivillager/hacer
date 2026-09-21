import { describe, it, expect } from 'vitest'
import {
  KNOWN_ROOTS,
  MISSING_PATH_MARKER,
  PATH_EXISTENCE_PATTERNS,
  extractPathCitations,
  findDeadPaths,
  formatDeadPaths,
  isPathExistenceFile,
} from './docPathExists.logic.mjs'

const paths = (text, opts) => extractPathCitations(text, opts).map((c) => c.path)

describe('extractPathCitations — what counts as a citation', () => {
  it('extracts a backticked file path under a known root', () => {
    expect(paths('see `src/simulation/topologicalEval.ts` for details')).toEqual([
      'src/simulation/topologicalEval.ts',
    ])
  })

  it('extracts a backticked directory and drops the trailing slash', () => {
    expect(paths('specs live in `docs/specs/`')).toEqual(['docs/specs'])
  })

  it('extracts a known root cited without an extension or trailing slash', () => {
    expect(paths('pure logic in `src/core`')).toEqual(['src/core'])
  })

  it.each(KNOWN_ROOTS)('treats %s/ as a known root', (root) => {
    expect(paths(`\`${root}/whatever\``)).toEqual([`${root}/whatever`])
  })

  it('extracts a bare top-level file name with a known extension', () => {
    expect(paths('read `AGENTS.md`, then `llms.txt` and `package.json`')).toEqual([
      'AGENTS.md',
      'llms.txt',
      'package.json',
    ])
  })

  it('extracts a bare top-level dotfile', () => {
    expect(paths('phase tracking is in `.cursorrules`')).toEqual(['.cursorrules'])
  })

  it('extracts a bare directory citation, which means a top-level directory', () => {
    expect(paths('actions `src/store/actions/busActions/` + `busPlacementActions/`')).toEqual([
      'src/store/actions/busActions',
      'busPlacementActions',
    ])
  })

  it('extracts a slash path under an unknown root when it ends in a file extension', () => {
    expect(paths('- `apps/api/index.ts` - NestJS backend')).toEqual(['apps/api/index.ts'])
  })

  it('extracts a slash path under an unknown root when it ends in a slash', () => {
    expect(paths('- `packages/core/` - Shared core logic')).toEqual(['packages/core'])
  })

  it('strips a leading ./ from a backticked path', () => {
    expect(paths('run `./scripts/check-test-files.sh`')).toEqual(['scripts/check-test-files.sh'])
  })

  it('extracts a markdown link target', () => {
    expect(paths('- [Guide](docs/roadmap/implementation.md)')).toEqual([
      'docs/roadmap/implementation.md',
    ])
  })

  it('strips ./ and #anchor from a link target', () => {
    expect(paths('[x](./docs/roadmap/implementation.md#current-stack)')).toEqual([
      'docs/roadmap/implementation.md',
    ])
  })

  it('resolves a link relative to the citing doc directory', () => {
    expect(paths('[AGENTS.md](../AGENTS.md)', { docDir: '.claude' })).toEqual(['AGENTS.md'])
    expect(paths('[x](rules/workflow.md)', { docDir: '.claude' })).toEqual([
      '.claude/rules/workflow.md',
    ])
  })

  it('reports the 1-based line number and the kind of each citation', () => {
    const text = ['intro', '', 'see `src/a.ts` and [b](docs/b.md)'].join('\n')
    expect(extractPathCitations(text)).toEqual([
      { line: 3, path: 'src/a.ts', kind: 'code' },
      { line: 3, path: 'docs/b.md', kind: 'link' },
    ])
  })

  it('reports each citation on a line only once, even when code and link cite the same path', () => {
    expect(paths('- [`docs/llm-harness.md`](./docs/llm-harness.md) - MCP')).toEqual([
      'docs/llm-harness.md',
    ])
  })
})

describe('extractPathCitations — what is ignored', () => {
  it.each([
    ['a glob', '`e2e/specs/**/*.store.spec.ts`'],
    ['a bare glob', '`*.test.ts`'],
    ['a brace glob', '`src/gates/components/{Nand,And}Gate.tsx`'],
    ['a placeholder segment', '`src/store/actions/<domain>/`'],
    ['a placeholder file name', '`docs/plans/YYYY-MM-DD-<feature>.md`'],
    ['an elided path', '`src/core/…`'],
    ['a URL', '`https://example.com/docs/x.md`'],
    ['a sibling-repo path (ADR-0010 convention)', '`../web-ide/simulator/src/chip/chip.ts`'],
    ['a tilde path', '`~/.claude/hooks/x.sh`'],
    ['a leading-slash path', '`/public/fonts/`'],
    ['a machine absolute path', '`/Users/someone/x/y.ts`'],
    ['a Vite alias specifier', '`@/lib/notify`'],
    ['a shell command containing a path', '`node scripts/check-doc-paths.mjs --staged`'],
    ['either/or prose', '`read/write`'],
    ['extension-only prose', '`.tst/.cmp`'],
    ['a bare extension mention', 'test scripts (`.tst`, `.cmp`) and `.md` docs'],
    ['a dotted identifier', '`CircuitState.lastSimulationError`'],
    ['a JSX snippet', '`<Shell scene={<CanvasArea/>} />`'],
    ['an object literal', '`{ x: Math.PI / 2, y: 0 }`'],
  ])('ignores %s', (_label, text) => {
    expect(paths(text)).toEqual([])
  })

  it.each([
    ['a URL link', '[x](https://example.com/docs/x.md)'],
    ['a mailto link', '[x](mailto:someone@example.com)'],
    ['an anchor-only link', '[x](#some-heading)'],
    ['a link that escapes the repo', '[x](../web-ide/README.md)'],
    ['a link with a placeholder', '[x](docs/plans/<name>.md)'],
  ])('ignores %s', (_label, text) => {
    expect(paths(text)).toEqual([])
  })

  it('ignores everything inside a fenced code block', () => {
    const text = [
      '```',
      'src/',
      '├── api/          # `src/api/index.ts`',
      '```',
      'after the fence `src/real.ts`',
    ].join('\n')
    expect(paths(text)).toEqual(['src/real.ts'])
  })

  it(`skips a line carrying the ${MISSING_PATH_MARKER} marker`, () => {
    expect(paths(`planned: \`src/api/index.ts\` <!-- ${MISSING_PATH_MARKER} -->`)).toEqual([])
  })

  it('only opts out the marked line, not the whole file', () => {
    const text = [`\`src/api/a.ts\` <!-- ${MISSING_PATH_MARKER} -->`, '`src/api/b.ts`'].join('\n')
    expect(extractPathCitations(text)).toEqual([{ line: 2, path: 'src/api/b.ts', kind: 'code' }])
  })

  it('handles empty and missing input', () => {
    expect(extractPathCitations('')).toEqual([])
    expect(extractPathCitations(undefined)).toEqual([])
  })
})

describe('findDeadPaths', () => {
  const fs = new Set(['src/simulation/topologicalEval.ts', 'docs/roadmap', 'AGENTS.md'])
  const exists = (p) => fs.has(p)

  it('returns only the citations the injected filesystem does not know', () => {
    const text = [
      'live: `src/simulation/topologicalEval.ts`, `docs/roadmap/`, [a](./AGENTS.md)',
      'dead: `src/api/index.ts` and [x](docs/missing.md)',
    ].join('\n')
    expect(findDeadPaths(text, exists)).toEqual([
      { line: 2, path: 'src/api/index.ts', kind: 'code' },
      { line: 2, path: 'docs/missing.md', kind: 'link' },
    ])
  })

  it('asks the filesystem for directory citations without the trailing slash', () => {
    const asked = []
    findDeadPaths('`docs/roadmap/`', (p) => (asked.push(p), true))
    expect(asked).toEqual(['docs/roadmap'])
  })

  it('resolves links against docDir before asking the filesystem', () => {
    expect(findDeadPaths('[x](../AGENTS.md)', exists, { docDir: '.claude' })).toEqual([])
  })

  it('returns nothing for a clean doc', () => {
    expect(findDeadPaths('see `AGENTS.md`', exists)).toEqual([])
  })

  it('resolves a backticked citation against the citing doc as well as the repo root', () => {
    const siblings = (p) => p === 'docs/harness/verifier-brief.md'
    expect(findDeadPaths('see `verifier-brief.md`', siblings, { docDir: 'docs/harness' })).toEqual([])
    expect(findDeadPaths('see `verifier-brief.md`', siblings, { docDir: 'docs' })).toEqual([
      { line: 1, path: 'verifier-brief.md', kind: 'code' },
    ])
  })

  it('ignores the :line suffix the briefs require of a citation', () => {
    expect(paths('`src/core/chips/types.ts:7` and `src/simulation/topologicalEval.ts:117-123`')).toEqual([
      'src/core/chips/types.ts',
      'src/simulation/topologicalEval.ts',
    ])
    expect(findDeadPaths('`src/simulation/topologicalEval.ts:42`', exists)).toEqual([])
  })
})

describe('isPathExistenceFile', () => {
  it('opts in the two root entry docs and every harness brief', () => {
    expect(PATH_EXISTENCE_PATTERNS).toContain('REPO_MAP.md')
    expect(PATH_EXISTENCE_PATTERNS).toContain('AGENTS.md')
    expect(['REPO_MAP.md', 'AGENTS.md', 'docs/harness/implementer-brief.md', 'docs/harness/fidelity-brief.md']
      .every(isPathExistenceFile)).toBe(true)
  })

  it.each([
    'CONTRIBUTING.md',
    'docs/harness/README.md',
    'docs/harness/ledger.md',
    'docs/roadmap/vision.md',
  ])('leaves %s out until its citations are green', (file) => {
    expect(isPathExistenceFile(file)).toBe(false)
  })

  it('does not let * cross a directory boundary', () => {
    expect(isPathExistenceFile('docs/harness/sessions/2026-09-19-brief.md')).toBe(false)
    expect(isPathExistenceFile('x/REPO_MAP.md')).toBe(false)
  })

  it('takes the patterns as an argument, so a caller can narrow them', () => {
    expect(isPathExistenceFile('REPO_MAP.md', ['AGENTS.md'])).toBe(false)
    expect(isPathExistenceFile('docs/a.md', ['docs/*.md'])).toBe(true)
  })
})

describe('formatDeadPaths', () => {
  it('renders one greppable DEAD PATH line per hit', () => {
    const out = formatDeadPaths('REPO_MAP.md', [
      { line: 123, path: 'src/api/foo.ts', kind: 'code' },
      { line: 400, path: 'docs/nope.md', kind: 'link' },
    ])
    expect(out.split('\n')).toEqual([
      'DEAD PATH REPO_MAP.md:123 src/api/foo.ts',
      'DEAD PATH REPO_MAP.md:400 docs/nope.md',
    ])
  })

  it('renders nothing for no hits', () => {
    expect(formatDeadPaths('REPO_MAP.md', [])).toBe('')
  })
})
