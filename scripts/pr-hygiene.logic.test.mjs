import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
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
  RATCHET_BASELINE_FILE,
  RATCHET_CONFIG_FILE,
  compareRatchetBaseline,
  nextPageUrl,
  parseGeneratedPatterns,
  parseRatchetBaseline,
  readAtRef,
  stripFencedCode,
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

describe('protected path: conformance/vectors/**', () => {
  const levelsOf = (result, rule) => result.findings.filter((f) => f.rule === rule).map((f) => f.level)

  it('warns, and does not fail, when the vendored oracle is touched', () => {
    const result = evaluate(pr({ files: [file('conformance/vectors/01/Xor.tst', 40, 0), file('src/core/thing.ts', 10, 2)] }))
    expect(levelsOf(result, 'protected-path')).toEqual(['warn'])
    expect(result.findings.find((f) => f.rule === 'protected-path').message).toContain('conformance/vectors/01/Xor.tst')
    expect(result.verdict).toBe('WARN')
  })

  it('stays quiet when the oracle is left alone', () => {
    const result = evaluate(pr())
    expect(levelsOf(result, 'protected-path')).toEqual([])
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


// ── The ratchet growth guard (#406) ────────────────────────────────────────────────────────────
//
// `pnpm run lint:layers` refuses a new violation, but the documented `depcruise … --baseline`
// write absorbs it and `lint` is green again — measured on this repo 2026-09-24: 72 rows → 73,
// with `engine-no-state: src/core/ratchetProbe.ts -> src/store/circuitStore.ts` absorbed. That
// command cannot simply go away: arming a rule needs it (#404 took the baseline 34 → 77 arming
// `core-through-index`). So the rule is not "rows may never grow" — it is "a row may only appear
// under a rule name that is new in this PR".

const violation = (name, from, to) => ({ type: 'dependency', from, to, rule: { severity: 'error', name } })
const baselineOf = (...rows) => JSON.stringify(rows, null, 2)

/** This repo's own committed baseline — the parser is pinned against the real file, not a mock. */
const REAL_BASELINE = readFileSync(path.join(import.meta.dirname, '..', RATCHET_BASELINE_FILE), 'utf8')
const realRows = () => JSON.parse(REAL_BASELINE)

// #460 RED DEMO — temporary, removed in the fix commit. A copy of the live baseline with
// `engine-no-state` and `core-through-index` shrunk to 0 rows, to show both hazards before they
// are fixed: the #404-reproduction test (line ~613) goes red, and the "also repairs a real
// violation" test (line ~851) passes vacuously (the `findIndex` it relies on returns -1, so its
// own `filter` removes nothing — nothing is repaired, yet it still reports PASS).
const SHRUNK_BASELINE = readFileSync(path.join(import.meta.dirname, 'fixtures/pr-hygiene/known-violations-both-rules-at-zero.json'), 'utf8')
const shrunkRows = () => JSON.parse(SHRUNK_BASELINE)

/** This repo's own config — the only place a rule name is ever declared. Read as text, never run. */
const REAL_CONFIG = readFileSync(path.join(import.meta.dirname, '..', RATCHET_CONFIG_FILE), 'utf8')
/** A config declaring exactly these rule names, in the shape the real one writes them. */
const configOf = (...names) => `module.exports = {\n  forbidden: [\n${names.map((name) => `    { name: '${name}', severity: 'error' },`).join('\n')}\n  ],\n}\n`
/** The config as the PR's changed-file list sees it: edited, or not. */
const configEdit = () => file(RATCHET_CONFIG_FILE, 6, 0)

describe('parseRatchetBaseline', () => {
  it('reads one comparable row per recorded violation', () => {
    const parsed = parseRatchetBaseline(baselineOf(violation('engine-no-state', 'src/core/a.ts', 'src/store/b.ts')))
    expect(parsed).toEqual({ rows: [{ rule: 'engine-no-state', edge: 'src/core/a.ts → src/store/b.ts' }] })
  })

  it('treats an absent file as an empty ratchet', () => {
    expect(parseRatchetBaseline(null)).toEqual({ rows: [] })
  })

  it('reports a file that is not a JSON array of violation rows', () => {
    expect(parseRatchetBaseline('{ not json').error).toMatch(/JSON/)
    expect(parseRatchetBaseline('{}').error).toMatch(/array/)
    expect(parseRatchetBaseline('[{"from":"a","to":"b"}]').error).toMatch(/rule name/)
  })

  it('parses the baseline this repo actually commits', () => {
    const { rows, error } = parseRatchetBaseline(REAL_BASELINE)
    expect(error).toBeUndefined()
    expect(rows.length).toBe(realRows().length)
    expect(rows.every((row) => row.rule && row.edge.includes(' → '))).toBe(true)
  })
})

describe('compareRatchetBaseline', () => {
  const engine = violation('engine-no-state', 'src/core/a.ts', 'src/store/b.ts')
  const other = violation('engine-no-state', 'src/core/c.ts', 'src/store/b.ts')
  const armed = violation('core-through-index', 'src/components/x.tsx', 'src/core/chips/y.ts')
  /** The config side of a PR that genuinely arms `name`: it is declared here and was not before. */
  const arming = (name, baseNames = ['engine-no-state']) => ({
    baseConfig: configOf(...baseNames),
    headConfig: configOf(...baseNames, name),
    configTouched: true,
  })

  it('passes an unchanged baseline, whatever order the rows are written in', () => {
    const verdict = compareRatchetBaseline({ base: baselineOf(engine, other), head: baselineOf(other, engine) })
    expect(verdict.status).toBe('unchanged')
  })

  it('passes a baseline that shrank', () => {
    const verdict = compareRatchetBaseline({ base: baselineOf(engine, other), head: baselineOf(engine) })
    expect(verdict.status).toBe('shrank')
    expect(verdict.counts).toEqual({ base: 2, head: 1 })
  })

  it('reads growth under a rule name this PR declares in the config as arming that rule', () => {
    // "New in this PR" is a claim about `.dependency-cruiser.cjs`, not about the baseline rows.
    // This case used to assert the same thing while supplying no config at all, which is exactly
    // the conflation that let a zero-row rule absorb a violation (#432 round 2, blocker 2).
    const verdict = compareRatchetBaseline({
      base: baselineOf(engine),
      head: baselineOf(engine, armed),
      ...arming('core-through-index'),
    })
    expect(verdict.status).toBe('armed')
    expect(verdict.armedRules).toEqual(['core-through-index'])
    expect(verdict.added).toHaveLength(1)
  })

  it('reads #404 — the real 29 → 72 growth — as arming core-through-index', () => {
    // #404 is the only genuine arming in this repo's history, and it touched the config
    // (`gh api repos/mezivillager/hacer/pulls/404/files`). Its base config is the real one with
    // that rule's declaration taken back out.
    const base = shrunkRows().filter((row) => row.rule.name !== 'core-through-index') // #460 RED DEMO
    const verdict = compareRatchetBaseline({
      base: JSON.stringify(base),
      head: SHRUNK_BASELINE, // #460 RED DEMO
      baseConfig: REAL_CONFIG.replace("name: 'core-through-index'", "name: 'core-through-index-was-not-here'"),
      headConfig: REAL_CONFIG,
      configTouched: true,
    })
    expect(verdict.status).toBe('armed')
    expect(verdict.armedRules).toEqual(['core-through-index'])
    expect(verdict.absorbed).toHaveLength(0)
  })

  it('reads a row added under an existing rule as an absorption, and names it', () => {
    const verdict = compareRatchetBaseline({ base: baselineOf(engine), head: baselineOf(engine, other) })
    expect(verdict.status).toBe('absorbed')
    expect(verdict.absorbed).toEqual([{ rule: 'engine-no-state', edge: 'src/core/c.ts → src/store/b.ts' }])
  })

  it('names only the pre-existing-rule rows when one PR both arms and absorbs', () => {
    const verdict = compareRatchetBaseline({
      base: baselineOf(engine),
      head: baselineOf(engine, armed, other),
      ...arming('core-through-index'),
    })
    expect(verdict.status).toBe('absorbed')
    expect(verdict.absorbed.map((row) => row.edge)).toEqual(['src/core/c.ts → src/store/b.ts'])
    expect(verdict.armedRules).toEqual(['core-through-index'])
  })

  it('reproduces the measured reset: the real baseline plus one absorbed edge', () => {
    const head = [...realRows(), { type: 'dependency', from: 'src/core/ratchetProbe.ts', to: 'src/store/circuitStore.ts', rule: { severity: 'error', name: 'engine-no-state' } }]
    const verdict = compareRatchetBaseline({ base: REAL_BASELINE, head: JSON.stringify(head) })
    expect(verdict.status).toBe('absorbed')
    expect(realRows().length).toBeGreaterThan(0)
    expect(verdict.counts).toEqual({ base: realRows().length, head: realRows().length + 1 })
    expect(verdict.absorbed).toEqual([
      { rule: 'engine-no-state', edge: 'src/core/ratchetProbe.ts → src/store/circuitStore.ts' },
    ])
  })

  it('reads a row swapped in under an existing rule as an absorption — the count never gates it', () => {
    const verdict = compareRatchetBaseline({ base: baselineOf(engine), head: baselineOf(other) })
    expect(verdict.status).toBe('absorbed')
    expect(verdict.added.map((row) => row.edge)).toEqual(['src/core/c.ts → src/store/b.ts'])
  })

  it('reports a head baseline it cannot read rather than passing it', () => {
    expect(compareRatchetBaseline({ base: baselineOf(engine), head: 'nope' }).status).toBe('unreadable')
  })
})

describe('the ratchet rule inside evaluate()', () => {
  const engine = violation('engine-no-state', 'src/core/a.ts', 'src/store/b.ts')
  const other = violation('engine-no-state', 'src/core/c.ts', 'src/store/b.ts')
  const armed = violation('core-through-index', 'src/components/x.tsx', 'src/core/chips/y.ts')
  const ratchetPr = (ratchet, overrides = {}) => pr({ ratchet, ...overrides })
  const ratchetFinding = (result) => result.findings.find((finding) => finding.rule === 'ratchet')

  it('passes a PR that does not touch the baseline at all', () => {
    const result = evaluate(pr())
    expect(ratchetFinding(result).level).toBe('pass')
    expect(ratchetFinding(result).message).toContain(RATCHET_BASELINE_FILE)
  })

  it('fails an undeclared absorption and names the added rows', () => {
    const result = evaluate(ratchetPr({ base: baselineOf(engine), head: baselineOf(engine, other) }))
    expect(result.verdict).toBe('FAIL')
    expect(ratchetFinding(result).message).toContain('engine-no-state: src/core/c.ts → src/store/b.ts')
    expect(ratchetFinding(result).message).toContain('Baseline-growth:')
  })

  it('warns, rather than failing, when the PR body declares the growth', () => {
    const result = evaluate(
      ratchetPr(
        { base: baselineOf(engine), head: baselineOf(engine, other) },
        { body: 'Fixes #150\n\nBaseline-growth: engine-no-state: src/core/c.ts → src/store/b.ts — renamed src/core/a.ts' },
      ),
    )
    expect(result.verdict).toBe('WARN')
    expect(ratchetFinding(result).level).toBe('warn')
    expect(ratchetFinding(result).message).toContain('renamed src/core/a.ts')
  })

  it('passes a rule armed in the same commit', () => {
    // `configTouched` is not something the caller asserts: evaluate() reads it off the PR's own
    // changed-file list, so a claim of arming always costs a reviewable line in the config.
    const result = evaluate(
      ratchetPr(
        {
          base: baselineOf(engine),
          head: baselineOf(engine, armed),
          baseConfig: configOf('engine-no-state'),
          headConfig: configOf('engine-no-state', 'core-through-index'),
        },
        { files: [file('src/core/thing.ts', 10, 2), configEdit()] },
      ),
    )
    expect(ratchetFinding(result).level).toBe('pass')
    expect(ratchetFinding(result).message).toContain('core-through-index')
  })

  it('fails a swap that keeps the row count flat — one fixed, one absorbed', () => {
    const result = evaluate(ratchetPr({ base: baselineOf(engine), head: baselineOf(other) }))
    expect(ratchetFinding(result).level).toBe('fail')
  })

  it('fails a baseline it cannot read', () => {
    const result = evaluate(ratchetPr({ base: baselineOf(engine), head: '[' }))
    expect(result.verdict).toBe('FAIL')
  })

  it('puts the ratchet verdict on the greppable HYGIENE line', () => {
    const out = formatConsole(evaluate(ratchetPr({ base: baselineOf(engine), head: baselineOf(engine, other) })))
    expect(out).toContain('ratchet=absorbed')
  })
})


// ── What the verifier found still open (#432) ───────────────────────────────────────────────────
//
// Detection was already a set difference; the fail/warn split was not — it still asked whether the
// row *count* grew, so "fix one violation and absorb another" read `swapped` → warn → exit 0. That
// is not an adversarial case: it is the ordinary shape of the foundation refactor, which moves
// files between layers and can repair one cross-layer edge while introducing another.

describe('the fail/warn split is the row set, not the count (#432)', () => {
  const engine = violation('engine-no-state', 'src/core/a.ts', 'src/store/b.ts')
  const other = violation('engine-no-state', 'src/core/c.ts', 'src/store/b.ts')
  const third = violation('engine-no-state', 'src/core/d.ts', 'src/store/b.ts')
  const fourth = violation('engine-no-state', 'src/core/e.ts', 'src/store/b.ts')
  const armed = violation('core-through-index', 'src/components/x.tsx', 'src/core/chips/y.ts')
  const renamedRule = violation('engine-no-state-v2', 'src/core/a.ts', 'src/store/b.ts')
  const ratchetFinding = (result) => result.findings.find((finding) => finding.rule === 'ratchet')

  it('fails fix-one-absorb-one, where the count stays flat', () => {
    const verdict = compareRatchetBaseline({ base: baselineOf(engine, other), head: baselineOf(other, third) })
    expect(verdict.status).toBe('absorbed')
    expect(verdict.counts).toEqual({ base: 2, head: 2 })
    expect(verdict.absorbed.map((row) => row.edge)).toEqual(['src/core/d.ts → src/store/b.ts'])
  })

  it('fails fix-two-absorb-one, where the count falls', () => {
    const verdict = compareRatchetBaseline({
      base: baselineOf(engine, other, third),
      head: baselineOf(third, fourth),
    })
    expect(verdict.status).toBe('absorbed')
    expect(verdict.counts).toEqual({ base: 3, head: 2 })
    expect(verdict.absorbed.map((row) => row.edge)).toEqual(['src/core/e.ts → src/store/b.ts'])
  })

  it('never calls the row count flat when it fell', () => {
    const result = evaluate(pr({ ratchet: { base: baselineOf(engine, other, third), head: baselineOf(third, fourth) } }))
    expect(result.verdict).toBe('FAIL')
    expect(ratchetFinding(result).message).toContain('3 → 2 baseline rows')
    expect(ratchetFinding(result).message).not.toContain('flat')
  })

  it('still passes a rule armed with nothing removed', () => {
    const verdict = compareRatchetBaseline({
      base: baselineOf(engine),
      head: baselineOf(engine, armed),
      baseConfig: configOf('engine-no-state'),
      headConfig: configOf('engine-no-state', 'core-through-index'),
      configTouched: true,
    })
    expect(verdict.status).toBe('armed')
    expect(verdict.removed).toEqual([])
  })

  it('warns — not passes — when rows leave under one name and arrive under another', () => {
    // A rule renamed in `.dependency-cruiser.cjs` carries its old rows under the new name, which
    // is indistinguishable from a genuine arming by the baseline alone. It is distinguishable from
    // an *arming*, though: an arming removes nothing. So a baseline that both lost and gained rows
    // warns and points at the config diff, instead of reading `armed` and passing silently.
    const rename = {
      base: baselineOf(engine),
      head: baselineOf(renamedRule),
      baseConfig: configOf('engine-no-state'),
      headConfig: configOf('engine-no-state-v2'),
    }
    const verdict = compareRatchetBaseline({ ...rename, configTouched: true })
    expect(verdict.status).toBe('swapped')
    const result = evaluate(pr({ ratchet: rename, files: [file('src/core/thing.ts', 10, 2), configEdit()] }))
    expect(result.verdict).toBe('WARN')
    expect(ratchetFinding(result).message).toMatch(/renamed/i)
  })
})

// ── A rule name is only "new" because the config declares it (#432 round 3) ─────────────────────
//
// Round 2 derived "a new rule is being armed here" from the base *baseline rows*. A rule already
// armed in `.dependency-cruiser.cjs` with zero recorded rows satisfies that for free, and
// `engine-no-ui-packages` is exactly that on this repo. Measured 2026-09-24 in a worktree: a real
// `zustand` import under `src/core/` fails `pnpm run lint:layers` (`1 new`), the documented
// `depcruise … --baseline` write absorbs it (72 rows → 73), `lint` is green again, and feeding both
// real baselines to `evaluate()` read `PASS ratchet=armed`, "arming `engine-no-ui-packages` (1
// row)" — with no config edit anywhere, so nothing reviewable and no declaration. A rule name
// present in no config at all passed the same way, and the same case plus one repaired violation
// read `WARN ratchet=swapped`, telling the reader to go and read a config diff that did not exist.
//
// The channel widens exactly as the ratchet succeeds: `engine-no-ui` is down to one row,
// `state-no-3d` and `src-no-e2e` to two. So `armed` and `swapped` now require the rule name to be
// declared in the head config and absent from the base one — and the config to be in the PR's own
// changed files, which is the only part of this a reviewer can see.

describe('a rule name is only new because the config declares it (#432 round 3)', () => {
  const uiPackages = violation('engine-no-ui-packages', 'src/core/ratchetProbeUiPkg.ts', 'node_modules/zustand/index.js')
  const engine = violation('engine-no-state', 'src/core/a.ts', 'src/store/b.ts')
  const armed = violation('core-through-index', 'src/components/x.tsx', 'src/core/chips/y.ts')
  const renamed = violation('engine-no-state-v2', 'src/core/a.ts', 'src/store/b.ts')
  const ratchetFinding = (result) => result.findings.find((finding) => finding.rule === 'ratchet')
  const untouched = (ratchet) => pr({ ratchet, body: 'Fixes #406' })
  const edited = (ratchet) => pr({ ratchet, body: 'Fixes #406', files: [file('src/core/thing.ts', 10, 2), configEdit()] })

  it('pins the premise: the real config declares a rule the real baseline has no row for', () => {
    const recorded = new Set(realRows().map((row) => row.rule.name))
    const declared = [...REAL_CONFIG.matchAll(/name:\s*'([^']+)'/g)].map((match) => match[1])
    expect([...recorded].every((name) => declared.includes(name))).toBe(true)
    expect(declared.filter((name) => !recorded.has(name))).toContain('engine-no-ui-packages')
  })

  it('fails the measured attack — a row absorbed under a zero-row rule, config untouched', () => {
    const head = JSON.stringify([...realRows(), uiPackages], null, 2)
    const result = evaluate(untouched({ base: REAL_BASELINE, head }))
    expect(result.ratchet).toBe('absorbed')
    expect(result.verdict).toBe('FAIL')
    expect(ratchetFinding(result).message).toContain(
      'engine-no-ui-packages: src/core/ratchetProbeUiPkg.ts → node_modules/zustand/index.js',
    )
  })

  it('fails that attack when the PR also repairs a real violation, instead of warning `swapped`', () => {
    const rows = shrunkRows() // #460 RED DEMO
    const repaired = rows.findIndex((row) => row.rule.name === 'engine-no-state')
    const head = JSON.stringify([...rows.filter((_, index) => index !== repaired), uiPackages], null, 2)
    const result = evaluate(untouched({ base: SHRUNK_BASELINE, head })) // #460 RED DEMO
    expect(result.ratchet).toBe('absorbed')
    expect(result.verdict).toBe('FAIL')
  })

  it('fails a rule name declared in neither config, even when the config is edited', () => {
    const head = JSON.stringify([...realRows(), violation('totally-made-up', 'src/core/x.ts', 'src/store/y.ts')], null, 2)
    const result = evaluate(
      edited({ base: REAL_BASELINE, head, baseConfig: REAL_CONFIG, headConfig: `${REAL_CONFIG}\n// a cosmetic edit\n` }),
    )
    expect(result.ratchet).toBe('absorbed')
    expect(result.verdict).toBe('FAIL')
  })

  it('fails a rename whose config edit is not in the PR — `swapped` is unreachable without one', () => {
    const result = evaluate(untouched({ base: baselineOf(engine), head: baselineOf(renamed) }))
    expect(result.ratchet).toBe('absorbed')
    expect(result.verdict).toBe('FAIL')
  })

  it('says where the declaration is when it passes an arming, so the claim is checkable', () => {
    const result = evaluate(
      edited({
        base: baselineOf(engine),
        head: baselineOf(engine, armed),
        baseConfig: configOf('engine-no-state'),
        headConfig: configOf('engine-no-state', 'core-through-index'),
      }),
    )
    expect(result.verdict).toBe('PASS')
    expect(ratchetFinding(result).message).toContain(RATCHET_CONFIG_FILE)
  })

  it('only sends a `swapped` reader to a config diff the PR actually has', () => {
    const input = edited({
      base: baselineOf(engine),
      head: baselineOf(renamed),
      baseConfig: configOf('engine-no-state'),
      headConfig: configOf('engine-no-state-v2'),
    })
    const result = evaluate(input)
    expect(result.ratchet).toBe('swapped')
    expect(ratchetFinding(result).message).toContain(RATCHET_CONFIG_FILE)
    expect(input.files.map((f) => f.filename)).toContain(RATCHET_CONFIG_FILE)
  })
})

describe('the Baseline-growth declaration has to name its rows (#432)', () => {
  const engine = violation('engine-no-state', 'src/core/a.ts', 'src/store/b.ts')
  const other = violation('engine-no-state', 'src/core/c.ts', 'src/store/b.ts')
  const third = violation('engine-no-state', 'src/core/d.ts', 'src/store/b.ts')
  const absorbing = { base: baselineOf(engine), head: baselineOf(engine, other) }
  const named = 'engine-no-state: src/core/c.ts → src/store/b.ts'
  const ratchetFinding = (result) => result.findings.find((finding) => finding.rule === 'ratchet')

  it('refuses a declaration that names nothing', () => {
    expect(evaluate(pr({ ratchet: absorbing, body: 'Fixes #150\n\nBaseline-growth: .' })).verdict).toBe('FAIL')
  })

  it('accepts one that names the absorbed row', () => {
    const result = evaluate(pr({ ratchet: absorbing, body: `Fixes #150\n\nBaseline-growth: ${named} — moved into src/core` }))
    expect(result.verdict).toBe('WARN')
    expect(ratchetFinding(result).message).toContain('moved into src/core')
  })

  it('takes -> for the arrow, so a hand-typed row still counts', () => {
    const body = 'Fixes #150\n\nBaseline-growth: engine-no-state: src/core/c.ts -> src/store/b.ts — why'
    expect(evaluate(pr({ ratchet: absorbing, body })).verdict).toBe('WARN')
  })

  it('ignores a declaration inside a fenced code block', () => {
    const body = ['Fixes #150', '', '```', `Baseline-growth: ${named} — an example, not a claim`, '```'].join('\n')
    expect(evaluate(pr({ ratchet: absorbing, body })).verdict).toBe('FAIL')
  })

  it('fails when the declaration covers only some of the absorbed rows', () => {
    const result = evaluate(
      pr({
        ratchet: { base: baselineOf(engine), head: baselineOf(engine, other, third) },
        body: `Fixes #150\n\nBaseline-growth: ${named} — one of the two`,
      }),
    )
    expect(result.verdict).toBe('FAIL')
    expect(ratchetFinding(result).message).toContain('src/core/d.ts → src/store/b.ts')
  })
})

describe('stripFencedCode', () => {
  it('drops ``` and ~~~ blocks and keeps the prose around them', () => {
    const body = ['before', '```js', 'Baseline-growth: x', '```', 'after', '~~~', 'Baseline-growth: y', '~~~', 'end'].join('\n')
    const stripped = stripFencedCode(body)
    expect(stripped).toContain('before')
    expect(stripped).toContain('after')
    expect(stripped).toContain('end')
    expect(stripped).not.toContain('Baseline-growth')
  })

  it('drops the rest of the body after an unclosed fence', () => {
    expect(stripFencedCode('prose\n```\nBaseline-growth: x')).not.toContain('Baseline-growth')
  })
})

describe('readAtRef (#432)', () => {
  // The contents API answers 404 both for an absent path and for a ref it cannot resolve. Reading
  // the second as the first is the one fail-open direction: an unresolvable base would make the
  // whole head baseline look like a legitimate arming.
  const io = (present, refs) => ({
    readPath: async (ref, filePath) => present[`${ref}:${filePath}`] ?? null,
    refExists: async (ref) => refs.includes(ref),
  })

  it('returns the bytes when the path is there', async () => {
    await expect(readAtRef(io({ 'abc:f.json': '[]' }, ['abc']), 'abc', 'f.json')).resolves.toBe('[]')
  })

  it('reads a 404 as an absent path once the ref resolves', async () => {
    await expect(readAtRef(io({}, ['abc']), 'abc', 'f.json')).resolves.toBeNull()
  })

  it('throws rather than reading an unresolvable ref as an empty baseline', async () => {
    await expect(readAtRef(io({}, []), 'deadbeef', 'f.json')).rejects.toThrow(/deadbeef/)
  })
})

describe('the rule that pays for `linguist-generated` (#432)', () => {
  it('stays wired into RULES, so the exclusion cannot outlive the control', () => {
    // `.gitattributes` keeps the baseline out of review; the ratchet rule is what buys that. The
    // two live in different files, so dropping the rule would silently restore the free pass.
    // Asserted on behaviour, not on the rule function's name: renaming it is not the regression.
    const engine = violation('engine-no-state', 'src/core/a.ts', 'src/store/b.ts')
    const other = violation('engine-no-state', 'src/core/c.ts', 'src/store/b.ts')
    const result = evaluate(pr({ ratchet: { base: baselineOf(engine), head: baselineOf(engine, other) } }), RULES)
    expect(result.findings.some((finding) => finding.rule === 'ratchet' && finding.level === 'fail')).toBe(true)
    const attributes = readFileSync(path.join(import.meta.dirname, '..', '.gitattributes'), 'utf8')
    expect(attributes).toContain(`${RATCHET_BASELINE_FILE} linguist-generated`)
  })
})

// ── The scan has to have read something before it decides (#438) ────────────────────────────────
//
// `parseRuleNames` reads rule names as text and sees only a literal `name: '…'`. #432's round-3
// verifier measured the gap, and it reproduces here: a base config written any other way — a
// helper, a list mapped into rules, a shorthand `{ name }` — scans to no names at all, so every
// name in the head reads as newly declared, and one row absorbed under a long-armed rule read
// `PASS ratchet=armed`. A config with text that scans to nothing is one the scan cannot read, not
// one with no rules, so the ratchet refuses it. Counts here come from the files, never pinned (#450).

describe('a config the rule-name scan cannot read fails closed (#438)', () => {
  const ratchetFinding = (result) => result.findings.find((finding) => finding.rule === 'ratchet')
  const edited = (ratchet, body = 'Fixes #438') =>
    pr({ ratchet, body, files: [file('src/core/ratchetProbe.ts', 3, 0), configEdit()] })
  const realNames = () => [...new Set([...REAL_CONFIG.matchAll(/name:\s*'([^']+)'/g)].map((match) => match[1]))]
  /** The real rules, built by a helper: every name is still a string, none is a literal `name:`. */
  const programmatic = () =>
    `const rule = (name) => ({ name, severity: 'error' })\nmodule.exports = { forbidden: ${JSON.stringify(realNames())}.map(rule) }\n`
  const absorbedRow = violation('engine-no-state', 'src/core/ratchetProbe.ts', 'src/store/circuitStore.ts')
  const absorbing = () => JSON.stringify([...realRows(), absorbedRow], null, 2)

  it('pins the premise: the helper-built config declares the real rules and scans to none', () => {
    expect(realNames()).toContain('engine-no-state')
    expect(programmatic()).not.toMatch(/name\s*:/)
  })

  it('fails the measured case — an unreadable base config plus one absorbed row read `PASS armed`', () => {
    const result = evaluate(edited({ base: REAL_BASELINE, head: absorbing(), baseConfig: programmatic(), headConfig: REAL_CONFIG }))
    expect(result.ratchet).toBe('unreadable')
    expect(result.verdict).toBe('FAIL')
    const { message } = ratchetFinding(result)
    expect(message).toContain(`merge base's \`${RATCHET_CONFIG_FILE}\``)
    expect(message).toMatch(/no rule names/)
    expect(message).toMatch(/fails closed/)
  })

  it('fails it when the head only adds one comment naming the rule', () => {
    const headConfig = `${programmatic()}// the ratchet is armed by name: 'engine-no-state'\n`
    const result = evaluate(edited({ base: REAL_BASELINE, head: absorbing(), baseConfig: programmatic(), headConfig }))
    expect(result.ratchet).toBe('unreadable')
    expect(result.verdict).toBe('FAIL')
  })

  it("fails a head config the scan cannot read too — merged, it is every later PR's base", () => {
    // An unread head declares nothing, so this could never read `armed`; it read `absorbed`, which
    // tells the author to declare a rule they may well have declared, and which a Baseline-growth
    // line turns into a warn — landing a config that makes the next PR's absorbed rows read armed.
    const body = 'Fixes #438\n\nBaseline-growth: engine-no-state: src/core/ratchetProbe.ts → src/store/circuitStore.ts — why'
    const result = evaluate(
      edited({ base: REAL_BASELINE, head: absorbing(), baseConfig: REAL_CONFIG, headConfig: programmatic() }, body),
    )
    expect(result.ratchet).toBe('unreadable')
    expect(result.verdict).toBe('FAIL')
    expect(ratchetFinding(result).message).toContain(`this PR's \`${RATCHET_CONFIG_FILE}\``)
  })

  it('still arms a rule in a config this PR creates — absent at the base is not unreadable', () => {
    const armed = violation('core-through-index', 'src/components/x.tsx', 'src/core/chips/y.ts')
    const verdict = compareRatchetBaseline({
      base: null,
      head: baselineOf(armed),
      baseConfig: null,
      headConfig: configOf('core-through-index'),
      configTouched: true,
    })
    expect(verdict.status).toBe('armed')
  })

  it('still reads a shrink as a shrink — with no row arriving, the scan decides nothing', () => {
    const verdict = compareRatchetBaseline({
      base: REAL_BASELINE,
      head: JSON.stringify(realRows().slice(1)),
      baseConfig: programmatic(),
      headConfig: programmatic(),
      configTouched: true,
    })
    expect(verdict.status).toBe('shrank')
  })

  it('still reads #404 as arming core-through-index when the real config is on both sides', () => {
    const base = realRows().filter((row) => row.rule.name !== 'core-through-index')
    const result = evaluate(
      edited({
        base: JSON.stringify(base),
        head: REAL_BASELINE,
        baseConfig: REAL_CONFIG.replace("name: 'core-through-index'", "name: 'core-through-index-was-not-here'"),
        headConfig: REAL_CONFIG,
      }),
    )
    expect(result.ratchet).toBe('armed')
    expect(ratchetFinding(result).message).toContain(`declared in \`${RATCHET_CONFIG_FILE}\` by this PR`)
  })
})
