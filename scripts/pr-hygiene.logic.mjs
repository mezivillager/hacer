// Pure logic for the pr-hygiene check (ADR-0013): linked issue + size budget.
// No I/O — fully unit tested in pr-hygiene.logic.test.mjs. The GitHub API and
// the runner environment live in scripts/pr-hygiene.mjs.
//
// A rule is `(ctx) => finding[]` over { body, author, labels, files, measures, ratchet }; the verdict is the
// highest level any finding reaches. To add a rule (e.g. #151's tamper flag: protected
// paths touched), append it to RULES — nothing else needs to change.

export const WARN_LINES = 200
export const FAIL_LINES = 400
export const WARN_FILES = 15
export const OVERRIDE_LABEL = 'size-override'
export const DEPENDENCY_LABEL = 'dependencies'

// What a deletion is still allowed to add: the import and re-export fix-ups a removal forces.
export const FIXUP_MAX_LINES_PER_FILE = 5
export const FIXUP_MAX_LINES = 20
export const FIXUP_MAX_SHARE = 0.05

const LEVELS = ['pass', 'warn', 'fail']
const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`

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
  // A research deliverable's appendices — measurements, outside research, review transcripts — are
  // evidence a reader consults, not prose anyone line-reviews. The report beside them still counts.
  ['evidence', (p) => /^docs\/research\/[^/]+\/evidence\//.test(p)],
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
    const additions = f.additions ?? 0
    const deletions = f.deletions ?? 0
    const lines = additions + deletions
    const entry = { filename: f.filename, lines, additions, deletions }
    buckets[kind].lines += lines
    buckets[kind].files.push(reason ? { ...entry, reason } : entry)
  }
  return buckets
}

/**
 * Why the size budget does not apply to a deletion, or why it still does (#326). The owner's
 * rule: "anything that should be removed should be removed, refactor deletion prs can be any
 * size they need to be" — a removal must not be sliced into arbitrary 400-line PRs.
 *
 * The check runs on `pull_request_target` and never checks out the PR, so all it has is each
 * file's name and its additions/deletions — it cannot read an added line to tell an import
 * fix-up from new behaviour. The proxy is therefore deliberately conservative: a deletion may
 * add at most {@link FIXUP_MAX_LINES_PER_FILE} lines to any one file, at most
 * {@link FIXUP_MAX_LINES} in total, and no more than {@link FIXUP_MAX_SHARE} of what it deletes.
 * Test and excluded files are outside the budget already, so only the reviewable bucket is weighed.
 *
 * @param {{files:{filename:string,additions:number,deletions:number}[]}} reviewable
 * @returns {{exempt:boolean, reason:string}|null} null when the PR is not deletion-shaped at all.
 */
export function deletionOnlyExemption({ files }) {
  const added = files.reduce((n, f) => n + f.additions, 0)
  const deleted = files.reduce((n, f) => n + f.deletions, 0)
  if (deleted === 0 || added >= deleted) return null
  const no = (reason) => ({ exempt: false, reason })
  const blocker = files.find((f) => f.additions > FIXUP_MAX_LINES_PER_FILE)
  if (blocker) {
    return no(
      `\`${blocker.filename}\` adds ${blocker.additions} lines — a forced fix-up adds at most ` +
        `${FIXUP_MAX_LINES_PER_FILE} to a file, so this PR adds behaviour`,
    )
  }
  if (added > FIXUP_MAX_LINES) return no(`${added} added lines exceed the ${FIXUP_MAX_LINES}-line fix-up allowance`)
  const share = Math.floor(deleted * FIXUP_MAX_SHARE)
  if (added > share) {
    return no(`${added} added lines exceed ${FIXUP_MAX_SHARE * 100}% of the ${deleted} deleted (${share})`)
  }
  return {
    exempt: true,
    reason: `deletes ${deleted} reviewable lines and adds ${added}, none more than ${FIXUP_MAX_LINES_PER_FILE} to a file`,
  }
}

/** The deletion verdict only when the budget is actually at stake — under the target nothing is waived. */
function deletionWaiver({ reviewable }) {
  return reviewable.lines > WARN_LINES ? deletionOnlyExemption(reviewable) : null
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

/**
 * Why the linked-issue rule does not apply to this PR, or null when it does: a bot author
 * (`dependabot[bot]` and friends) or the `dependencies` label. Bot PRs carry no `Fixes #n`.
 */
export function linkedIssueExemption({ author, labels }) {
  if ((author ?? '').endsWith('[bot]')) return `bot author \`${author}\``
  if (labels.includes(DEPENDENCY_LABEL)) return `\`${DEPENDENCY_LABEL}\` label`
  return null
}

// ---------------------------------------------------------------- rules

function sizeBudget({ labels, measures }) {
  const { lines, files } = measures.reviewable
  const override = labels.includes(OVERRIDE_LABEL)
  const deletion = deletionWaiver(measures)
  const suffix = override
    ? ` — passed by the \`${OVERRIDE_LABEL}\` label`
    : deletion
      ? ` — ${deletion.exempt ? 'passed as deletion-only' : 'not exempt as deletion-only'}: ${deletion.reason}`
      : ''
  const level = (wanted) => (override || deletion?.exempt ? 'pass' : wanted)
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

function linkedIssue({ body, author, labels, measures }) {
  const exemption = linkedIssueExemption({ author, labels })
  if (exemption) {
    return [{ rule: 'linked-issue', level: 'pass', message: `linked-issue rule skipped — ${exemption}` }]
  }
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

// ---------------------------------------------------------------- ratchet growth

/**
 * The layer ratchet's baseline (#329, #406). `pnpm run lint:layers` refuses a new violation, but
 * the documented `depcruise … --baseline` write absorbs it and `lint` goes green again — measured
 * 2026-09-24: 72 rows → 73. That command cannot go away, because arming a new rule needs it (#404
 * took the baseline 34 → 77 arming `core-through-index`). `.gitattributes` marks the file
 * `linguist-generated`, which keeps its machine-written rows out of the size budget and therefore
 * out of review, so this rule — not a reader — is what stands between a reset and `main`.
 */
export const RATCHET_BASELINE_FILE = '.dependency-cruiser-known-violations.json'

/** A greppable claim in the PR body that growth under an existing rule is deliberate. */
export const RATCHET_DECLARATION_RE = /^[ \t]*Baseline-growth:[ \t]*(\S.*?)[ \t]*$/im

/** How many added rows the message names before it says "+n more". */
export const RATCHET_MAX_NAMED_ROWS = 5

// Red stubs (#432) — replaced by the implementation in the next commit.
export function stripFencedCode(text) {
  return text ?? ''
}
export function ratchetDeclarations() {
  return []
}
export function undeclaredRatchetRows(_body, rows) {
  return rows
}
export async function readAtRef() {
  throw new Error('readAtRef is not implemented')
}

/**
 * One comparable row per recorded violation. A baseline write rewrites the whole file, so rows
 * have to compare as a set — never by position, and never by count alone.
 * @param {string|null|undefined} text the file at one commit, or null when it does not exist there
 * @returns {{rows:{rule:string,edge:string}[], error?:undefined}|{rows?:undefined, error:string}}
 */
export function parseRatchetBaseline(text) {
  if (text === null || text === undefined) return { rows: [] }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { error: 'is not valid JSON' }
  }
  if (!Array.isArray(parsed)) return { error: 'is not a JSON array of violation rows' }
  if (parsed.some((row) => typeof row?.rule?.name !== 'string')) return { error: 'has a row with no rule name' }
  return { rows: parsed.map((row) => ({ rule: row.rule.name, edge: `${row.from} → ${row.to}` })) }
}

const ratchetRowKey = (row) => `${row.rule}\u0000${row.edge}`

/**
 * The verdict on one baseline against the PR's merge base. A row may only appear under a rule name
 * that is **new in this PR** — that is what tells an armed rule from an absorbed violation, and it
 * is the one thing a reviewer cannot see in a `linguist-generated` diff.
 *
 * - `armed` — every added row belongs to a rule name the base did not have. #404's shape.
 * - `absorbed` — rows grew and at least one belongs to a rule that already existed.
 * - `swapped` — a row is new but the count did not grow (a renamed file records the same violation
 *   under a new path). Worth saying out loud, not worth blocking.
 * @param {{base:string|null, head:string|null}} contents
 */
export function compareRatchetBaseline({ base, head }) {
  const parsedBase = parseRatchetBaseline(base)
  const parsedHead = parseRatchetBaseline(head)
  if (parsedHead.error) return { status: 'unreadable', detail: `\`${RATCHET_BASELINE_FILE}\` ${parsedHead.error}` }
  if (parsedBase.error) {
    return { status: 'unreadable', detail: `the base copy of \`${RATCHET_BASELINE_FILE}\` ${parsedBase.error}` }
  }
  const counts = { base: parsedBase.rows.length, head: parsedHead.rows.length }
  const baseKeys = new Set(parsedBase.rows.map(ratchetRowKey))
  const baseRules = new Set(parsedBase.rows.map((row) => row.rule))
  const added = parsedHead.rows.filter((row) => !baseKeys.has(ratchetRowKey(row)))
  const armedRules = [...new Set(added.filter((row) => !baseRules.has(row.rule)).map((row) => row.rule))]
  const absorbed = added.filter((row) => baseRules.has(row.rule))
  const status =
    added.length === 0
      ? counts.head < counts.base
        ? 'shrank'
        : 'unchanged'
      : absorbed.length === 0
        ? 'armed'
        : counts.head > counts.base
          ? 'absorbed'
          : 'swapped'
  return { status, counts, added, absorbed, armedRules }
}

/** Added rows, named — "the baseline grew" on its own is not something anyone can act on. */
function nameRatchetRows(rows) {
  const shown = rows.slice(0, RATCHET_MAX_NAMED_ROWS).map((row) => `\`${row.rule}: ${row.edge}\``)
  const rest = rows.length - shown.length
  return shown.join(', ') + (rest > 0 ? `, +${rest} more` : '')
}

function ratchetGrowth({ body, ratchet }) {
  const finding = (level, message) => [{ rule: 'ratchet', level, message }]
  if (!ratchet) return finding('pass', `\`${RATCHET_BASELINE_FILE}\` unchanged`)
  const { status, counts, added, absorbed, armedRules, detail } = ratchet
  if (status === 'unreadable') return finding('fail', `${detail} — its growth cannot be checked`)
  if (status === 'unchanged') return finding('pass', `${counts.head} baseline rows, unchanged`)
  const moved = `${counts.base} → ${counts.head} baseline rows`
  if (status === 'shrank') return finding('pass', `${moved} — the ratchet shrank`)
  if (status === 'armed') {
    const rules = armedRules.map((rule) => `\`${rule}\``).join(', ')
    return finding('pass', `${moved}, arming ${rules} (${plural(added.length, 'row')}) — growth is legitimate when a rule is armed in the same commit`)
  }
  const declared = RATCHET_DECLARATION_RE.exec(body ?? '')?.[1]
  const what =
    status === 'absorbed'
      ? `${moved} with no new rule armed — ${plural(absorbed.length, 'violation')} absorbed: ${nameRatchetRows(absorbed)}`
      : `${counts.head} baseline rows, flat, but ${plural(absorbed.length, 'violation')} is new: ${nameRatchetRows(absorbed)}`
  if (declared) return finding('warn', `${what} — declared: "${declared}"`)
  if (status === 'swapped') {
    return finding('warn', `${what}. A renamed file records the same violation under a new path; anything else is an absorption`)
  }
  return finding(
    'fail',
    `${what}. Fix the import, arm a rule in the same commit, or state the reason in the PR body as \`Baseline-growth: <why>\``,
  )
}

export const RULES = [sizeBudget, linkedIssue, ratchetGrowth]

/**
 * Run every rule over one PR.
 * @param {{body:string|null, author?:string, labels:string[], files:object[], gitattributes?:string}} input
 * @returns {{verdict:'PASS'|'WARN'|'FAIL', findings:object[], measures:object, linkedIssues:number[], docsOnly:boolean, linkedIssueExemption:string|null}}
 */
export function evaluate({ body, author, labels = [], files, gitattributes, ratchet = null }, rules = RULES) {
  const measures = measure(files, parseGeneratedPatterns(gitattributes))
  const verdict = ratchet ? compareRatchetBaseline(ratchet) : null
  const findings = rules.flatMap((rule) => rule({ body, author, labels, files, measures, ratchet: verdict }))
  const worst = Math.max(0, ...findings.map((f) => LEVELS.indexOf(f.level)))
  const deletion = deletionWaiver(measures)
  return {
    verdict: LEVELS[worst].toUpperCase(),
    findings,
    measures,
    linkedIssues: findLinkedIssues(body),
    docsOnly: isDocsOnly(measures.reviewable.files.map((f) => f.filename)),
    linkedIssueExemption: linkedIssueExemption({ author, labels }),
    sizeExemption: deletion?.exempt ? deletion.reason : null,
    ratchet: verdict?.status ?? null,
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
  if (result.linkedIssueExemption) return 'skipped'
  if (result.linkedIssues.length > 0) return result.linkedIssues.map((n) => `#${n}`).join(',')
  return result.docsOnly ? 'docs-only' : 'none'
}

/** One greppable `HYGIENE:` line, then a line per finding. */
export function formatConsole(result) {
  const { reviewable, test, excluded } = result.measures
  const head =
    `HYGIENE: ${result.verdict} reviewable=${reviewable.lines} test=${test.lines} ` +
    `excluded=${excluded.lines} files=${reviewable.files.length} issue=${issueLabel(result)}` +
    (result.sizeExemption ? ' size=deletion-only' : '') +
    (result.ratchet ? ` ratchet=${result.ratchet}` : '')
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
