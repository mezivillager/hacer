import { describe, it, expect } from 'vitest'
import {
  DEPENDENCY_LABEL,
  FAIL_LINES,
  FIXUP_MAX_LINES,
  FIXUP_MAX_LINES_PER_FILE,
  FIXUP_MAX_SHARE,
  OVERRIDE_LABEL,
  RULES,
  WARN_FILES,
  WARN_LINES,
  classifyFile,
  deletionOnlyExemption,
  evaluate,
  findLinkedIssues,
  formatConsole,
  formatSummary,
  isDocsOnly,
  linkedIssueExemption,
  measure,
  nextPageUrl,
  parseGeneratedPatterns,
} from './pr-hygiene.logic.mjs'

/** A file entry in the shape of GET /repos/{owner}/{repo}/pulls/{n}/files. */
function file(filename, additions = 1, deletions = 0, status = 'modified') {
  return { filename, additions, deletions, status }
}

/** Input to evaluate(); every field can be overridden. */
function pr(overrides = {}) {
  return {
    body: 'Fixes #150',
    author: 'mezivillager',
    labels: [],
    files: [file('src/core/thing.ts', 10, 2)],
    gitattributes: '',
    ...overrides,
  }
}

describe('constants', () => {
  it('carries the ADR-0013 budget numbers', () => {
    expect(WARN_LINES).toBe(200)
    expect(FAIL_LINES).toBe(400)
    expect(WARN_FILES).toBe(15)
    expect(OVERRIDE_LABEL).toBe('size-override')
  })

  it('carries the fix-up allowance a deletion-only PR may spend (#326)', () => {
    expect(FIXUP_MAX_LINES_PER_FILE).toBe(5)
    expect(FIXUP_MAX_LINES).toBe(20)
    expect(FIXUP_MAX_SHARE).toBe(0.05)
  })
})

describe('parseGeneratedPatterns', () => {
  it('returns the pattern of every linguist-generated line', () => {
    const text = ['*.min.js linguist-generated', 'dist/** linguist-generated=true'].join('\n')
    expect(parseGeneratedPatterns(text)).toEqual(['*.min.js', 'dist/**'])
  })

  it('ignores comments, blank lines, other attributes and negated markers', () => {
    const text = [
      '# comment',
      '',
      '* text=auto eol=lf',
      '*.png binary',
      'vendor/** -linguist-generated',
      'gen/** linguist-generated=false',
      'out/** linguist-vendored linguist-generated',
    ].join('\n')
    expect(parseGeneratedPatterns(text)).toEqual(['out/**'])
  })

  it('treats a missing .gitattributes as no patterns', () => {
    expect(parseGeneratedPatterns(undefined)).toEqual([])
    expect(parseGeneratedPatterns('')).toEqual([])
  })
})

describe('classifyFile', () => {
  it('counts source, workflow and doc files as reviewable', () => {
    expect(classifyFile('src/store/circuitStore.ts').kind).toBe('reviewable')
    expect(classifyFile('.github/workflows/ci.yml').kind).toBe('reviewable')
    expect(classifyFile('docs/harness/README.md').kind).toBe('reviewable')
    expect(classifyFile('scripts/pr-hygiene.mjs').kind).toBe('reviewable')
  })

  it('classifies test files by suffix and e2e/ by directory', () => {
    expect(classifyFile('src/core/hdl/parser.test.ts').kind).toBe('test')
    expect(classifyFile('src/x/y.spec.tsx').kind).toBe('test')
    expect(classifyFile('scripts/pr-hygiene.logic.test.mjs').kind).toBe('test')
    expect(classifyFile('e2e/store/autosave.ts').kind).toBe('test')
  })

  it.each([
    ['pnpm-lock.yaml', 'lockfile'],
    ['src/__snapshots__/a.test.ts.snap', 'snapshot'],
    ['src/foo/__snapshots__/x.json', 'snapshot'],
    ['src/foo/render.snap', 'snapshot'],
    ['conformance/vectors/and.json', 'vectors'],
    ['scripts/fixtures/gh-issues.json', 'fixture'],
    ['CHANGELOG.md', 'changelog'],
    ['docs/research/2026-09-18-agent-readiness/evidence/transcript.md', 'evidence'],
    ['docs/research/2026-09-18-agent-readiness/evidence/raw/timings.json', 'evidence'],
  ])('excludes %s as %s', (filename, reason) => {
    expect(classifyFile(filename)).toEqual({ kind: 'excluded', reason })
  })

  it('still counts every research file outside a top-level evidence/ directory', () => {
    expect(classifyFile('docs/research/2026-09-18-agent-readiness/REPORT.md').kind).toBe('reviewable')
    expect(classifyFile('docs/research/2026-09-18-agent-readiness/notes/evidence/x.md').kind).toBe('reviewable')
    expect(classifyFile('docs/evidence/x.md').kind).toBe('reviewable')
  })

  it('excludes files matching a linguist-generated pattern from .gitattributes', () => {
    const generated = parseGeneratedPatterns('*.min.js linguist-generated\ndist/** linguist-generated')
    expect(classifyFile('public/vendor/three.min.js', generated)).toEqual({ kind: 'excluded', reason: 'generated' })
    expect(classifyFile('dist/assets/index.js', generated)).toEqual({ kind: 'excluded', reason: 'generated' })
    expect(classifyFile('src/three.js', generated).kind).toBe('reviewable')
  })

  it('anchors a slash-containing pattern to the repo root, a bare one to any basename', () => {
    const generated = parseGeneratedPatterns('src/gen/*.ts linguist-generated\nschema.json linguist-generated')
    expect(classifyFile('src/gen/types.ts', generated).kind).toBe('excluded')
    expect(classifyFile('other/src/gen/types.ts', generated).kind).toBe('reviewable')
    expect(classifyFile('src/gen/deep/types.ts', generated).kind).toBe('reviewable')
    expect(classifyFile('a/b/schema.json', generated).kind).toBe('excluded')
  })

  it('does not treat a nested CHANGELOG.md or a stray "snap" substring as excluded', () => {
    expect(classifyFile('docs/CHANGELOG.md').kind).toBe('reviewable')
    expect(classifyFile('src/snapshot/take.ts').kind).toBe('reviewable')
  })
})

describe('measure', () => {
  it('sums additions and deletions into reviewable, test and excluded buckets', () => {
    const m = measure([
      file('src/a.ts', 10, 5),
      file('src/b.ts', 1, 1),
      file('src/a.test.ts', 100, 0),
      file('pnpm-lock.yaml', 500, 500),
    ])
    expect(m.reviewable.lines).toBe(17)
    expect(m.reviewable.files.map((f) => f.filename)).toEqual(['src/a.ts', 'src/b.ts'])
    expect(m.test.lines).toBe(100)
    expect(m.excluded.lines).toBe(1000)
    expect(m.excluded.files[0]).toMatchObject({ filename: 'pnpm-lock.yaml', lines: 1000, reason: 'lockfile' })
  })

  it('handles an empty diff', () => {
    const m = measure([])
    expect(m.reviewable).toEqual({ lines: 0, files: [] })
  })

  it('keeps each file own additions and deletions, so a rule can tell them apart', () => {
    const m = measure([file('src/a.ts', 3, 90)])
    expect(m.reviewable.files[0]).toMatchObject({ lines: 93, additions: 3, deletions: 90 })
  })
})

describe('deletionOnlyExemption', () => {
  /** The reviewable bucket the rule is handed, built the way evaluate() builds it. */
  const reviewable = (...files) => measure(files).reviewable

  it('exempts a PR that only deletes', () => {
    const result = deletionOnlyExemption(reviewable(file('src/legacy.ts', 0, 900), file('src/old.ts', 0, 300)))
    expect(result.exempt).toBe(true)
    expect(result.reason).toContain('1200')
  })

  it('exempts a deletion carrying the import and re-export fix-ups it forces', () => {
    const files = [file('src/legacy.ts', 0, 900), file('src/index.ts', 2, 6), file('src/app.ts', 3, 1)]
    expect(deletionOnlyExemption(reviewable(...files)).exempt).toBe(true)
  })

  it('refuses a "deletion" that sneaks in behaviour, naming the file that did it', () => {
    const result = deletionOnlyExemption(reviewable(file('src/legacy.ts', 0, 900), file('src/feature.ts', 60, 0)))
    expect(result.exempt).toBe(false)
    expect(result.reason).toContain('src/feature.ts')
    expect(result.reason).toContain('60')
  })

  it(`allows ${FIXUP_MAX_LINES_PER_FILE} added lines in one file and not one more`, () => {
    const at = (additions) => reviewable(file('src/legacy.ts', 0, 900), file('src/index.ts', additions, 0))
    expect(deletionOnlyExemption(at(FIXUP_MAX_LINES_PER_FILE)).exempt).toBe(true)
    expect(deletionOnlyExemption(at(FIXUP_MAX_LINES_PER_FILE + 1)).exempt).toBe(false)
  })

  it(`caps the whole fix-up allowance at ${FIXUP_MAX_LINES} lines however much is deleted`, () => {
    const fixups = (count) => Array.from({ length: count }, (_, i) => file(`src/i${i}.ts`, FIXUP_MAX_LINES_PER_FILE, 0))
    const at = (count) => reviewable(file('src/legacy.ts', 0, 9000), ...fixups(count))
    expect(deletionOnlyExemption(at(FIXUP_MAX_LINES / FIXUP_MAX_LINES_PER_FILE)).exempt).toBe(true)
    const over = deletionOnlyExemption(at(FIXUP_MAX_LINES / FIXUP_MAX_LINES_PER_FILE + 1))
    expect(over.exempt).toBe(false)
    expect(over.reason).toContain(String(FIXUP_MAX_LINES))
  })

  it(`caps fix-ups at ${FIXUP_MAX_SHARE * 100}% of what the PR deletes`, () => {
    // 300 deleted → a 15-line allowance, reached before the 20-line absolute cap.
    const at = (additions) => reviewable(file('src/legacy.ts', 0, 300), ...additions.map((a, i) => file(`src/i${i}.ts`, a, 0)))
    expect(deletionOnlyExemption(at([5, 5, 5])).exempt).toBe(true)
    const over = deletionOnlyExemption(at([4, 4, 4, 4]))
    expect(over.exempt).toBe(false)
    expect(over.reason).toContain('300')
  })

  it('says nothing about a PR that is not deletion-shaped', () => {
    expect(deletionOnlyExemption(reviewable(file('src/a.ts', 500, 0)))).toBeNull()
    expect(deletionOnlyExemption(reviewable(file('src/a.ts', 300, 250)))).toBeNull()
    expect(deletionOnlyExemption(reviewable())).toBeNull()
  })
})

describe('findLinkedIssues', () => {
  it.each(['Fixes #150', 'closes #150', 'RESOLVES #150', 'Fixed #150', 'Part of #150', 'part of #150'])(
    'accepts "%s"',
    (body) => {
      expect(findLinkedIssues(body)).toEqual([150])
    },
  )

  it('accepts a colon, a cross-repo reference and a full issue URL', () => {
    expect(findLinkedIssues('Fixes: #12')).toEqual([12])
    expect(findLinkedIssues('Closes mezivillager/hacer#12')).toEqual([12])
    expect(findLinkedIssues('Resolves https://github.com/mezivillager/hacer/issues/12')).toEqual([12])
  })

  it('returns every distinct issue in body order', () => {
    expect(findLinkedIssues('Fixes #1, closes #2 and fixes #1 again')).toEqual([1, 2])
  })

  it('ignores a bare #n, a keyword inside another word, and a missing body', () => {
    expect(findLinkedIssues('see #150 for context')).toEqual([])
    expect(findLinkedIssues('prefixes #150')).toEqual([])
    expect(findLinkedIssues(null)).toEqual([])
    expect(findLinkedIssues(undefined)).toEqual([])
  })
})

describe('isDocsOnly', () => {
  it('is true when every reviewable file is under docs/ or is a markdown file', () => {
    expect(isDocsOnly(['docs/harness/README.md', 'docs/specs/x.yml', 'AGENTS.md'])).toBe(true)
  })

  it('is false with any non-doc reviewable file, and for an empty list', () => {
    expect(isDocsOnly(['docs/a.md', 'src/a.ts'])).toBe(false)
    expect(isDocsOnly([])).toBe(false)
  })
})

describe('linkedIssueExemption', () => {
  it('exempts any *[bot] author, naming the login', () => {
    expect(DEPENDENCY_LABEL).toBe('dependencies')
    expect(linkedIssueExemption({ author: 'dependabot[bot]', labels: [] })).toContain('dependabot[bot]')
    expect(linkedIssueExemption({ author: 'renovate[bot]', labels: [] })).toContain('renovate[bot]')
  })

  it('exempts a PR carrying the dependencies label, naming the label', () => {
    expect(linkedIssueExemption({ author: 'mezivillager', labels: ['javascript', DEPENDENCY_LABEL] })).toContain(
      DEPENDENCY_LABEL,
    )
  })

  it('is null for a human author without the label, a missing author, and "[bot]" not at the end', () => {
    expect(linkedIssueExemption({ author: 'mezivillager', labels: ['project:harness'] })).toBeNull()
    expect(linkedIssueExemption({ author: undefined, labels: [] })).toBeNull()
    expect(linkedIssueExemption({ author: '[bot]impostor', labels: [] })).toBeNull()
  })
})

describe('evaluate', () => {
  const findingsFor = (result, rule) => result.findings.filter((f) => f.rule === rule)
  const levelsOf = (result, rule) => findingsFor(result, rule).map((f) => f.level)

  it('passes a small, linked PR and reports its measures', () => {
    const result = evaluate(pr())
    expect(result.verdict).toBe('PASS')
    expect(result.measures.reviewable.lines).toBe(12)
    expect(result.linkedIssues).toEqual([150])
    expect(result.docsOnly).toBe(false)
    expect(result.findings.every((f) => f.level === 'pass')).toBe(true)
  })

  it('warns above 200 reviewable lines and fails above 400', () => {
    expect(evaluate(pr({ files: [file('src/a.ts', 200, 0)] })).verdict).toBe('PASS')
    expect(evaluate(pr({ files: [file('src/a.ts', 201, 0)] })).verdict).toBe('WARN')
    expect(evaluate(pr({ files: [file('src/a.ts', 400, 0)] })).verdict).toBe('WARN')
    expect(evaluate(pr({ files: [file('src/a.ts', 401, 0)] })).verdict).toBe('FAIL')
  })

  it('reports and passes an over-budget PR carrying the size-override label', () => {
    const result = evaluate(pr({ files: [file('src/a.ts', 900, 0)], labels: [OVERRIDE_LABEL] }))
    expect(result.verdict).toBe('PASS')
    expect(findingsFor(result, 'size')[0].message).toContain('900')
    expect(findingsFor(result, 'size')[0].message).toContain(OVERRIDE_LABEL)
  })

  it('passes an over-budget deletion-only PR and says the budget was waived for it', () => {
    const result = evaluate(pr({ files: [file('src/legacy.ts', 0, 1200), file('src/index.ts', 2, 8)] }))
    expect(result.verdict).toBe('PASS')
    expect(result.sizeExemption).toContain('deletes')
    expect(findingsFor(result, 'size')[0].message).toMatch(/deletion-only/)
    expect(formatConsole(result).split('\n')[0]).toContain('size=deletion-only')
  })

  it('fails an over-budget "deletion" that adds behaviour, and names the file', () => {
    const result = evaluate(pr({ files: [file('src/legacy.ts', 0, 1200), file('src/feature.ts', 120, 0)] }))
    expect(result.verdict).toBe('FAIL')
    expect(result.sizeExemption).toBeNull()
    expect(findingsFor(result, 'size')[0].message).toMatch(/not exempt.*src\/feature\.ts/)
  })

  it('still requires a deletion-only PR to link an issue', () => {
    const result = evaluate(pr({ body: 'Removes the legacy machinery.', files: [file('src/legacy.ts', 0, 1200)] }))
    expect(result.verdict).toBe('FAIL')
    expect(levelsOf(result, 'size')).toEqual(['pass'])
    expect(levelsOf(result, 'linked-issue')).toEqual(['fail'])
  })

  it('leaves a deletion inside the target alone — nothing to waive, nothing to say', () => {
    const result = evaluate(pr({ files: [file('src/legacy.ts', 0, 150)] }))
    expect(result.sizeExemption).toBeNull()
    expect(findingsFor(result, 'size')[0].message).not.toMatch(/deletion-only/)
  })

  it('excludes a research evidence appendix but counts the report beside it', () => {
    const result = evaluate(
      pr({
        files: [
          file('docs/research/2026-09-21-x/evidence/transcripts.md', 1500, 0),
          file('docs/research/2026-09-21-x/REPORT.md', 120, 0),
        ],
      }),
    )
    expect(result.verdict).toBe('PASS')
    expect(result.measures.reviewable.lines).toBe(120)
    expect(result.measures.excluded.files[0]).toMatchObject({ lines: 1500, reason: 'evidence' })
  })

  it('does not count test lines, but reports them', () => {
    const result = evaluate(pr({ files: [file('src/a.ts', 5, 0), file('src/a.test.ts', 2000, 0)] }))
    expect(result.verdict).toBe('PASS')
    expect(result.measures.test.lines).toBe(2000)
  })

  it('excludes lockfile, snapshots, fixtures and linguist-generated files from the count', () => {
    const result = evaluate(
      pr({
        gitattributes: 'src/generated/** linguist-generated',
        files: [
          file('src/a.ts', 5, 0),
          file('pnpm-lock.yaml', 3000, 0),
          file('src/__snapshots__/a.snap', 700, 0),
          file('scripts/fixtures/big.json', 700, 0),
          file('src/generated/types.ts', 700, 0),
        ],
      }),
    )
    expect(result.verdict).toBe('PASS')
    expect(result.measures.reviewable.lines).toBe(5)
    expect(result.measures.excluded.lines).toBe(5100)
  })

  it('warns, without failing, above 15 reviewable files', () => {
    const files = Array.from({ length: WARN_FILES + 1 }, (_, i) => file(`src/f${i}.ts`, 1, 0))
    const result = evaluate(pr({ files }))
    expect(result.verdict).toBe('WARN')
    expect(levelsOf(result, 'size')).toContain('warn')
  })

  it('fails a PR whose body links no issue', () => {
    const result = evaluate(pr({ body: 'Just a change.' }))
    expect(result.verdict).toBe('FAIL')
    expect(levelsOf(result, 'linked-issue')).toEqual(['fail'])
    expect(findingsFor(result, 'linked-issue')[0].message).toContain('Fixes #')
  })

  it('treats a null body as unlinked', () => {
    expect(evaluate(pr({ body: null })).verdict).toBe('FAIL')
  })

  it('exempts a docs-only PR from the linked-issue rule', () => {
    const result = evaluate(pr({ body: 'Typo.', files: [file('docs/x.md', 3, 1), file('README.md', 1, 0)] }))
    expect(result.verdict).toBe('PASS')
    expect(result.docsOnly).toBe(true)
    expect(levelsOf(result, 'linked-issue')).toEqual(['pass'])
  })

  it('does not exempt a PR that touches docs and code', () => {
    const result = evaluate(pr({ body: 'Typo.', files: [file('docs/x.md', 3, 1), file('src/a.ts', 1, 0)] }))
    expect(result.verdict).toBe('FAIL')
  })

  it('does not exempt a PR whose only reviewable files are tests', () => {
    const result = evaluate(pr({ body: 'More tests.', files: [file('src/a.test.ts', 30, 0)] }))
    expect(result.verdict).toBe('FAIL')
  })

  it('skips the linked-issue rule for a bot author and says why', () => {
    const result = evaluate(pr({ body: 'Bumps zustand from 5.0.13 to 5.0.15.', author: 'dependabot[bot]' }))
    expect(result.verdict).toBe('PASS')
    expect(result.linkedIssueExemption).toContain('dependabot[bot]')
    expect(levelsOf(result, 'linked-issue')).toEqual(['pass'])
    expect(findingsFor(result, 'linked-issue')[0].message).toMatch(/skipped.*dependabot\[bot\]/)
  })

  it('skips the linked-issue rule for a PR carrying the dependencies label and says why', () => {
    const result = evaluate(pr({ body: 'Bump x.', labels: [DEPENDENCY_LABEL] }))
    expect(result.verdict).toBe('PASS')
    expect(levelsOf(result, 'linked-issue')).toEqual(['pass'])
    expect(findingsFor(result, 'linked-issue')[0].message).toMatch(/skipped.*dependencies/)
  })

  it('still applies the size rule to an exempt PR', () => {
    const result = evaluate(pr({ body: null, author: 'dependabot[bot]', files: [file('src/a.ts', 401, 0)] }))
    expect(result.verdict).toBe('FAIL')
    expect(levelsOf(result, 'size')).toEqual(['fail'])
    expect(levelsOf(result, 'linked-issue')).toEqual(['pass'])
  })

  it('still requires a human author without the dependencies label to link an issue', () => {
    const result = evaluate(pr({ body: 'Bump x.', author: 'mezivillager', labels: ['javascript'] }))
    expect(result.verdict).toBe('FAIL')
    expect(result.linkedIssueExemption).toBeNull()
    expect(levelsOf(result, 'linked-issue')).toEqual(['fail'])
  })

  it('reports a fail even when the size rule would only warn', () => {
    const result = evaluate(pr({ body: '', files: [file('src/a.ts', 250, 0)] }))
    expect(result.verdict).toBe('FAIL')
    expect(levelsOf(result, 'size')).toEqual(['warn'])
  })

  it('runs an extra rule when given one, so #151 can add its tamper flag', () => {
    const tamper = ({ files }) =>
      files.some((f) => f.filename.startsWith('.github/'))
        ? [{ rule: 'tamper', level: 'fail', message: 'protected path touched' }]
        : []
    const input = pr({ files: [file('.github/workflows/ci.yml', 1, 0)] })
    expect(evaluate(input).verdict).toBe('PASS')
    const result = evaluate(input, [...RULES, tamper])
    expect(result.verdict).toBe('FAIL')
    expect(findingsFor(result, 'tamper')).toHaveLength(1)
  })
})

describe('nextPageUrl', () => {
  it('extracts the rel="next" link from a GitHub Link header', () => {
    const link =
      '<https://api.github.com/repositories/1/pulls/2/files?per_page=100&page=2>; rel="next", ' +
      '<https://api.github.com/repositories/1/pulls/2/files?per_page=100&page=3>; rel="last"'
    expect(nextPageUrl(link)).toBe('https://api.github.com/repositories/1/pulls/2/files?per_page=100&page=2')
  })

  it('returns null on the last page or with no header', () => {
    expect(nextPageUrl('<https://api.github.com/x?page=1>; rel="prev"')).toBeNull()
    expect(nextPageUrl(null)).toBeNull()
    expect(nextPageUrl(undefined)).toBeNull()
  })
})

describe('formatConsole', () => {
  it('starts with one greppable HYGIENE line carrying the verdict and the numbers', () => {
    const out = formatConsole(evaluate(pr({ body: '', files: [file('src/a.ts', 450, 0), file('src/a.test.ts', 7, 0)] })))
    const [first, ...rest] = out.split('\n')
    expect(first).toMatch(/^HYGIENE: FAIL /)
    expect(first).toContain('reviewable=450')
    expect(first).toContain('test=7')
    expect(first).toContain('issue=none')
    expect(rest.length).toBeGreaterThan(0)
    expect(rest.filter((line) => line.startsWith('HYGIENE:'))).toEqual([])
  })

  it('names the linked issue on a pass', () => {
    expect(formatConsole(evaluate(pr())).split('\n')[0]).toMatch(/^HYGIENE: PASS .*issue=#150/)
  })

  it('marks the issue field skipped and states the reason for an exempt PR', () => {
    const [first, ...rest] = formatConsole(evaluate(pr({ body: null, author: 'dependabot[bot]' }))).split('\n')
    expect(first).toMatch(/^HYGIENE: PASS .*issue=skipped/)
    expect(rest.some((line) => /skipped.*dependabot\[bot\]/.test(line))).toBe(true)
  })
})

describe('formatSummary', () => {
  it('renders a markdown report with the verdict, the buckets and every finding', () => {
    const out = formatSummary(evaluate(pr({ files: [file('src/a.ts', 210, 0), file('src/a.test.ts', 7, 0)] })))
    expect(out).toContain('pr-hygiene: WARN')
    expect(out).toContain('| Reviewable | 210 | 1 |')
    expect(out).toContain('| Test | 7 | 1 |')
    expect(out).toContain('#150')
    expect(out).toContain('src/a.ts')
  })

  it('states why the linked-issue rule was skipped for an exempt PR', () => {
    const out = formatSummary(evaluate(pr({ body: null, labels: [DEPENDENCY_LABEL] })))
    expect(out).toContain('pr-hygiene: PASS')
    expect(out).toMatch(/skipped.*dependencies/)
  })
})
