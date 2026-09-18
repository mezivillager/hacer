// Pure logic for the pr-hygiene check (ADR-0013): linked issue + size budget.
// No I/O — fully unit tested in pr-hygiene.logic.test.mjs. The GitHub API and
// the runner environment live in scripts/pr-hygiene.mjs.
//
// A rule is `(ctx) => finding[]` over { body, labels, files, measures }; the verdict is the
// highest level any finding reaches. To add a rule (e.g. #151's tamper flag: protected
// paths touched), append it to RULES — nothing else needs to change.

export const WARN_LINES = 200
export const FAIL_LINES = 400
export const WARN_FILES = 15
export const OVERRIDE_LABEL = 'size-override'

const LEVELS = ['pass', 'warn', 'fail']

// ---------------------------------------------------------------- classification

/** `.gitattributes` patterns follow gitignore rules; this covers the forms people write. */
const GLOB_TOKENS = { '**/': '(?:.*/)?', '**': '.*', '*': '[^/]*', '?': '[^/]' }

function globToRegExp(pattern) {
  const source = pattern
    .replace(/^\//, '')
    .split(/(\*\*\/|\*\*|\*|\?)/)
    .map((token) => GLOB_TOKENS[token] ?? token.replace(/[.+^${}()|[\]\\]/g, '\\$&'))
    .join('')
  // A pattern with a slash is anchored to the repo root; a bare one matches any basename.
  return new RegExp(pattern.includes('/') ? `^${source}$` : `(?:^|/)${source}$`)
}

/** Patterns marked `linguist-generated` (or `=true`) in a .gitattributes file. */
export function parseGeneratedPatterns(text) {
  return (text ?? '').split('\n').flatMap((raw) => {
    const line = raw.trim()
    if (!line || line.startsWith('#')) return []
    const [pattern, ...attrs] = line.split(/\s+/)
    const generated = attrs.some((a) => a === 'linguist-generated' || a === 'linguist-generated=true')
    return generated ? [pattern] : []
  })
}

const isTestFile = (p) => /\.(test|spec)\.[^/]+$/.test(p) || p.startsWith('e2e/')

const EXCLUSIONS = [
  ['lockfile', (p) => p === 'pnpm-lock.yaml' || p.endsWith('/pnpm-lock.yaml')],
  ['snapshot', (p) => /(^|\/)__snapshots__\//.test(p) || p.endsWith('.snap')],
  ['vectors', (p) => p.startsWith('conformance/vectors/')],
  ['fixture', (p) => p.startsWith('scripts/fixtures/')],
  ['changelog', (p) => p === 'CHANGELOG.md'],
]

/**
 * Exclusions win over the test suffix, so `a.test.ts.snap` is a snapshot, not a test.
 * @returns {{kind:'reviewable'|'test'|'excluded', reason?:string}}
 */
export function classifyFile(filename, generatedPatterns = []) {
  const exclusion = EXCLUSIONS.find(([, matches]) => matches(filename))
  if (exclusion) return { kind: 'excluded', reason: exclusion[0] }
  if (generatedPatterns.some((pattern) => globToRegExp(pattern).test(filename))) {
    return { kind: 'excluded', reason: 'generated' }
  }
  if (isTestFile(filename)) return { kind: 'test' }
  return { kind: 'reviewable' }
}

/**
 * Bucket the PR's files (API shape: filename, additions, deletions) and sum their lines.
 * @returns {{reviewable:Bucket, test:Bucket, excluded:Bucket}} where Bucket = {lines, files}
 */
export function measure(files, generatedPatterns = []) {
  const buckets = { reviewable: { lines: 0, files: [] }, test: { lines: 0, files: [] }, excluded: { lines: 0, files: [] } }
  for (const f of files) {
    const { kind, reason } = classifyFile(f.filename, generatedPatterns)
    const lines = (f.additions ?? 0) + (f.deletions ?? 0)
    buckets[kind].lines += lines
    buckets[kind].files.push(reason ? { filename: f.filename, lines, reason } : { filename: f.filename, lines })
  }
  return buckets
}

// ---------------------------------------------------------------- linked issue

// GitHub's closing keywords plus "Part of", followed by #n, owner/repo#n or an issue URL.
const LINK_RE =
  /\b(?:fix|fixes|fixed|close|closes|closed|resolve|resolves|resolved|part of)\s*:?\s*(?:https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/|(?:[\w.-]+\/[\w.-]+)?#)(\d+)/gi

/** Distinct issue numbers the body links, in order of first mention. */
export function findLinkedIssues(body) {
  const numbers = Array.from((body ?? '').matchAll(LINK_RE), (m) => Number(m[1]))
  return [...new Set(numbers)]
}

/** True when there is at least one reviewable file and all of them are documentation. */
export function isDocsOnly(reviewableFilenames) {
  return reviewableFilenames.length > 0 && reviewableFilenames.every((p) => p.startsWith('docs/') || p.endsWith('.md'))
}

// ---------------------------------------------------------------- rules

function sizeBudget({ labels, measures }) {
  const { lines, files } = measures.reviewable
  const override = labels.includes(OVERRIDE_LABEL)
  const suffix = override ? ` — passed by the \`${OVERRIDE_LABEL}\` label` : ''
  const level = (wanted) => (override ? 'pass' : wanted)
  const findings = []
  if (lines > FAIL_LINES) {
    findings.push({ rule: 'size', level: level('fail'), message: `${lines} reviewable lines exceed the ${FAIL_LINES}-line budget${suffix}` })
  } else if (lines > WARN_LINES) {
    findings.push({ rule: 'size', level: level('warn'), message: `${lines} reviewable lines — over the ${WARN_LINES}-line target (budget ${FAIL_LINES})${suffix}` })
  } else {
    findings.push({ rule: 'size', level: 'pass', message: `${lines} reviewable lines (target ≤ ${WARN_LINES}, budget ${FAIL_LINES})` })
  }
  if (files.length > WARN_FILES) {
    findings.push({ rule: 'size', level: level('warn'), message: `${files.length} reviewable files — soft limit is ${WARN_FILES}${suffix}` })
  }
  return findings
}

function linkedIssue({ body, measures }) {
  const issues = findLinkedIssues(body)
  if (issues.length > 0) {
    return [{ rule: 'linked-issue', level: 'pass', message: `linked ${issues.map((n) => `#${n}`).join(', ')}` }]
  }
  if (isDocsOnly(measures.reviewable.files.map((f) => f.filename))) {
    return [{ rule: 'linked-issue', level: 'pass', message: 'docs-only PR — no linked issue required' }]
  }
  return [
    {
      rule: 'linked-issue',
      level: 'fail',
      message: 'no linked issue — add `Fixes #n` / `Closes #n` / `Resolves #n` / `Part of #n` to the PR body',
    },
  ]
}

export const RULES = [sizeBudget, linkedIssue]

/**
 * Run every rule over one PR.
 * @param {{body:string|null, labels:string[], files:object[], gitattributes?:string}} input
 * @returns {{verdict:'PASS'|'WARN'|'FAIL', findings:object[], measures:object, linkedIssues:number[], docsOnly:boolean}}
 */
export function evaluate({ body, labels = [], files, gitattributes }, rules = RULES) {
  const measures = measure(files, parseGeneratedPatterns(gitattributes))
  const findings = rules.flatMap((rule) => rule({ body, labels, files, measures }))
  const worst = Math.max(0, ...findings.map((f) => LEVELS.indexOf(f.level)))
  return {
    verdict: LEVELS[worst].toUpperCase(),
    findings,
    measures,
    linkedIssues: findLinkedIssues(body),
    docsOnly: isDocsOnly(measures.reviewable.files.map((f) => f.filename)),
  }
}

// ---------------------------------------------------------------- output

/** The `rel="next"` URL from a GitHub `Link` header, or null on the last page. */
export function nextPageUrl(linkHeader) {
  const m = /<([^>]+)>;\s*rel="next"/.exec(linkHeader ?? '')
  return m ? m[1] : null
}

const ICONS = { pass: '✅', warn: '⚠️', fail: '❌' }

function issueLabel(result) {
  if (result.linkedIssues.length > 0) return result.linkedIssues.map((n) => `#${n}`).join(',')
  return result.docsOnly ? 'docs-only' : 'none'
}

/** One greppable `HYGIENE:` line, then a line per finding. */
export function formatConsole(result) {
  const { reviewable, test, excluded } = result.measures
  const head =
    `HYGIENE: ${result.verdict} reviewable=${reviewable.lines} test=${test.lines} ` +
    `excluded=${excluded.lines} files=${reviewable.files.length} issue=${issueLabel(result)}`
  return [head, ...result.findings.map((f) => `  ${ICONS[f.level]} ${f.message}`)].join('\n')
}

/** Markdown for $GITHUB_STEP_SUMMARY. */
export function formatSummary(result) {
  const { reviewable, test, excluded } = result.measures
  const row = (name, bucket) => `| ${name} | ${bucket.lines} | ${bucket.files.length} |`
  const fileRows = Object.entries(result.measures).flatMap(([kind, bucket]) =>
    bucket.files.map((f) => `| \`${f.filename}\` | ${f.lines} | ${f.reason ?? kind} |`),
  )
  return [
    `## pr-hygiene: ${result.verdict}`,
    '',
    '| Bucket | Lines | Files |',
    '|---|---|---|',
    row('Reviewable', reviewable),
    row('Test', test),
    row('Excluded', excluded),
    '',
    ...result.findings.map((f) => `- ${ICONS[f.level]} ${f.message}`),
    '',
    `<details><summary>Files (${fileRows.length})</summary>`,
    '',
    '| File | Lines | Class |',
    '|---|---|---|',
    ...fileRows,
    '',
    '</details>',
    '',
  ].join('\n')
}
