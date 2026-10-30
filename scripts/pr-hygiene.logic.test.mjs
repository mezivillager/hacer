import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  DEPENDENCY_LABEL,
  DOC_PATH_RATCHET,
  FAIL_LINES,
  FIXUP_MAX_LINES,
  FIXUP_MAX_LINES_PER_FILE,
  FIXUP_MAX_SHARE,
  LINEAGE_RATCHET,
  OVERRIDE_LABEL,
  RATCHETS,
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
  SUPPRESSION_RATCHET,
  compareRatchetBaseline,
  nextPageUrl,
  parseGeneratedPatterns,
  parseRatchetBaseline,
  ratchetReads,
  readAtRef,
  stripFencedCode,
  testWitnessLoss,
} from './pr-hygiene.logic.mjs'
import { UNLINKED_BASELINE_FILE } from './lineage.logic.mjs'

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
    ['docs/research/2026-09-18-agent-readiness/evidence/measure.mjs', 'evidence'],
    ['docs/research/2026-09-18-agent-readiness/Evidence/transcript.md', 'evidence'],
    ['docs/research/2026-09-18-agent-readiness/EVIDENCE/run.sh', 'evidence'],
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

  it('names the largest contributor when the total cap refuses (#345)', () => {
    const fixups = [file('src/i1.ts', 4, 0), file('src/index.ts', 5, 0), ...[2, 3, 4].map((i) => file(`src/i${i}.ts`, 4, 0))]
    const over = deletionOnlyExemption(reviewable(file('src/legacy.ts', 0, 9000), ...fixups))
    expect(over.exempt).toBe(false)
    expect(over.reason).toContain(String(FIXUP_MAX_LINES))
    expect(over.reason).toContain('`src/index.ts`')
    expect(over.reason).not.toContain('src/i1.ts')
  })

  it('names the largest contributor when the share cap refuses (#345)', () => {
    const fixups = [file('src/i1.ts', 4, 0), file('src/index.ts', 5, 0), file('src/i2.ts', 4, 0), file('src/i3.ts', 3, 0)]
    const over = deletionOnlyExemption(reviewable(file('src/legacy.ts', 0, 300), ...fixups))
    expect(over.exempt).toBe(false)
    expect(over.reason).toContain('300')
    expect(over.reason).toContain('`src/index.ts`')
    expect(over.reason).not.toContain('src/i1.ts')
  })

  it('never waives a PR because a raw file entry is missing `additions` or `deletions` (#345)', () => {
    // Raw API entries, not measure()'s: a missing count read as NaN failed every cap and passed as exempt.
    // A count the rule does not have cannot show a PR is not deletion-shaped either, so none of these is null.
    const fixup = (i, counts) => ({ filename: `src/i${i}.ts`, ...counts })
    const noAdditions = [{ filename: 'src/legacy.ts', deletions: 9000 }, ...[0, 1, 2, 3, 4].map((i) => fixup(i, { additions: 5, deletions: 0 }))]
    const noDeletions = [{ filename: 'src/legacy.ts', additions: 0, deletions: 300 }, ...[0, 1, 2, 3].map((i) => fixup(i, { additions: 4 }))]
    const addOnly = [0, 1, 2, 3].map((i) => fixup(i, { additions: 5 }))
    expect(deletionOnlyExemption({ files: noAdditions })).toMatchObject({ exempt: false })
    expect(deletionOnlyExemption({ files: noDeletions })).toMatchObject({ exempt: false })
    expect(deletionOnlyExemption({ files: addOnly })).toMatchObject({ exempt: false })
  })

  it.each([
    ['`additions` missing', { deletions: 900 }],
    ['`deletions` missing', { additions: 0 }],
    ['`additions` NaN', { additions: NaN, deletions: 900 }],
    ['`deletions` NaN', { additions: 0, deletions: NaN }],
  ])('refuses a lone file with %s, naming it (#345)', (_, counts) => {
    // No other file trips a cap here: the refusal has to come from the count itself.
    const result = deletionOnlyExemption({ files: [{ filename: 'src/a.ts', ...counts }] })
    expect(result).toMatchObject({ exempt: false })
    expect(result.reason).toContain('`src/a.ts`')
    expect(result.reason).toMatch(/missing or not finite/)
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

  it('links nothing when the number runs on into a word', () => {
    expect(findLinkedIssues('fixes #12abc')).toEqual([])
    expect(findLinkedIssues('Closes mezivillager/hacer#12abc')).toEqual([])
    expect(findLinkedIssues('Resolves https://github.com/mezivillager/hacer/issues/12abc')).toEqual([])
    expect(evaluate(pr({ body: 'fixes #12abc' })).verdict).toBe('FAIL')
  })

  it.each(['fixes #12.', 'fixes #12,', '(fixes #12)', 'fixes #12', 'fixes #12\n'])('still links "%s"', (body) => {
    expect(findLinkedIssues(body)).toEqual([12])
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

  it.each([
    ['a test', 'src/a.test.ts'],
    ['an e2e spec', 'e2e/store/a.spec.ts'],
    ['the lockfile', 'pnpm-lock.yaml'],
  ])('does not exempt docs beside %s', (_, other) => {
    const result = evaluate(pr({ body: 'Typo.', files: [file('docs/x.md', 3, 1), file(other, 5, 0)] }))
    expect(result.verdict).toBe('FAIL')
    expect(result.docsOnly).toBe(false)
    expect(levelsOf(result, 'linked-issue')).toEqual(['fail'])
  })

  it('still exempts docs beside research evidence and the changelog, which are documentation too', () => {
    const files = [file('docs/research/r/REPORT.md', 3, 1), file('docs/research/r/evidence/probe.py', 9, 0), file('CHANGELOG.md', 2, 0)]
    expect(evaluate(pr({ body: 'Typo.', files })).docsOnly).toBe(true)
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

  const messageFor = (...names) =>
    evaluate(pr({ files: names.map((name) => file(name, 5, 0)) })).findings.find((f) => f.rule === 'protected-path').message

  it('names the oracle glob and its reason for a vector file', () => {
    const message = messageFor('conformance/vectors/01/Xor.tst')
    expect(message).toContain('conformance/vectors/**')
    expect(message).toContain('held-out oracle (#193)')
    expect(message).not.toContain('characterization golden')
  })

  it('names the characterization glob and its reason for a golden', () => {
    const message = messageFor('src/store/__snapshots__/characterization/actions.json')
    expect(message).toContain('**/__snapshots__/characterization/**')
    expect(message).toContain('characterization golden: records legacy behaviour deleted after capture (#331)')
    expect(message).not.toContain('held-out oracle')
  })

  it('groups files from both globs under their own reason', () => {
    const message = messageFor('conformance/vectors/01/Xor.tst', 'src/store/__snapshots__/characterization/actions.json')
    expect(message).toMatch(/conformance\/vectors\/\*\*[^;]*held-out oracle \(#193\)[^;]*conformance\/vectors\/01\/Xor\.tst/)
    expect(message).toMatch(/characterization golden[^;]*actions\.json/)
    expect(message.indexOf('Xor.tst')).toBeLessThan(message.indexOf('characterization golden'))
  })

  it('stays quiet when the oracle is left alone', () => {
    const result = evaluate(pr())
    expect(levelsOf(result, 'protected-path')).toEqual([])
  })
})

describe('a rename out of a protected path (#941)', () => {
  it('protected path: a file renamed out of a protected path is named by its previous path', () => {
    const renamed = { ...file('tmp/Xor.cmp', 0, 0, 'renamed'), previous_filename: 'conformance/vectors/01/Xor.cmp' }
    const result = evaluate(pr({ files: [renamed] }))
    const found = result.findings.filter((f) => f.rule === 'protected-path')
    expect(found.map((f) => f.level)).toEqual(['warn'])
    expect(found[0].message).toContain('conformance/vectors/**')
    expect(found[0].message).toContain('conformance/vectors/01/Xor.cmp')
    expect(result.verdict).toBe('WARN')
  })
})

/** A pulls-API file entry whose patch is one hunk of the given diff lines. */
function patched(filename, lines, status = 'modified', extra = {}) {
  return {
    filename,
    status,
    additions: lines.filter((line) => line.startsWith('+')).length,
    deletions: lines.filter((line) => line.startsWith('-')).length,
    patch: ['@@ -1,9 +1,9 @@', ...lines].join('\n'),
    ...extra,
  }
}

// Merged PRs as `gh api repos/{owner}/{repo}/pulls/<n>/files` returned them, with their titles,
// trimmed to the fields the weakened-test flag and the refactor rule read.
const realFileList = (number) =>
  JSON.parse(readFileSync(path.join(import.meta.dirname, 'fixtures', 'pr-hygiene', `pr-${number}-files.json`), 'utf8'))
const realFiles = (number) => realFileList(number).files

describe('the weakened-test flag (#941)', () => {
  const flagged = (result) => result.findings.filter((f) => f.rule === 'weakened-tests')

  it('weakened tests: a modified or renamed test file whose patch removes more expect( than it adds is named, with the count', () => {
    const files = [
      patched('src/a.test.ts', ['-  expect(a).toBe(1); expect(b).toBe(2)', '+  expect(a).toBe(1)', '   expect(c).toBe(3)']),
      patched('src/moved.test.ts', ['-  expect(d).toBe(4)'], 'renamed', { previous_filename: 'src/old.test.ts' }),
      patched('src/rewritten.test.ts', ['-  expect(e).toBe(true)', '+  expect(e).toBe(false)']),
      patched('src/grown.test.ts', ['+  expect(f).toBe(1)']),
      patched('src/a.ts', ['-  // expect(a) is checked by the caller']),
    ]
    expect(testWitnessLoss(files).weakened).toEqual([
      { filename: 'src/a.test.ts', removed: 2, added: 1 },
      { filename: 'src/moved.test.ts', removed: 1, added: 0 },
    ])
    const result = evaluate(pr({ files }))
    expect(flagged(result).map((f) => f.level)).toEqual(['warn'])
    expect(result.verdict).toBe('WARN')
    const { message } = flagged(result)[0]
    expect(message).toContain('`src/a.test.ts` loses 1 `expect(` call (2 removed, 1 added)')
    expect(message).toContain('`src/moved.test.ts` loses 1 `expect(` call (1 removed, 0 added)')
    expect(message).not.toContain('rewritten')
    expect(message).not.toContain('grown')
    expect(message).not.toContain('`src/a.ts`')
  })

  it('weakened tests: a removed test file is named unless a non-test file in its directory, with the same name before the first dot, is removed or renamed in the same PR', () => {
    const removed = (filename) => patched(filename, ['-  expect(x).toBe(1)'], 'removed')
    const files = [
      removed('src/nodes/Foo.scene.test.tsx'),
      removed('src/nodes/Foo.tsx'),
      removed('src/lib/bar.test.ts'),
      { ...file('src/core/barMoved.ts', 1, 1, 'renamed'), previous_filename: 'src/lib/bar.ts' },
      removed('src/lib/baz.test.ts'),
      removed('src/other/baz.ts'),
      removed('src/lib/qux.test.ts'),
      removed('src/lib/quxHelpers.ts'),
      removed('src/lib/zed.test.ts'),
      { ...file('src/lib/zed.ts', 0, 0, 'renamed'), previous_filename: 'src/old/zed.ts' },
      removed('src/lib/kept.test.ts'),
      removed('src/lib/kept.spec.ts'),
    ]
    const named = ['src/lib/baz.test.ts', 'src/lib/qux.test.ts', 'src/lib/zed.test.ts', 'src/lib/kept.test.ts', 'src/lib/kept.spec.ts']
    const loss = testWitnessLoss(files)
    expect(loss.removedTests).toEqual(named)
    expect(loss.weakened).toEqual([])
    const found = flagged(evaluate(pr({ files })))
    expect(found.map((f) => f.level)).toEqual(['warn'])
    for (const name of named) expect(found[0].message).toContain(`\`${name}\``)
    expect(found[0].message).not.toContain('Foo.scene.test.tsx')
    expect(found[0].message).not.toContain('bar.test.ts')
  })

  it('weakened tests: an added .skip(, .only( or passWithNoTests is named, in any file, when the patch adds more than it removes', () => {
    const files = [
      patched('src/a.test.ts', ["+  it.skip('runs', () => {})"]),
      patched('src/b.test.ts', ["-  it.only('was', () => {})", "+  it.only('is', () => {})"]),
      patched('src/c.test.ts', ["-  describe.skip('x', () => {", "+  describe.only('x', () => {"]),
      patched('vite.config.ts', ['+    passWithNoTests: true,']),
      patched('src/d.test.ts', ["-  it.skip('gone', () => {})"]),
    ]
    expect(testWitnessLoss(files).disabled).toEqual([
      { filename: 'src/a.test.ts', marker: '.skip(', removed: 0, added: 1 },
      { filename: 'src/c.test.ts', marker: '.only(', removed: 0, added: 1 },
      { filename: 'vite.config.ts', marker: 'passWithNoTests', removed: 0, added: 1 },
    ])
    const found = flagged(evaluate(pr({ files })))
    expect(found.map((f) => f.level)).toEqual(['warn'])
    expect(found[0].message).toContain('`src/a.test.ts` adds `.skip(`')
    expect(found[0].message).toContain('`src/c.test.ts` adds `.only(`')
    expect(found[0].message).toContain('`vite.config.ts` adds `passWithNoTests`')
    expect(found[0].message).not.toContain('src/b.test.ts')
    expect(found[0].message).not.toContain('src/d.test.ts')
  })

  it('weakened tests: a test file the API sent without a patch is named as not shown, to check by hand', () => {
    const files = [
      file('src/big.test.ts', 900, 40),
      { ...file('src/moved.test.ts', 0, 0, 'renamed'), previous_filename: 'src/old.test.ts' },
      file('src/added.test.ts', 3000, 0, 'added'),
      file('src/big.ts', 10, 4),
      patched('src/small.test.ts', ['+  expect(x).toBe(1)']),
    ]
    expect(testWitnessLoss(files).unshown).toEqual(['src/big.test.ts'])
    const found = flagged(evaluate(pr({ files })))
    expect(found.map((f) => f.level)).toEqual(['warn'])
    expect(found[0].message).toContain('`src/big.test.ts`')
    expect(found[0].message).toMatch(/not shown.*by hand/)
    expect(found[0].message).not.toContain('added.test.ts')
    expect(found[0].message).not.toContain('`src/big.ts`')
  })

  it("weakened tests: #735's real file list names testActions.test.ts (1 expect) and nothing else; #721's names nothing", () => {
    const pr735 = testWitnessLoss(realFiles(735))
    expect(pr735.weakened).toEqual([{ filename: 'src/store/actions/testActions/testActions.test.ts', removed: 1, added: 0 }])
    expect([pr735.removedTests, pr735.unshown, pr735.disabled]).toEqual([[], [], []])
    const found = flagged(evaluate(pr({ files: realFiles(735) })))
    expect(found).toHaveLength(1)
    expect(found[0].message).toBe(
      'tests lose assertions: `src/store/actions/testActions/testActions.test.ts` loses 1 `expect(` call (1 removed, 0 added)',
    )

    const pr721 = testWitnessLoss(realFiles(721))
    expect([pr721.weakened, pr721.removedTests, pr721.unshown, pr721.disabled]).toEqual([[], [], [], []])
    expect(flagged(evaluate(pr({ files: realFiles(721) })))).toEqual([])
  })

  it("lists each shown test file's expect( lines, trimmed, so a line removed in one and added in another reads as a move", () => {
    const { witnesses } = testWitnessLoss(realFiles(735))
    expect(witnesses.map((w) => w.filename)).toEqual([
      'src/core/testing/chipCompletion.test.ts',
      'src/lib/chipCompletionStorage.test.ts',
      'src/store/actions/testActions/testActions.test.ts',
    ])
    const [, storage, actions] = witnesses
    expect(actions.removed).toEqual(["expect(JSON.parse(localStorage.getItem('hacer-completed-chips') ?? '[]')).toContain('Not')"])
    expect(actions.added).toEqual([])
    expect(storage.added).toContain(actions.removed[0])
  })
})

describe('the refactor rule (#942)', () => {
  const found = (result) => result.findings.filter((f) => f.rule === 'refactor-tests')
  const levels = (result) => found(result).map((f) => f.level)
  const failures = (result) => found(result).filter((f) => f.level === 'fail').map((f) => f.message)
  const warnings = (result) => found(result).filter((f) => f.level === 'warn').map((f) => f.message)
  const refactor = (files) => evaluate(pr({ title: 'refactor(core): move the engine path', files }))
  const HOW_TO_PROCEED = 'Land the test change first, in its own PR, or retitle the PR if it is not a refactor'

  it('refactor rule: a PR titled refactor(…) or refactor!: fails when an existing test file loses net expect( calls, or is removed while its subject stays', () => {
    const files = [
      patched('src/a.test.ts', ['-  expect(a).toBe(1)', '-  expect(b).toBe(2)', '+  expect(a).toBe(1)']),
      patched('src/same.test.ts', ['-  expect(s).toBe(1)', '+    expect(s).toBe(1)']),
      patched('src/lib/gone.test.ts', ['-  expect(g).toBe(1)'], 'removed'),
      patched('src/nodes/Foo.scene.test.tsx', ['-  expect(f).toBe(1)'], 'removed'),
      patched('src/nodes/Foo.tsx', ['-export const Foo = 1'], 'removed'),
    ]
    for (const title of ['refactor(core): move the engine path', 'refactor!: drop the loader', 'refactor(nodes)!: one mesh', 'refactor: tidy']) {
      const result = evaluate(pr({ title, files }))
      expect(result.verdict).toBe('FAIL')
      expect(levels(result)).toContain('fail')
    }
    const failed = failures(refactor(files))
    const text = failed.join('\n')
    expect(text).toContain('`src/a.test.ts` loses 1 `expect(` call')
    expect(text).toContain('`src/lib/gone.test.ts`')
    expect(text).not.toContain('same.test.ts')
    expect(text).not.toContain('Foo.scene.test.tsx')
    for (const message of failed) expect(message).toContain(HOW_TO_PROCEED)
  })

  it('refactor rule: a removed expect( line that the PR adds verbatim (trimmed) to another test file is not lost', () => {
    const pr735 = realFileList(735)
    const result = evaluate(pr({ title: pr735.title, files: pr735.files }))
    expect(levels(result)).toEqual(['pass'])
    expect(found(result)[0].message).not.toContain('testActions.test.ts')

    const line = '-  expect(x).toBe(1)'
    expect(levels(refactor([patched('src/from.test.ts', [line]), patched('src/to.test.ts', ['+      expect(x).toBe(1)'])]))).toEqual(['pass'])
    expect(levels(refactor([patched('src/from.test.ts', [line]), patched('src/helper.ts', ['+  expect(x).toBe(1)'])]))).toContain('fail')
    const twice = refactor([patched('src/from.test.ts', [line, line]), patched('src/to.test.ts', ['+  expect(x).toBe(1)'])])
    expect(failures(twice).join('\n')).toContain('`src/from.test.ts` loses 1 `expect(` call')
  })

  it('refactor rule: an existing assertion line removed and not re-added verbatim in any test file of the PR is named in a warn, with its file and text, at any count', () => {
    const files = [
      patched('src/nand.test.ts', ['-  expect(nand(false, false)).toBe(true)', '+  expect(nand(false, false)).toBe(false)']),
      patched('src/grown.test.ts', ['-  expect(or(a)).toBe(1)', '+  expect(or(a, b)).toBe(1)', '+  expect(or(b, a)).toBe(1)']),
      patched('src/moved.test.ts', ['-  expect(m).toBe(1)', '-  expect(r).toBe(1)', '+    expect(r).toBe(1)']),
      patched('src/target.test.ts', ['+  expect(m).toBe(1)']),
    ]
    const result = refactor(files)
    expect(levels(result)).toEqual(['warn', 'warn'])
    expect(result.verdict).toBe('WARN')
    const [nand, grown] = warnings(result)
    expect(nand).toContain('`src/nand.test.ts`')
    expect(nand).toContain('`expect(nand(false, false)).toBe(true)`')
    expect(nand).not.toContain('toBe(false)')
    expect(nand).toMatch(/verifier/)
    expect(grown).toContain('`src/grown.test.ts`')
    expect(grown).toContain('`expect(or(a)).toBe(1)`')
    expect(warnings(result).join('\n')).not.toContain('moved.test.ts')
  })

  it('refactor rule: any other title type gets no finding from this rule', () => {
    const files = [patched('src/a.test.ts', ['-  expect(a).toBe(1)'])]
    for (const title of ['feat(core): add a chip', 'fix: a bug', 'chore(refactor): tidy', 'docs: refactor notes', 'refactoring: tidy', undefined]) {
      const result = evaluate(pr({ title, files }))
      expect(found(result)).toEqual([])
      expect(result.findings.filter((f) => f.rule === 'weakened-tests').map((f) => f.level)).toEqual(['warn'])
    }
  })

  it('refactor rule: the 10 real refactor PRs give no failure, and the changed-assertion warn names only #706, #710 and #721', () => {
    const numbers = [630, 698, 701, 706, 708, 710, 712, 720, 721, 735]
    const results = numbers.map((number) => {
      const { title, files } = realFileList(number)
      expect(title).toMatch(/^refactor\(/)
      return { number, result: evaluate(pr({ title, files })) }
    })
    expect(results.filter(({ result }) => failures(result).length > 0).map(({ number }) => number)).toEqual([])
    expect(results.filter(({ result }) => warnings(result).length > 0).map(({ number }) => number)).toEqual([706, 710, 721])
    const warned = (number) => warnings(results.find((r) => r.number === number).result).join('\n')
    expect(warned(706)).toContain('`src/nodes/NodeRenderer.scene.test.tsx`')
    expect(warned(710)).toContain('`src/nodes/BusComponentRenderer.scene.test.tsx`')
    expect(warned(721)).toContain('`scripts/layer-ratchet.logic.test.mjs`')
    expect(warned(721)).toContain('`src/nodes/BusComponent3D.scene.test.tsx`')
  })

  it('refactor rule: a test file the API sent without a patch fails closed in a refactor PR', () => {
    const result = refactor([file('src/big.test.ts', 900, 40)])
    expect(result.verdict).toBe('FAIL')
    expect(failures(result).join('\n')).toContain('`src/big.test.ts`')
    const unchanged = [
      file('src/added.test.ts', 3000, 0, 'added'),
      { ...file('src/moved.test.ts', 0, 0, 'renamed'), previous_filename: 'src/old.test.ts' },
    ]
    expect(levels(refactor(unchanged))).toEqual(['pass'])
  })

  it('refactor rule: a commented-out assertion does not offset the one it replaces', () => {
    const files = [
      patched('src/a.test.ts', [
        '-  expect(a).toBe(1)',
        '+  // expect(a).toBe(1)',
        '-  expect(b).toBe(2)',
        '+  /* expect(b).toBe(2) */',
        '-  expect(c).toBe(3)',
        '+   * expect(c).toBe(3)',
      ]),
      patched('src/b.test.ts', ['-  // expect(z) used to be checked here']),
    ]
    expect(testWitnessLoss(files).weakened).toEqual([{ filename: 'src/a.test.ts', removed: 3, added: 0 }])
    const result = refactor(files)
    expect(failures(result).join('\n')).toContain('`src/a.test.ts` loses 3 `expect(` calls')
    expect(found(result).map((f) => f.message).join('\n')).not.toContain('b.test.ts')
  })

  it('refactor rule: a test renamed out of test naming counts as a removed test', () => {
    const files = [{ ...file('src/a.disabled.ts', 0, 0, 'renamed'), previous_filename: 'src/a.test.ts' }]
    expect(testWitnessLoss(files).removedTests).toEqual(['src/a.test.ts'])
    const result = refactor(files)
    expect(result.verdict).toBe('FAIL')
    expect(failures(result).join('\n')).toContain('`src/a.test.ts`')
    expect(evaluate(pr({ files })).findings.filter((f) => f.rule === 'weakened-tests')[0].message).toContain('`src/a.test.ts`')
    const withSubject = [...files, { ...file('src/b.ts', 0, 0, 'renamed'), previous_filename: 'src/a.ts' }]
    expect(testWitnessLoss(withSubject).removedTests).toEqual([])
  })

  it('an expect( line inside an added block comment does not offset a removed assertion', () => {
    const files = [
      patched('src/a.test.ts', ['-  expect(a).toBe(1)', '+  /*', '+  expect(a).toBe(1)', '+  */']),
      patched('src/b.test.ts', ['-  /* c */ expect(b).toBe(2)']),
      patched('src/c.test.ts', ['-  expect(c).toBe(3)', '   /*', '+  expect(c).toBe(3)', '   */']),
      patched('src/dead.test.ts', ['-  /*', '-  expect(z).toBe(1)', '-  */']),
      patched('src/glob.test.ts', [
        "-  expect(match('src/**/*.ts')).toBe(true)",
        '-  expect(g).toBe(1)',
        "+  expect(match('src/**/*.ts')).toBe(true)",
        '+  expect(g).toBe(1)',
      ]),
    ]
    expect(testWitnessLoss(files).weakened).toEqual([
      { filename: 'src/a.test.ts', removed: 1, added: 0 },
      { filename: 'src/b.test.ts', removed: 1, added: 0 },
      { filename: 'src/c.test.ts', removed: 1, added: 0 },
    ])
    const result = refactor(files)
    const failed = failures(result).join('\n')
    for (const name of ['a', 'b', 'c']) expect(failed).toContain(`\`src/${name}.test.ts\` loses 1 \`expect(\` call`)
    expect(found(result).map((f) => f.message).join('\n')).not.toMatch(/dead\.test\.ts|glob\.test\.ts/)
  })

  it('an added assertion that answers a move in another file does not also offset a removal in its own file', () => {
    const files = [
      patched('src/a.test.ts', ['-  expect(w).toBe(1)', '+  expect(x).toBe(1)']),
      patched('src/b.test.ts', ['-  expect(x).toBe(1)']),
    ]
    const result = refactor(files)
    expect(result.verdict).toBe('FAIL')
    const failed = failures(result).join('\n')
    expect(failed).toContain('`src/a.test.ts` loses 1 `expect(` call')
    expect(failed).not.toContain('b.test.ts')
    expect(warnings(result).join('\n')).toContain('`expect(w).toBe(1)`')

    const both = [
      patched('src/a.test.ts', ['-  expect(w).toBe(1)', '+  expect(x).toBe(1)', '+  expect(w, v).toBe(1)']),
      patched('src/b.test.ts', ['-  expect(x).toBe(1)']),
    ]
    expect(levels(refactor(both))).toEqual(['warn'])
  })

  it('an unchanged assertion wrapped in an added block comment counts as a lost witness', () => {
    const files = [
      patched('src/a.test.ts', ['+  /*', '   expect(a).toBe(1)', '+  */']),
      patched('src/b.test.ts', ['-  /*', '   expect(b).toBe(2)', '-  */', '-  expect(b).toBe(2)']),
      patched('src/c.test.ts', ['   /*', '   expect(c).toBe(3)', '   */', '   expect(d).toBe(4)', '+  expect(e).toBe(5)']),
    ]
    const loss = testWitnessLoss(files)
    expect(loss.weakened).toEqual([{ filename: 'src/a.test.ts', removed: 1, added: 0 }])
    expect(loss.witnesses.map(({ removed, added }) => ({ removed, added }))).toEqual([
      { removed: ['expect(a).toBe(1)'], added: [] },
      { removed: ['expect(b).toBe(2)'], added: ['expect(b).toBe(2)'] },
      { removed: [], added: ['expect(e).toBe(5)'] },
    ])
    const result = refactor(files)
    expect(result.verdict).toBe('FAIL')
    expect(failures(result).join('\n')).toContain('`src/a.test.ts` loses 1 `expect(` call (1 removed, 0 added, 0 moved')
    expect(warnings(result)).toHaveLength(1)
    expect(warnings(result)[0]).toContain('`src/a.test.ts`: 1 assertion line removed')
    expect(warnings(result)[0]).toContain('`expect(a).toBe(1)`')
    expect(found(result).map((f) => f.message).join('\n')).not.toMatch(/[bc]\.test\.ts/)
  })

  it('a commented expect on a live line counts once', () => {
    const files = [
      patched('src/a.test.ts', ['-  expect(a).toBe(1)', '-  expect(b).toBe(2)', '+  expect(a).toBe(1) /* expect(b).toBe(2) */']),
      patched('src/b.test.ts', ['-  expect(c).toBe(3)', '-  expect(d).toBe(4)', '+  expect(c).toBe(3) // expect(d).toBe(4)']),
      patched('src/c.test.ts', ['-  expect(e).toBe(5) /* expect(f).toBe(6) */', '+  expect(e).toBe(5)']),
      patched('src/d.test.ts', ['-  expect(g).toBe(7); expect(h).toBe(8) // expect(i)', '+  expect(g).toBe(7)', '+  expect(h).toBe(8)']),
    ]
    expect(testWitnessLoss(files).weakened).toEqual([
      { filename: 'src/a.test.ts', removed: 2, added: 1 },
      { filename: 'src/b.test.ts', removed: 2, added: 1 },
    ])
    const failed = failures(refactor(files)).join('\n')
    expect(failed).toContain('`src/a.test.ts` loses 1 `expect(` call (2 removed, 1 added, 0 moved')
    expect(failed).toContain('`src/b.test.ts` loses 1 `expect(` call (2 removed, 1 added, 0 moved')
    expect(failed).not.toMatch(/[cd]\.test\.ts/)
  })

  it('an expect( inside a string literal is not a witness', () => {
    const files = [
      patched('src/a.test.ts', ['-  expect(a).toBe(1)', '+  const s = `expect(a).toBe(1)`']),
      patched('src/b.test.ts', ['-  expect(b).toBe(2)', "+  log('expect(b).toBe(2)', \"expect(b)\")"]),
      patched('src/c.test.ts', ["-  expect(c).toBe('expect(')", '+  expect(c).toBe(3)']),
      patched('src/d.test.ts', ["-  it('says \\'expect(d)\\'', () => expect(d).toBe(4))", "+  it('says \\'expect(d)\\'', () => expect(d).toBe(5))"]),
    ]
    const loss = testWitnessLoss(files)
    expect(loss.weakened).toEqual([
      { filename: 'src/a.test.ts', removed: 1, added: 0 },
      { filename: 'src/b.test.ts', removed: 1, added: 0 },
    ])
    expect(loss.witnesses.map((w) => w.added)).toEqual([[], [], ['expect(c).toBe(3)'], ["it('says \\'expect(d)\\'', () => expect(d).toBe(5))"]])
    const failed = failures(refactor(files)).join('\n')
    for (const name of ['a', 'b']) expect(failed).toContain(`\`src/${name}.test.ts\` loses 1 \`expect(\` call (1 removed, 0 added`)
    expect(failed).not.toMatch(/[cd]\.test\.ts/)
  })

  it('a quote inside a regex literal or JSX text does not open a string', () => {
    const files = [
      patched('src/a.test.tsx', ["-const re = /'/; expect(a).toBe('z')"]),
      patched('src/b.test.tsx', ["-  render(<p>don't</p>); expect(b).toBe(1); render(<p>won't</p>)"]),
      patched('src/c.test.ts', ["-  const re = /['\"]/; expect(c).toBe('z')"]),
      patched('src/d.test.ts', ['-  const re = /`/; expect(d).toBe(`z`)']),
    ]
    expect(testWitnessLoss(files).weakened).toEqual(
      ['a.test.tsx', 'b.test.tsx', 'c.test.ts', 'd.test.ts'].map((name) => ({ filename: `src/${name}`, removed: 1, added: 0 })),
    )
    const result = refactor(files)
    expect(result.verdict).toBe('FAIL')
    const failed = failures(result).join('\n')
    for (const name of ['a.test.tsx', 'b.test.tsx', 'c.test.ts', 'd.test.ts']) {
      expect(failed).toContain(`\`src/${name}\` loses 1 \`expect(\` call (1 removed, 0 added`)
    }
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


// ── A closing keyword on a partial fix (#485) ──────────────────────────────────────────────────
//
// GitHub closes an issue on merge for any closing keyword in the PR body, whatever the sentence
// around it says. Twice a PR that finished only part of an issue closed it: #396 on "Fixes #364
// (in part …)", and #443, whose "Part of #193" sat beside "so this does not close #193" — GitHub's
// `closingIssuesReferences` for #443 is [193], and #193's ClosedEvent names #443 as the closer. The
// fixtures are real bodies, verbatim, with what GitHub itself closed on merge:
//   gh pr view <n> --json number,body,closingIssuesReferences \
//     --jq '{number, closingIssuesReferences: [.closingIssuesReferences[].number], body}'

const realPr = (number) =>
  JSON.parse(readFileSync(path.join(import.meta.dirname, 'fixtures', 'pr-hygiene', `pr-${number}.json`), 'utf8'))

describe('a closing keyword on a partial fix (#485)', () => {
  const linkedFindings = (result) => result.findings.filter((f) => f.rule === 'linked-issue')
  const headOf = (result) => formatConsole(result).split('\n')[0]

  it('a body with "Fixes #n" and an in-part phrase ("in part", "partial", "partly", "remaining", "Part of #n" for the same n) is a FAIL naming the issue and the phrase', () => {
    const pr396 = evaluate(pr({ body: realPr(396).body }))
    expect(pr396.verdict).toBe('FAIL')
    expect(linkedFindings(pr396).map((f) => f.level)).toEqual(['fail'])
    expect(linkedFindings(pr396)[0].message).toContain('#364')
    expect(linkedFindings(pr396)[0].message).toContain('"in part"')

    const pr443 = evaluate(pr({ body: realPr(443).body }))
    expect(pr443.verdict).toBe('FAIL')
    expect(linkedFindings(pr443).map((f) => f.level)).toEqual(['fail'])
    expect(linkedFindings(pr443)[0].message).toContain('`close #193`')
    expect(linkedFindings(pr443)[0].message).toContain('"Part of #193"')

    for (const [body, phrase] of [
      ['Fixes #12 (in part).', 'in part'],
      ['Closes #12 — the partial fix; the rest is #13.', 'partial'],
      ['Partially resolves #12.', 'Partially'],
      ['Resolves #12, partly.', 'partly'],
      ['Fixes #12. Remaining work: #13.', 'Remaining'],
      ['Fixes #12\n\nPart of #12', 'Part of #12'],
      ['Part of mezivillager/hacer#12\n\nFixes https://github.com/mezivillager/hacer/issues/12', 'Part of mezivillager/hacer#12'],
    ]) {
      const result = evaluate(pr({ body }))
      expect(result.verdict, body).toBe('FAIL')
      expect(linkedFindings(result).map((f) => f.level), body).toEqual(['fail'])
      expect(linkedFindings(result)[0].message, body).toContain('#12')
      expect(linkedFindings(result)[0].message, body).toContain(`"${phrase}"`)
    }
  })

  it('a body with "Part of #n" alone passes the linked-issue rule and closes nothing', () => {
    // #245 said "Part of #241 · Part of #153" and no closing keyword; GitHub closed nothing on merge.
    expect(realPr(245).closingIssuesReferences).toEqual([])
    for (const body of [realPr(245).body, 'Part of #193']) {
      const result = evaluate(pr({ body }))
      expect(result.verdict).toBe('PASS')
      expect(linkedFindings(result).map((f) => f.level)).toEqual(['pass'])
      expect(result.closingIssues).toEqual([])
    }
  })

  it('the existing linked-issue cases are unchanged', () => {
    const linked = (overrides) => linkedFindings(evaluate(pr(overrides))).map(({ level, message }) => [level, message])
    for (const body of ['Fixes #150', 'closes #150', 'RESOLVES #150', 'Fixed #150', 'Part of #150', 'part of #150']) {
      expect(linked({ body }), body).toEqual([['pass', 'linked #150']])
    }
    for (const body of ['Fixes: #12', 'Closes mezivillager/hacer#12', 'Resolves https://github.com/mezivillager/hacer/issues/12']) {
      expect(linked({ body }), body).toEqual([['pass', 'linked #12']])
    }
    expect(linked({ body: 'Fixes #1, closes #2 and fixes #1 again' })).toEqual([['pass', 'linked #1, #2']])
    const unlinked = ['fail', 'no linked issue — add `Fixes #n` / `Closes #n` / `Resolves #n` / `Part of #n` to the PR body']
    for (const body of ['Just a change.', '', null, 'see #150 for context', 'prefixes #150']) {
      expect(linked({ body }), String(body)).toEqual([unlinked])
    }
    expect(linked({ body: 'Typo.', files: [file('docs/x.md', 3, 1)] })).toEqual([['pass', 'docs-only PR — no linked issue required']])
    expect(linked({ body: 'Bump x.', author: 'dependabot[bot]' })).toEqual([
      ['pass', 'linked-issue rule skipped — bot author `dependabot[bot]`'],
    ])
    expect(linked({ body: 'Bump x.', labels: [DEPENDENCY_LABEL] })).toEqual([['pass', 'linked-issue rule skipped — `dependencies` label']])
  })

  it('reads the in-part words on the closing keyword line only, and "Part of" only for the same issue', () => {
    // #434 says "Fixes #313" and, paragraphs later, "It's a partial fix" about a future case. Read
    // across the whole body, the words misfired on 8 of the 73 real bodies carrying a closing
    // keyword (measured 2026-09-25 over this repo's 241 PRs); read on the keyword line, on none.
    for (const body of [realPr(434).body, 'Fixes #12\n\nThe remaining tests are unchanged.', 'Fixes #480 · Part of #138']) {
      expect(evaluate(pr({ body })).verdict, body.slice(0, 40)).toBe('PASS')
    }
  })

  it('closes exactly what GitHub closed on each real body — a negated keyword included', () => {
    for (const number of [396, 443, 245, 434]) {
      expect(evaluate(pr({ body: realPr(number).body })).closingIssues, `#${number}`).toEqual(realPr(number).closingIssuesReferences)
    }
  })

  it('reads no keyword inside code, as GitHub does not — #375 quoted `Fixes #357` and closed only #367', () => {
    // GitHub lists an already-closed issue too (#387 lists #188, closed before #387 was opened), so
    // it is the code span, not #357 being closed, that kept it out. Fenced blocks follow by analogy.
    expect(realPr(375).closingIssuesReferences).toEqual([367])
    expect(evaluate(pr({ body: realPr(375).body })).closingIssues).toEqual([367])
    for (const body of [
      'Fixes #480\n\n`Fixes #12 (in part)` is the shape the check refuses.',
      'Fixes #12 — the rule lives in `partial.ts`.',
      'Fixes #12\n\n```\nPart of #12\n```',
    ]) {
      expect(evaluate(pr({ body })).verdict, body).toBe('PASS')
    }
  })

  it('leaves both exemptions as they are: a bot is still skipped, and docs-only waives the link, not an early close', () => {
    expect(linkedFindings(evaluate(pr({ body: 'Fixes #12 (in part).', author: 'dependabot[bot]' })))[0].level).toBe('pass')
    expect(evaluate(pr({ body: 'Typo.', files: [file('docs/x.md', 3, 1)] })).verdict).toBe('PASS')
    expect(evaluate(pr({ body: 'Fixes #12 (in part).', files: [file('docs/x.md', 3, 1)] })).verdict).toBe('FAIL')
  })

  it('the HYGIENE line carries linked=fixes or linked=part-of so Mission Control can count partial PRs', () => {
    expect(headOf(evaluate(pr()))).toMatch(/^HYGIENE: PASS .* issue=#150 linked=fixes$/)
    expect(headOf(evaluate(pr({ body: realPr(245).body })))).toMatch(/^HYGIENE: PASS .* issue=#241,#153 linked=part-of$/)
    expect(headOf(evaluate(pr({ body: realPr(443).body })))).toMatch(/^HYGIENE: FAIL .* issue=#193 linked=fixes$/)
    // Nothing linked, nothing to count: the field is absent, and the rest of the line is as it was.
    expect(headOf(evaluate(pr({ body: '' })))).toMatch(/^HYGIENE: FAIL reviewable=12 test=0 excluded=0 files=1 issue=none$/)
    expect(headOf(evaluate(pr({ body: null, author: 'dependabot[bot]' })))).toMatch(/ issue=skipped$/)
    expect(headOf(evaluate(pr({ body: 'Typo.', files: [file('docs/x.md', 3, 1)] })))).toMatch(/ issue=docs-only$/)
  })

  it('keeps the pull_request_target discipline: the body arrives through the API as data, and the PR is never checked out', () => {
    const read = (file) => readFileSync(path.join(import.meta.dirname, '..', file), 'utf8')
    const workflow = read('.github/workflows/pr-hygiene.yml')
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('#'))
      .join('\n')
    expect(workflow).toMatch(/^ {2}pull_request_target:/m)
    expect(workflow).toContain('uses: actions/checkout@')
    expect(workflow).not.toMatch(/^\s*ref:/m)
    expect(workflow).not.toMatch(/\b(?:pnpm|npm|yarn) (?:install|ci)\b/)
    expect(read('scripts/pr-hygiene.mjs')).toContain('body: pull.body,')
  })
})


// ── A keyword counts only where GitHub reads prose (#485, round 2) ────────────────────────────────
//
// The verifier measured two shapes where the rule and GitHub disagreed on real bodies outside this
// repo. A line that *starts* with a one-line code span (```…```) is not a fence: CommonMark forbids a
// backtick in a backtick fence's info string. A closing fence carries no info string, so ```diff
// inside a fence does not end it. And an HTML comment is not prose. The fixtures are real bodies,
// verbatim, with GitHub's own closingIssuesReferences:
//   gh pr view <n> --repo <owner>/<repo> --json number,body,closingIssuesReferences

const externalPr = (repo, number) =>
  JSON.parse(
    readFileSync(path.join(import.meta.dirname, 'fixtures', 'pr-hygiene', `${repo.replace('/', '-')}-${number}.json`), 'utf8'),
  )

describe('a keyword counts only where GitHub reads prose (#485, round 2)', () => {
  it('closes what GitHub closed on four real bodies from other repos', () => {
    for (const [repo, number] of [
      ['kubernetes/kubernetes', 139623], // a line starting with a one-line ```…``` span, then a keyword GitHub closed on
      ['vercel/next.js', 96350], // its only keyword sits inside a <!-- … --> template comment
      ['kubernetes/kubernetes', 137025], // its only keyword sits inside a genuine fence
      ['microsoft/vscode', 325145], // likewise, with a ```diff line inside that fence that does not end it
    ]) {
      const real = externalPr(repo, number)
      expect(real.repo).toBe(repo)
      expect(evaluate(pr({ body: real.body })).closingIssues, `${repo}#${number}`).toEqual(real.closingIssuesReferences)
    }
  })

  it('passes a keyword GitHub would not close: one in an HTML comment, or in a fence that ```diff does not end', () => {
    for (const body of [
      '<!-- Fixes #12 --> Part of #12',
      '<!-- Fixes #12 -->\nPart of #12 — slice 1 of 3.',
      '<!--\nFixes #12 (in part)\n-->\nPart of #12',
      'Part of #12\n\n```\n```diff\nFixes #12 (in part)\n```',
      '```bind: invalid argument```\nPart of #12\n\n```\nFixes #12 (in part)\n```',
    ]) {
      const result = evaluate(pr({ body }))
      expect(result.verdict, body).toBe('PASS')
      expect(result.closingIssues, body).toEqual([])
    }
  })

  it('still fails the #396 line after a one-line ```span```, and after a fence closed on a CRLF line', () => {
    const line396 = 'Fixes #364 (in part — see **Scope**). Remaining data loss: #403.'
    for (const body of [
      `\`\`\`err\`\`\`\n${line396}\n\n\`\`\`\ncode\n\`\`\``,
      `Part of #364\r\n\r\n\`\`\`\r\ncode\r\n\`\`\`\r\n${line396}`,
    ]) {
      const result = evaluate(pr({ body }))
      expect(result.verdict, body).toBe('FAIL')
      expect(result.closingIssues, body).toEqual([364])
      expect(result.findings.find((f) => f.rule === 'linked-issue').message, body).toContain('"in part"')
    }
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

/** This repo's own config — the only place a rule name is ever declared. Read as text, never run. */
const REAL_CONFIG = readFileSync(path.join(import.meta.dirname, '..', RATCHET_CONFIG_FILE), 'utf8')
/** A config declaring exactly these rule names, in the shape the real one writes them. */
const configOf = (...names) => `module.exports = {\n  forbidden: [\n${names.map((name) => `    { name: '${name}', severity: 'error' },`).join('\n')}\n  ],\n}\n`
/** The config as the PR's changed-file list sees it: edited, or not. */
const configEdit = () => file(RATCHET_CONFIG_FILE, 6, 0)
/**
 * The real config with one rule's `{ … }` entry taken out — the copy a merge base that never
 * declared it holds, or a PR deleting it leaves. Not a rename: since #489 a name the base declares
 * and the head does not is a disarmed rule, so "absent at the base" has to be absent.
 */
const realConfigWithout = (name) =>
  REAL_CONFIG.replace(new RegExp(String.raw`\n {4}\{\n {6}name: '${name}',[\s\S]*?\n {4}\},`), '')

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
    // This reproduction needs live core-through-index rows to remove — the precondition below
    // fails loudly, instead of this going red on an unrelated PR, once the ratchet takes it to 0 (#460).
    expect(realRows().filter((row) => row.rule.name === 'core-through-index').length).toBeGreaterThan(0)
    const base = realRows().filter((row) => row.rule.name !== 'core-through-index')
    const verdict = compareRatchetBaseline({
      base: JSON.stringify(base),
      head: REAL_BASELINE,
      baseConfig: realConfigWithout('core-through-index'),
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
// The channel widens exactly as the ratchet succeeds: `engine-no-ui` is down to zero rows (#460),
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
    // A fixture, not realRows(): that "repair" used to be findIndex-ing a live row out of the real
    // baseline, which goes vacuous — 0 rows removed, nothing repaired — once engine-no-state
    // reaches 0 there, the same way it now genuinely has for engine-no-ui-packages below (#460).
    const result = evaluate(untouched({ base: baselineOf(engine), head: baselineOf(uiPackages) }))
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
    // Same live-rows dependency as the #404 reproduction above, and the same fix (#460).
    expect(realRows().filter((row) => row.rule.name === 'core-through-index').length).toBeGreaterThan(0)
    const base = realRows().filter((row) => row.rule.name !== 'core-through-index')
    const result = evaluate(
      edited({
        base: JSON.stringify(base),
        head: REAL_BASELINE,
        baseConfig: realConfigWithout('core-through-index'),
        headConfig: REAL_CONFIG,
      }),
    )
    expect(result.ratchet).toBe('armed')
    expect(ratchetFinding(result).message).toContain(`declared in \`${RATCHET_CONFIG_FILE}\` by this PR`)
  })
})

// ── The rules themselves are guarded, not only their rows (#489) ────────────────────────────────
//
// The growth guard protected the baseline's rows; nothing protected the rules that give them
// meaning. This check read `.dependency-cruiser.cjs` only when a PR also edited the baseline, so a
// PR that deleted a rule — or emptied the file — was never evaluated here (#461's verification,
// item 9). A rule name the merge base's config declares and the head's does not is now a disarmed
// rule, whether or not the PR touches the baseline; a rename passes only with its rows moved. The
// config is still text here, read with the same `name:` scan — never required, imported or run.
// Counts come from the files, never pinned (#450).

describe('the layer rules themselves are guarded (#489)', () => {
  const ratchetFinding = (result) => result.findings.find((finding) => finding.rule === 'ratchet')
  const scanNames = (text) => [...new Set([...text.matchAll(/name:\s*'([^']+)'/g)].map((match) => match[1]))]
  const recorded = () => [...new Set(realRows().map((row) => row.rule.name))]
  const rowsOf = (rule) => realRows().filter((row) => row.rule.name === rule)
  /** A PR whose only change is the config: the baseline is the same file at both refs. */
  const configOnly = (headConfig) =>
    pr({
      body: 'Fixes #489',
      files: [configEdit()],
      ratchet: { base: REAL_BASELINE, head: REAL_BASELINE, baseConfig: REAL_CONFIG, headConfig },
    })
  /** A PR that edits the config and the baseline together. */
  const withBaseline = (head, headConfig, baseConfig = REAL_CONFIG) =>
    pr({
      body: 'Fixes #489',
      files: [configEdit(), file(RATCHET_BASELINE_FILE, 12, 12)],
      ratchet: { base: REAL_BASELINE, head, baseConfig, headConfig },
    })

  it('a config-only PR is evaluated by pr-hygiene: forbidden rule names present in the base config but absent in the head config → FAIL ratchet=disarmed naming the rules', () => {
    // A rule with no baseline rows is one `lint:layers` cannot see go, so it is the fixture.
    const zeroRow = scanNames(REAL_CONFIG).find((name) => !recorded().includes(name))
    expect(zeroRow).toBeDefined()
    const headConfig = realConfigWithout(zeroRow)
    expect(scanNames(headConfig)).toEqual(scanNames(REAL_CONFIG).filter((name) => name !== zeroRow))
    const result = evaluate(configOnly(headConfig))
    expect(result.ratchet).toBe('disarmed')
    expect(result.verdict).toBe('FAIL')
    expect(ratchetFinding(result).message).toContain(`\`${zeroRow}\``)
    expect(formatConsole(result).split('\n')[0]).toMatch(/^HYGIENE: FAIL .* ratchet=disarmed$/)
  })

  it('reads a deleted or emptied config — absent, a 0-byte file, or `forbidden: []` — as every rule disarmed, each named', () => {
    for (const headConfig of [null, '', 'module.exports = { forbidden: [] }\n']) {
      const result = evaluate(configOnly(headConfig))
      expect(result.ratchet).toBe('disarmed')
      expect(result.verdict).toBe('FAIL')
      for (const name of scanNames(REAL_CONFIG)) expect(ratchetFinding(result).message).toContain(`\`${name}\``)
    }
  })

  it('renaming a rule with its baseline rows still FAILs disarmed unless the rows move with it', () => {
    const [rule] = recorded()
    expect(rowsOf(rule).length).toBeGreaterThan(0)
    const renamedTo = `${rule}-renamed`
    const headConfig = REAL_CONFIG.replace(`name: '${rule}'`, `name: '${renamedTo}'`)
    expect(scanNames(headConfig)).toContain(renamedTo)
    const relabel = (rows) =>
      JSON.stringify(rows.map((row) => (row.rule.name === rule ? { ...row, rule: { ...row.rule, name: renamedTo } } : row)))

    // Config only: its rows are left behind, under a name no rule emits any more.
    const left = evaluate(configOnly(headConfig))
    expect(left.ratchet).toBe('disarmed')
    expect(ratchetFinding(left).message).toContain(`\`${rule}\``)
    expect(ratchetFinding(left).message).toMatch(/left behind/)

    // Every row moved with it: a rename its rows vouch for, which reads `swapped` and warns (#432).
    const moved = evaluate(withBaseline(relabel(realRows()), headConfig))
    expect(moved.ratchet).toBe('swapped')
    expect(moved.verdict).toBe('WARN')

    // One of its rows dropped on the way: no longer a rename its rows vouch for.
    const [dropped] = rowsOf(rule)
    const partly = realRows().filter((row) => !(row.rule.name === rule && row.from === dropped.from && row.to === dropped.to))
    const part = evaluate(withBaseline(relabel(partly), headConfig))
    expect(part.ratchet).toBe('disarmed')
    expect(ratchetFinding(part).message).toMatch(/not moved/)
  })

  it('reads a rule with no baseline rows renamed as disarmed — no row can vouch for the new name', () => {
    // Driving a rule to zero rows is the ratchet's goal, so a zero-row rule is the one a rename could
    // gut unseen: nothing in the baseline moves, and `lint:layers` has no row to miss.
    const zeroRow = scanNames(REAL_CONFIG).find((name) => !recorded().includes(name))
    expect(zeroRow).toBeDefined()
    const result = evaluate(configOnly(REAL_CONFIG.replace(`name: '${zeroRow}'`, `name: '${zeroRow}-renamed'`)))
    expect(result.ratchet).toBe('disarmed')
    expect(ratchetFinding(result).message).toContain(`\`${zeroRow}\` (no baseline rows)`)
  })

  it("passes a config-only PR that keeps every rule name — #432's comment-only edit — and says the config was read", () => {
    const result = evaluate(configOnly(`${REAL_CONFIG}\n// a comment-only edit, as #432's was\n`))
    expect(result.ratchet).toBe('unchanged')
    expect(result.verdict).toBe('PASS')
    expect(ratchetFinding(result).message).toContain(`all ${scanNames(REAL_CONFIG).length} rule names`)
    expect(ratchetFinding(result).message).toContain(RATCHET_CONFIG_FILE)
  })

  it("folds in #456's check: a name read as newly declared that already has rows at the merge base was declared there, so the base scan missed it — FAIL unreadable, not PASS armed", () => {
    // #456's measured shape, on a rule that has rows — picked from the file, so it does not decay
    // as a rule reaches zero: the base writes that rule's name as an identifier the scan cannot
    // see, the head adds one comment naming it, and one row is absorbed under it.
    const [rule] = recorded()
    expect(rowsOf(rule).length).toBeGreaterThan(0)
    const baseConfig = REAL_CONFIG.replace(`name: '${rule}'`, 'name: MISSED_BY_THE_SCAN')
    expect(scanNames(baseConfig)).toEqual(scanNames(REAL_CONFIG).filter((name) => name !== rule))
    const headConfig = `${baseConfig}// name: '${rule}'\n`
    const head = JSON.stringify([...realRows(), violation(rule, 'src/core/probe.ts', 'src/store/circuitStore.ts')], null, 2)
    const result = evaluate(withBaseline(head, headConfig, baseConfig))
    expect(result.ratchet).toBe('unreadable')
    expect(result.verdict).toBe('FAIL')
    expect(ratchetFinding(result).message).toContain(`\`${rule}\``)
    expect(ratchetFinding(result).message).toMatch(new RegExp(`\\b${rowsOf(rule).length} base rows?\\b`))
  })

  it('reads nothing for a PR that edits neither file (#396) — and reads a config-only PR, baseline and config both', () => {
    expect(ratchetReads([file('src/store/actions/junction.ts', 12, 3)])).toBeNull()
    expect(ratchetReads([file(RATCHET_BASELINE_FILE, 0, 218)])).toEqual({ config: false })
    expect(ratchetReads([configEdit()])).toEqual({ config: true })
    expect(ratchetReads([file(RATCHET_BASELINE_FILE, 737, 0), configEdit()])).toEqual({ config: true })
  })

  it('keeps the pull_request_target discipline on this path: the config is text, never required, imported, evaluated or run', () => {
    const source = (name) => readFileSync(path.join(import.meta.dirname, name), 'utf8')
    for (const name of ['pr-hygiene.mjs', 'pr-hygiene.logic.mjs']) {
      expect(source(name)).not.toMatch(/\brequire\s*\(|\bimport\s*\(|\beval\s*\(|\bnew Function\b|node:vm|child_process|createRequire/)
    }
    expect(source('pr-hygiene.mjs')).toContain('ratchetReads(files, kind)')
  })
})

// ── The ESLint half of the ratchet (#429) ──────────────────────────────────────────────────────
//
// `eslint . --suppress-all` rewrites `eslint-suppressions.json` and absorbs a new engine
// `console.log` the way the dependency-cruiser baseline write does. Same mechanism, second data:
// a row is `(file, rule id)`, and its `count` is growth the row set alone does not see.

describe('the ESLint suppressions baseline is the same ratchet (#429)', () => {
  const SUPPRESSIONS_FILE = 'eslint-suppressions.json'
  const ESLINT_CONFIG = 'eslint.config.js'
  const REAL_SUPPRESSIONS = readFileSync(path.join(import.meta.dirname, '..', SUPPRESSIONS_FILE), 'utf8')
  const REAL_ESLINT_CONFIG = readFileSync(path.join(import.meta.dirname, '..', ESLINT_CONFIG), 'utf8')
  const suppressionsOf = (entries) =>
    JSON.stringify(
      entries.reduce((all, [where, rule, count]) => ({ ...all, [where]: { ...all[where], [rule]: { count } } }), {}),
      null,
      2,
    )
  const eslintConfigOf = (...ids) => `export default [\n  {\n    rules: {\n${ids.map((id) => `      '${id}': 'error',`).join('\n')}\n    },\n  },\n]\n`
  const base = suppressionsOf([['src/utils/a.ts', 'no-console', 1], ['src/core/b.ts', 'no-restricted-globals', 2]])
  const suppressionsPr = (suppressions, overrides = {}) => pr({ suppressions, ...overrides })
  const finding = (result) => result.findings.find((entry) => entry.rule === 'ratchet' && entry.message.includes(SUPPRESSIONS_FILE))

  it('reads one row per file and rule id, carrying its count', () => {
    expect(parseRatchetBaseline(base, SUPPRESSION_RATCHET)).toEqual({
      rows: [
        { rule: 'no-console', edge: 'src/utils/a.ts', count: 1 },
        { rule: 'no-restricted-globals', edge: 'src/core/b.ts', count: 2 },
      ],
    })
    expect(parseRatchetBaseline('[]', SUPPRESSION_RATCHET).error).toBeDefined()
    expect(parseRatchetBaseline('{"src/a.ts":{"no-console":{}}}', SUPPRESSION_RATCHET).error).toMatch(/count/)
    const real = parseRatchetBaseline(REAL_SUPPRESSIONS, SUPPRESSION_RATCHET)
    expect(real.error).toBeUndefined()
    expect(real.rows.length).toBeGreaterThan(0)
  })

  it('fails a new suppression under a rule id the merge base already has, naming the file and the rule id', () => {
    const head = suppressionsOf([['src/utils/a.ts', 'no-console', 1], ['src/core/b.ts', 'no-restricted-globals', 2], ['src/core/new.ts', 'no-console', 1]])
    const result = evaluate(suppressionsPr({ base, head }))
    expect(result.verdict).toBe('FAIL')
    expect(result.suppressions).toBe('absorbed')
    expect(finding(result).level).toBe('fail')
    expect(finding(result).message).toContain('no-console: src/core/new.ts')
    expect(formatConsole(result).split('\n')[0]).toContain('suppressions=absorbed')
  })

  it('fails a count that rises from 1 to 4 in a file already suppressed — growth the row set alone does not see', () => {
    const head = suppressionsOf([['src/utils/a.ts', 'no-console', 4], ['src/core/b.ts', 'no-restricted-globals', 2]])
    const result = evaluate(suppressionsPr({ base, head }))
    expect(result.verdict).toBe('FAIL')
    expect(finding(result).message).toContain('no-console: src/utils/a.ts')
    expect(finding(result).message).toContain('1 → 4')
  })

  it('passes a new suppression under a rule id this PR newly names in eslint.config.js', () => {
    const head = suppressionsOf([['src/utils/a.ts', 'no-console', 1], ['src/core/b.ts', 'no-restricted-globals', 2], ['src/core/c.ts', 'no-alert', 3]])
    const result = evaluate(
      suppressionsPr(
        { base, head, baseConfig: eslintConfigOf('no-console', 'no-restricted-globals'), headConfig: eslintConfigOf('no-console', 'no-restricted-globals', 'no-alert') },
        { files: [file('src/core/thing.ts', 10, 2), file(ESLINT_CONFIG, 1, 0)] },
      ),
    )
    expect(result.suppressions).toBe('armed')
    expect(finding(result).level).toBe('pass')
    expect(finding(result).message).toContain('no-alert')
  })

  it('fails a rule id merely absent from the base file — with no config edit, a zero-suppression rule is no free pass', () => {
    const head = suppressionsOf([['src/utils/a.ts', 'no-console', 1], ['src/core/b.ts', 'no-restricted-globals', 2], ['src/core/c.ts', '@typescript-eslint/no-unused-vars', 1]])
    const result = evaluate(suppressionsPr({ base, head }))
    expect(result.verdict).toBe('FAIL')
    expect(finding(result).message).toContain('@typescript-eslint/no-unused-vars: src/core/c.ts')
  })

  it('fails growth under a rule id the PR newly names in the config but the merge base already suppresses — it was armed already', () => {
    const head = suppressionsOf([['src/utils/a.ts', 'no-console', 1], ['src/core/b.ts', 'no-restricted-globals', 2], ['src/core/c.ts', 'no-console', 1]])
    const result = evaluate(
      suppressionsPr(
        { base, head, baseConfig: eslintConfigOf('no-restricted-globals'), headConfig: eslintConfigOf('no-restricted-globals', 'no-console') },
        { files: [file('src/core/thing.ts', 10, 2), file(ESLINT_CONFIG, 1, 0)] },
      ),
    )
    expect(result.verdict).toBe('FAIL')
    expect(finding(result).message).toContain('no-console: src/core/c.ts')
  })

  it('passes a removed suppression and a falling count', () => {
    const head = suppressionsOf([['src/core/b.ts', 'no-restricted-globals', 1]])
    const result = evaluate(suppressionsPr({ base, head }))
    expect(result.suppressions).toBe('shrank')
    expect(result.verdict).toBe('PASS')
  })

  it('warns, rather than failing, when the PR body names the suppression it adds', () => {
    const head = suppressionsOf([['src/utils/a.ts', 'no-console', 4], ['src/core/b.ts', 'no-restricted-globals', 2]])
    const body = 'Fixes #150\n\nBaseline-growth: no-console: src/utils/a.ts — moved three calls in from a deleted file'
    const result = evaluate(suppressionsPr({ base, head }, { body }))
    expect(result.verdict).toBe('WARN')
    expect(result.suppressions).toBe('absorbed')
  })

  it('reads the real files: the committed suppressions against themselves, and rule ids in the real config', () => {
    const verdict = compareRatchetBaseline({ base: REAL_SUPPRESSIONS, head: REAL_SUPPRESSIONS, kind: SUPPRESSION_RATCHET })
    expect(verdict.status).toBe('unchanged')
    const ids = SUPPRESSION_RATCHET.ruleNames(REAL_ESLINT_CONFIG)
    for (const { rule } of parseRatchetBaseline(REAL_SUPPRESSIONS, SUPPRESSION_RATCHET).rows) expect(ids.has(rule)).toBe(true)
  })

  it('is read when a PR touches the suppressions or the ESLint config, and only then', () => {
    expect(ratchetReads([file('src/core/thing.ts')], SUPPRESSION_RATCHET)).toBeNull()
    expect(ratchetReads([file(SUPPRESSIONS_FILE)], SUPPRESSION_RATCHET)).toEqual({ config: false })
    expect(ratchetReads([file(ESLINT_CONFIG)], SUPPRESSION_RATCHET)).toEqual({ config: true })
    expect(ratchetReads([file(RATCHET_BASELINE_FILE)], SUPPRESSION_RATCHET)).toBeNull()
  })
})

// ── The doc-path baseline (#685) ──────────────────────────────────────────────────────────────
//
// `lint:docs` lets a grandfathered doc keep the dead citations its baseline counts; raising a
// count, or adding a doc, makes it pass again. Nothing declares a dead citation, so any growth fails.

describe('the doc-path baseline is the same ratchet (#685)', () => {
  const DOC_PATHS_FILE = 'scripts/hooks/docPathExists.baseline.json'
  const REAL_DOC_PATHS = readFileSync(path.join(import.meta.dirname, '..', DOC_PATHS_FILE), 'utf8')
  const countsOf = (entries) => JSON.stringify(Object.fromEntries(entries), null, 2)
  const base = countsOf([['docs/a.md', 3], ['docs/b.md', 1]])
  const docPathsPr = (docPaths, overrides = {}) => pr({ docPaths, files: [file(DOC_PATHS_FILE, 1, 1)], ...overrides })
  const finding = (result) => result.findings.find((entry) => entry.rule === 'ratchet' && entry.message.includes(DOC_PATHS_FILE))

  it('is one of the baselines the ratchet reads, at the path lint:docs reads it from', () => {
    expect(RATCHETS).toContain(DOC_PATH_RATCHET)
    expect(DOC_PATH_RATCHET.file).toBe(DOC_PATHS_FILE)
  })

  it('reads one row per doc, carrying its count of dead citations', () => {
    expect(parseRatchetBaseline(base, DOC_PATH_RATCHET)).toEqual({
      rows: [
        { rule: 'dead-path', edge: 'docs/a.md', count: 3 },
        { rule: 'dead-path', edge: 'docs/b.md', count: 1 },
      ],
    })
    expect(parseRatchetBaseline('[]', DOC_PATH_RATCHET).error).toBeDefined()
    expect(parseRatchetBaseline('{"docs/a.md":0}', DOC_PATH_RATCHET).error).toMatch(/count/)
    expect(parseRatchetBaseline('{"docs/a.md":"3"}', DOC_PATH_RATCHET).error).toMatch(/count/)
    const real = parseRatchetBaseline(REAL_DOC_PATHS, DOC_PATH_RATCHET)
    expect(real.error).toBeUndefined()
    expect(real.rows.length).toBeGreaterThan(0)
  })

  it('fails a count that rises, naming the doc and the counts', () => {
    const result = evaluate(docPathsPr({ base, head: countsOf([['docs/a.md', 4], ['docs/b.md', 1]]) }))
    expect(result.verdict).toBe('FAIL')
    expect(result.docPaths).toBe('absorbed')
    expect(finding(result).level).toBe('fail')
    expect(finding(result).message).toContain('dead-path: docs/a.md')
    expect(finding(result).message).toContain('3 → 4')
    expect(formatConsole(result).split('\n')[0]).toContain('docPaths=absorbed')
  })

  it('fails a doc added to the baseline, and points at the citation rather than at a config', () => {
    const result = evaluate(docPathsPr({ base, head: countsOf([['docs/a.md', 3], ['docs/b.md', 1], ['docs/c.md', 2]]) }))
    expect(result.verdict).toBe('FAIL')
    expect(finding(result).message).toContain('dead-path: docs/c.md')
    expect(finding(result).message).not.toContain('declare a rule')
  })

  it('fails a swap — one doc fixed, another added — because the rows compare as a set', () => {
    const result = evaluate(docPathsPr({ base, head: countsOf([['docs/a.md', 3], ['docs/c.md', 1]]) }))
    expect(result.verdict).toBe('FAIL')
    expect(finding(result).message).toContain('dead-path: docs/c.md')
  })

  it('passes a falling count and a doc leaving the baseline', () => {
    const result = evaluate(docPathsPr({ base, head: countsOf([['docs/a.md', 2]]) }))
    expect(result.docPaths).toBe('shrank')
    expect(result.verdict).toBe('PASS')
  })

  it('warns, rather than failing, when the PR body names the row it adds', () => {
    const head = countsOf([['docs/a.md', 3], ['docs/b.md', 1], ['docs/renamed.md', 2]])
    const body = 'Fixes #150\n\nBaseline-growth: dead-path: docs/renamed.md — moved from docs/old.md, same two citations'
    const result = evaluate(docPathsPr({ base, head }, { body }))
    expect(result.verdict).toBe('WARN')
    expect(result.docPaths).toBe('absorbed')
  })

  it('reads the real baseline against itself as unchanged', () => {
    expect(compareRatchetBaseline({ base: REAL_DOC_PATHS, head: REAL_DOC_PATHS, kind: DOC_PATH_RATCHET }).status).toBe('unchanged')
  })

  it('is read when a PR touches the baseline, and only then', () => {
    expect(ratchetReads([file('docs/harness/ledger.md')], DOC_PATH_RATCHET)).toBeNull()
    expect(ratchetReads([file('scripts/hooks/docPathExists.logic.mjs')], DOC_PATH_RATCHET)).toBeNull()
    expect(ratchetReads([file(DOC_PATHS_FILE)], DOC_PATH_RATCHET)).toEqual({ config: false })
  })
})

// ── The lineage baseline (#699) ───────────────────────────────────────────────────────────────
//
// `lint:lineage` holds the unlinked count (`Builds on: unknown`) to the one in its baseline; a PR
// that raises the number together with a new `unknown` passes it. Nothing declares an unknown.

describe('the lineage baseline is the same ratchet (#699)', () => {
  const LINEAGE_FILE = 'scripts/lineage-unlinked.baseline.json'
  const REAL_LINEAGE = readFileSync(path.join(import.meta.dirname, '..', LINEAGE_FILE), 'utf8')
  const unlinked = (count) => `${JSON.stringify({ unlinked: count }, null, 2)}\n`
  const lineagePr = (lineage, overrides = {}) => pr({ lineage, files: [file(LINEAGE_FILE, 1, 1)], ...overrides })
  const finding = (result) => result.findings.find((entry) => entry.rule === 'ratchet' && entry.message.includes(LINEAGE_FILE))

  it('is one of the baselines the ratchet reads, at the path lint:lineage reads it from', () => {
    expect(RATCHETS).toContain(LINEAGE_RATCHET)
    expect(LINEAGE_RATCHET.file).toBe(UNLINKED_BASELINE_FILE)
    expect(LINEAGE_RATCHET.file).toBe(LINEAGE_FILE)
  })

  it('reads the one count as one row, 0 included, and refuses any other shape', () => {
    expect(parseRatchetBaseline(unlinked(296), LINEAGE_RATCHET)).toEqual({ rows: [{ rule: 'Builds on', edge: 'unknown', count: 296 }] })
    expect(parseRatchetBaseline(unlinked(0), LINEAGE_RATCHET)).toEqual({ rows: [{ rule: 'Builds on', edge: 'unknown', count: 0 }] })
    for (const text of ['[]', 'null', '296', '{"unlinked":-1}', '{"unlinked":1.5}', '{"unlinked":"296"}', '{"unknown":3}']) {
      expect(parseRatchetBaseline(text, LINEAGE_RATCHET).error).toMatch(/unlinked/)
    }
    expect(parseRatchetBaseline(REAL_LINEAGE, LINEAGE_RATCHET).error).toBeUndefined()
    const unreadable = evaluate(lineagePr({ base: unlinked(296), head: '{"unlinked":"297"}' }))
    expect([unreadable.verdict, unreadable.lineage]).toEqual(['FAIL', 'unreadable'])
  })

  it('fails a raised count, naming the counts and the line that would excuse it', () => {
    const result = evaluate(lineagePr({ base: unlinked(296), head: unlinked(297) }))
    expect(result.verdict).toBe('FAIL')
    expect(result.lineage).toBe('absorbed')
    expect(finding(result).level).toBe('fail')
    expect(finding(result).message).toContain('296 → 297 unlinked decisions')
    expect(finding(result).message).toContain('`Baseline-growth: Builds on: unknown — <why>`')
    expect(finding(result).message).not.toContain('declare a rule')
    expect(formatConsole(result).split('\n')[0]).toContain('lineage=absorbed')
  })

  it('warns, rather than failing, when the PR body carries Baseline-growth: for it — in prose, not in a fence', () => {
    const line = 'Baseline-growth: Builds on: unknown — R902 is imported from an off-repo run, its basis not yet traced'
    const declared = evaluate(lineagePr({ base: unlinked(296), head: unlinked(297) }, { body: `Fixes #699\n\n${line}` }))
    expect([declared.verdict, declared.lineage]).toEqual(['WARN', 'absorbed'])
    const fenced = evaluate(lineagePr({ base: unlinked(296), head: unlinked(297) }, { body: `Fixes #699\n\n\`\`\`\n${line}\n\`\`\`` }))
    expect(fenced.verdict).toBe('FAIL')
  })

  it('passes a lowered count, and reads the real baseline against itself as unchanged', () => {
    const lowered = evaluate(lineagePr({ base: unlinked(296), head: unlinked(295) }))
    expect([lowered.verdict, lowered.lineage]).toEqual(['PASS', 'shrank'])
    expect(compareRatchetBaseline({ base: REAL_LINEAGE, head: REAL_LINEAGE, kind: LINEAGE_RATCHET }).status).toBe('unchanged')
  })

  it('is read when a PR touches the baseline, and only then', () => {
    expect(ratchetReads([file('docs/decisions/rulings/2026-10-15-x.md')], LINEAGE_RATCHET)).toBeNull()
    expect(ratchetReads([file(LINEAGE_FILE)], LINEAGE_RATCHET)).toEqual({ config: false })
  })
})
