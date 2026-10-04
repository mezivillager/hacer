import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ownedSkills from '../owned-skills.json' with { type: 'json' }
import baseline from './docPathExists.baseline.json' with { type: 'json' }
import {
  DEAD_PATH_BASELINE,
  KNOWN_ROOTS,
  MISSING_PATH_MARKER,
  PATH_EXISTENCE_PATTERNS,
  deadPathVerdict,
  extractPathCitations,
  findDeadPaths,
  findFenceWarnings,
  formatDeadPaths,
  formatFenceWarnings,
  isPathExistenceFile,
  trackedPathExists,
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

  it('extracts a link target that carries a title', () => {
    expect(paths('[x](docs/a.md "The A doc") and [y](./src/b.ts \'B\')')).toEqual(['docs/a.md', 'src/b.ts'])
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

  it('does not treat a one-line triple-backtick span as a fence', () => {
    const text = ['run ```pnpm run lint``` first', '```js const x = 1 ```', '`src/after.ts`'].join('\n')
    expect(paths(text)).toEqual(['src/after.ts'])
  })

  it('closes a fence only with a bare fence at least as long as the opener', () => {
    const text = [
      '````md',
      '```bash',
      '`src/inside.ts`',
      '```',
      '````',
      '`src/after.ts`',
      '~~~',
      '```',
      '~~~',
      '`src/last.ts`',
    ].join('\n')
    expect(paths(text)).toEqual(['src/after.ts', 'src/last.ts'])
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

  it('ignores a :line:column suffix too', () => {
    expect(paths('`src/App.tsx:12`, `src/App.tsx:12:3` and [x](src/main.tsx:4:1-9:2)')).toEqual([
      'src/App.tsx',
      'src/main.tsx',
    ])
  })

  it('still reports a dead citation that follows a one-line fence span', () => {
    expect(findDeadPaths(['```inline```', '`src/api/index.ts`'].join('\n'), exists)).toEqual([
      { line: 2, path: 'src/api/index.ts', kind: 'code' },
    ])
  })
})

describe('findFenceWarnings', () => {
  it('is silent on balanced fences', () => {
    expect(findFenceWarnings(['```ts', 'x', '```', '~~~', 'y', '~~~'].join('\n'))).toEqual([])
  })

  it('warns when the file ends inside a fence', () => {
    expect(findFenceWarnings(['a', '```', 'b'].join('\n'))).toEqual([
      { line: 2, reason: 'unclosed' },
    ])
  })

  it('warns at a fence with an info string inside an open block — a stray fence above it', () => {
    const text = ['```', 'note', '```', 'prose', '```', '', '```bash', 'pnpm x', '```'].join('\n')
    expect(findFenceWarnings(text)).toEqual([{ line: 7, reason: 'nested-opener', opener: 5 }])
  })

  it('does not warn about a deliberately nested fence inside a longer opener', () => {
    expect(findFenceWarnings(['````md', '```bash', 'x', '```', '````'].join('\n'))).toEqual([])
  })

  it('renders one greppable FENCE line per warning', () => {
    expect(
      formatFenceWarnings('X.md', [
        { line: 2, reason: 'unclosed' },
        { line: 7, reason: 'nested-opener', opener: 5 },
      ]).split('\n'),
    ).toEqual([
      'FENCE X.md:2 opens a code block that never closes',
      'FENCE X.md:7 opens a code block inside the one opened at line 5 — a stray fence above?',
    ])
    expect(formatFenceWarnings('X.md', [])).toBe('')
  })
})

describe('isPathExistenceFile', () => {
  it('opts in the root entry docs, every harness brief and the skills we own', () => {
    expect(PATH_EXISTENCE_PATTERNS).toContain('REPO_MAP.md')
    expect(PATH_EXISTENCE_PATTERNS).toContain('AGENTS.md')
    expect([
      'REPO_MAP.md',
      'AGENTS.md',
      'docs/harness/implementer-brief.md',
      'docs/harness/fidelity-brief.md',
      ...ownedSkills.map((slug) => `.claude/skills/${slug}/SKILL.md`),
    ].filter((file) => !isPathExistenceFile(file))).toEqual([])
  })

  it('leaves the vendored skills out — sync-superpowers.sh would bring a dead citation back', () => {
    expect(isPathExistenceFile('.claude/skills/using-git-worktrees/SKILL.md')).toBe(false)
    expect(isPathExistenceFile('.claude/skills/dispatching-parallel-agents/SKILL.md')).toBe(false)
  })

  it.each([
    'docs/testing/standards.md',
    'docs/roadmap/vision.md',
    'docs/a-new-guide.md',
    'docs/harness/sessions/COORDINATOR-HANDOFF.md',
    'docs/harness/reviews/README.md',
    'docs/plans/phase-0.5-tickets/P05-99.md',
  ])('checks %s, like every doc under docs/ from birth', (file) => {
    expect(isPathExistenceFile(file)).toBe(true)
  })

  it('leaves out docs that are neither entry docs nor under docs/', () => {
    expect(isPathExistenceFile('CONTRIBUTING.md')).toBe(false)
    expect(isPathExistenceFile('src/test/README.md')).toBe(false)
  })

  it.each([
    'docs/research/2026-09-21-foundation-audit/REPORT.md',
    'docs/research/2026-09-docs-platform.md',
    'docs/harness/sessions/2026-09-18.md',
    'docs/harness/reviews/2026-09-26/BRIEF.md',
    'docs/harness/reviews/2026-09-26/reviews/1.md',
    'docs/decisions/rulings/2026-09-18-agent-readiness.md',
    'docs/plans/2026-03-22-phase-0.5-tickets.md',
    'docs/plans/2026-04-17-design-system-migration/01-phase-a-ant-strip.md',
    'docs/specs/2026-04-17-design-system-migration-design.md',
    'docs/specs/2026-10-04-x/y.md',
  ])('leaves out %s, a dated record of what was true on its date', (file) => {
    expect(isPathExistenceFile(file)).toBe(false)
  })

  it('does not let * cross a directory boundary', () => {
    expect(isPathExistenceFile('docs/harness/sessions/x-brief.md', ['docs/harness/*-brief.md'])).toBe(false)
    expect(isPathExistenceFile('x/REPO_MAP.md')).toBe(false)
  })

  it('lets ** cross directory boundaries', () => {
    expect(isPathExistenceFile('docs/a/b/c.md', ['docs/**'])).toBe(true)
  })

  it('takes the patterns as an argument, so a caller can narrow them', () => {
    expect(isPathExistenceFile('REPO_MAP.md', ['AGENTS.md'])).toBe(false)
    expect(isPathExistenceFile('docs/a.md', ['docs/*.md'])).toBe(true)
  })
})

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url))

const GRANDFATHERED = Object.entries(baseline)

describe('the dead-path baseline — one copy, in docPathExists.baseline.json', () => {
  it('is what the check reads', () => {
    expect(DEAD_PATH_BASELINE).toEqual(baseline)
  })

  it('is sorted by doc', () => {
    const docs = GRANDFATHERED.map(([file]) => file)
    expect([...docs].sort()).toEqual(docs)
  })

  it('records a positive count of dead citations per doc', () => {
    expect(GRANDFATHERED.filter(([, count]) => !Number.isInteger(count) || count < 1)).toEqual([])
  })

  it('names only docs that exist', () => {
    expect(GRANDFATHERED.filter(([file]) => !existsSync(join(REPO_ROOT, file)))).toEqual([])
  })

  it('names only docs the check covers, so every grandfathered doc is still checked against its count', () => {
    expect(GRANDFATHERED.filter(([file]) => !isPathExistenceFile(file))).toEqual([])
  })
})

describe('deadPathVerdict', () => {
  const counts = { 'docs/old.md': 3 }

  it('passes a doc with no baseline entry and no dead citation', () => {
    expect(deadPathVerdict('docs/new.md', 0, counts)).toEqual({ status: 'ok', allowed: 0 })
  })

  it('fails a doc with no baseline entry and one dead citation', () => {
    expect(deadPathVerdict('docs/new.md', 1, counts)).toEqual({ status: 'grew', allowed: 0 })
  })

  it('passes a grandfathered doc at its count', () => {
    expect(deadPathVerdict('docs/old.md', 3, counts)).toEqual({ status: 'ok', allowed: 3 })
  })

  it('fails a grandfathered doc that gains a dead citation', () => {
    expect(deadPathVerdict('docs/old.md', 4, counts)).toEqual({ status: 'grew', allowed: 3 })
  })

  it('reports a grandfathered doc that lost one, so its count comes down in the same change', () => {
    expect(deadPathVerdict('docs/old.md', 2, counts)).toEqual({ status: 'shrank', allowed: 3 })
    expect(deadPathVerdict('docs/old.md', 0, counts)).toEqual({ status: 'shrank', allowed: 3 })
  })

  it('reads the committed baseline by default', () => {
    const [[file, count]] = GRANDFATHERED
    expect(deadPathVerdict(file, count)).toEqual({ status: 'ok', allowed: count })
  })
})

describe('trackedPathExists', () => {
  const tracked = ['src/core/chips/registry.ts', 'AGENTS.md', 'docs/harness/ledger.md']

  it('knows every listed file and every directory above one', () => {
    const exists = trackedPathExists(tracked)
    expect(['src/core/chips/registry.ts', 'AGENTS.md', 'src', 'src/core', 'src/core/chips', 'docs/harness'].filter((p) => !exists(p))).toEqual([])
  })

  it('knows nothing else: no build output, no partial segment, no other case', () => {
    const exists = trackedPathExists(tracked)
    expect(['dist', 'dist/index.html', 'src/co', 'src/core/chips/registry', 'agents.md', 'src/Core'].filter(exists)).toEqual([])
  })
})

const CHECK_SCRIPT = join(REPO_ROOT, 'scripts/check-doc-paths.mjs')

/** Run `lint:docs` in a throwaway git repo holding only `files`, `stage`d ones added to the index. */
function runCheck(files, { args = [], stage = [] } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'doc-paths-'))
  try {
    spawnSync('git', ['init', '-q'], { cwd: repo })
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(join(repo, dirname(path)), { recursive: true })
      writeFileSync(join(repo, path), text)
    }
    if (stage.length > 0) spawnSync('git', ['add', '--', ...stage], { cwd: repo })
    const run = spawnSync(process.execPath, [CHECK_SCRIPT, ...args], { cwd: repo, encoding: 'utf8' })
    return { status: run.status, output: `${run.stdout}${run.stderr}` }
  } finally {
    rmSync(repo, { recursive: true, force: true })
  }
}

/** A doc citing `count` missing paths, one per line. */
const deadCitations = (count) => Array.from({ length: count }, (_, i) => `See \`src/gone-${i}.ts\`.`).join('\n') + '\n'

describe('check-doc-paths.mjs on a fixture repo', () => {
  it('reports a doc under docs/ that cites a missing path', () => {
    const { status, output } = runCheck({ 'docs/guide.md': '# Guide\n\nSee `src/gone.ts`.\n' })
    expect(output).toContain('DEAD PATH docs/guide.md:3 src/gone.ts')
    expect(status).toBe(1)
  })

  it('passes a doc under docs/ whose citations exist', () => {
    const { status, output } = runCheck({ 'docs/guide.md': '# Guide\n\nSee `docs/guide.md`.\n' })
    expect(output).toBe('')
    expect(status).toBe(0)
  })

  it('passes a dated record that cites a path deleted since', () => {
    const { status } = runCheck({ 'docs/research/2026-01-01-audit.md': 'See `src/gone.ts`.\n' })
    expect(status).toBe(0)
  })

  it('fails on a grandfathered doc whose citations are all green, so it leaves the list', () => {
    const [[file]] = GRANDFATHERED
    const { status, output } = runCheck({ [file]: `See \`${file}\`.\n` })
    expect(output).toContain(`STALE GRANDFATHER ${file}`)
    expect(status).toBe(1)
  })

  it('passes a grandfathered doc that keeps exactly the dead citations its baseline counts', () => {
    const [[file, count]] = GRANDFATHERED
    const { status, output } = runCheck({ [file]: deadCitations(count) })
    expect(output).toBe('')
    expect(status).toBe(0)
  })

  it('fails a grandfathered doc that gains a dead citation, listing its dead citations', () => {
    const [[file, count]] = GRANDFATHERED
    const { status, output } = runCheck({ [file]: deadCitations(count + 1) })
    expect(output).toContain(`GRANDFATHER GREW ${file} ${count} → ${count + 1}`)
    expect(output).toContain(`DEAD PATH ${file}:${count + 1} src/gone-${count}.ts`)
    expect(status).toBe(1)
  })

  it('fails a grandfathered doc that lost a dead citation until its count comes down', () => {
    const [[file, count]] = GRANDFATHERED
    const { status, output } = runCheck({ [file]: deadCitations(count - 1) })
    expect(output).toContain(`STALE GRANDFATHER ${file} ${count} → ${count - 1}`)
    expect(status).toBe(1)
  })

  it('resolves a citation against git, not the disk: ignored build output is not there', () => {
    const { status, output } = runCheck({
      '.gitignore': 'dist/\n',
      'dist/index.html': '<html></html>\n',
      'docs/guide.md': 'See `dist/index.html`.\n',
    })
    expect(output).toContain('DEAD PATH docs/guide.md:1 dist/index.html')
    expect(status).toBe(1)
  })

  it('counts a file not yet added to git, like the sweep counts a doc not yet added', () => {
    const { status } = runCheck({ 'src/new.ts': 'export {}\n', 'docs/guide.md': 'See `src/new.ts` in `src/`.\n' })
    expect(status).toBe(0)
  })

  it('resolves against the index under --staged: a file left unstaged is not part of the commit', () => {
    const files = { 'src/new.ts': 'export {}\n', 'docs/guide.md': 'See `src/new.ts`.\n' }
    const unstaged = runCheck(files, { args: ['--staged'], stage: ['docs/guide.md'] })
    expect(unstaged.output).toContain('DEAD PATH docs/guide.md:1 src/new.ts')
    expect(unstaged.status).toBe(1)
    expect(runCheck(files, { args: ['--staged'], stage: ['docs/guide.md', 'src/new.ts'] }).status).toBe(0)
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
