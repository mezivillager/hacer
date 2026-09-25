// Pure logic for the pr-hygiene check (ADR-0013): linked issue + size budget.
// No I/O — fully unit tested in pr-hygiene.logic.test.mjs. The GitHub API and
// the runner environment live in scripts/pr-hygiene.mjs.
//
// A rule is `(ctx) => finding[]` over { body, author, labels, files, measures, ratchet }; the verdict is the
// highest level any finding reaches. To add a rule (e.g. #151's tamper flag: protected
// paths touched), append it to RULES — nothing else needs to change.

import { isProtectedPath } from './protected-paths.logic.mjs'

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

// A keyword followed by #n, owner/repo#n or an issue URL.
const ISSUE_REF = String.raw`\s*:?\s*(?:https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/|(?:[\w.-]+\/[\w.-]+)?#)(\d+)`
const linkRe = (keywords) => new RegExp(String.raw`\b(?:${keywords})${ISSUE_REF}`, 'gi')

/** GitHub's closing keywords. It acts on the keyword alone: "this does not close #n" closes #n (#443). */
const CLOSING_KEYWORDS = 'fix|fixes|fixed|close|closes|closed|resolve|resolves|resolved'

// GitHub's closing keywords plus "Part of", followed by #n, owner/repo#n or an issue URL.
const LINK_RE = linkRe(`${CLOSING_KEYWORDS}|part of`)
const CLOSING_RE = linkRe(CLOSING_KEYWORDS)
const PART_OF_RE = linkRe('part of')

/** Words that say an issue is done only in part, read on its closing keyword's own line (#485). */
const IN_PART_RE = /\b(?:in part|partial(?:ly)?|partly|remaining)\b/gi

// What GitHub does not read as prose, so a keyword in it closes nothing: a fenced block, an HTML comment,
// an inline code span (#375). A fence follows CommonMark, not a line's first characters (#485 round 2):
// a backtick fence's info string holds no backtick, so a line like ```err``` is an inline span, and only
// a bare run of the same character, at least as long, closes one, so ```diff inside it does not. An
// unclosed fence runs to the end. Measured on kubernetes PRs 139623 and 137025, vscode PR 325145 and
// next.js PR 96350, whose closing lists GitHub reports.
const BACKTICK_FENCE = /^ {0,3}(?<tick>`{3,})[^`\n]*$[\s\S]*?(?:\n {0,3}\k<tick>`*[ \t]*$|(?![\s\S]))/
const TILDE_FENCE = /^ {0,3}(?<tilde>~{3,}).*$[\s\S]*?(?:\n {0,3}\k<tilde>~*[ \t]*$|(?![\s\S]))/
const HTML_COMMENT = /<!--[\s\S]*?-->/
const CODE_SPAN = /(?<!`)(?<span>`+)(?!`)[^\n]*?(?<!`)\k<span>(?!`)/
// One pass, so whichever opens first wins, as in CommonMark.
const NOT_PROSE = new RegExp([BACKTICK_FENCE, TILDE_FENCE, HTML_COMMENT, CODE_SPAN].map((re) => re.source).join('|'), 'gm')

/** The body as GitHub reads it for closing keywords: prose only, each dropped part keeping its line breaks. */
const withoutCode = (body) =>
  (body ?? '').replace(/\r\n?/g, '\n').replace(NOT_PROSE, (part) => part.replace(/[^\n]/g, '') || ' ')

/** Distinct issue numbers the body links, in order of first mention. */
export function findLinkedIssues(body) {
  const numbers = Array.from((body ?? '').matchAll(LINK_RE), (m) => Number(m[1]))
  return [...new Set(numbers)]
}

/** Distinct issue numbers GitHub closes when the PR merges: its closing keywords', never `Part of`'s. */
function findClosingIssues(body) {
  return [...new Set(Array.from(withoutCode(body).matchAll(CLOSING_RE), (m) => Number(m[1])))]
}

/**
 * Each issue a closing keyword closes while the body says it is done only in part (#485): `Part of`
 * the same issue anywhere in the body, or an in-part word on the keyword's own line; code and HTML
 * comments are examples, not claims, and are skipped. Read across the whole body, the words misfired
 * on 8 of the repo's 73 real bodies with a closing keyword; on the keyword's line, on none — and both
 * real early closes still fail: #396's "Fixes #364 (in part …)", and #443's "Part of #193" beside a
 * negated keyword that GitHub closed #193 on all the same.
 * @returns {{issue:number, keyword:string, phrases:string[]}[]}
 */
function findPartialCloses(body) {
  const text = withoutCode(body)
  const partOf = Array.from(text.matchAll(PART_OF_RE), (m) => ({ issue: Number(m[1]), phrase: m[0] }))
  const found = new Map()
  for (const line of text.split('\n')) {
    const words = Array.from(line.matchAll(IN_PART_RE), (m) => m[0])
    for (const m of line.matchAll(CLOSING_RE)) {
      const issue = Number(m[1])
      const phrases = [...partOf.filter((p) => p.issue === issue).map((p) => p.phrase), ...words]
      if (phrases.length === 0) continue
      const seen = found.get(issue) ?? { issue, keyword: m[0], phrases: [] }
      found.set(issue, { ...seen, phrases: [...new Set([...seen.phrases, ...phrases])] })
    }
  }
  return [...found.values()]
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
  // Ahead of the docs-only pass: that exemption waives the link, and a docs PR closes an issue all the same.
  const partial = findPartialCloses(body)
  if (partial.length > 0) {
    return partial.map(({ issue, keyword, phrases }) => ({
      rule: 'linked-issue',
      level: 'fail',
      message:
        `\`${keyword}\` closes #${issue} on merge, yet the body says it is done only in part ` +
        `(${phrases.map((phrase) => `"${phrase}"`).join(', ')}) — GitHub acts on the keyword alone, whatever the ` +
        `sentence around it says. \`Fixes\` only when the whole issue is done; otherwise \`Part of #${issue}\``,
    }))
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

/**
 * The config the layer rules are declared in. A rule name exists because a line here says so, and
 * that line is reviewable — unlike the baseline beside it, which is `linguist-generated`.
 */
export const RATCHET_CONFIG_FILE = '.dependency-cruiser.cjs'

/**
 * What the ratchet reads for this PR, or null when it reads nothing — a PR that edits neither file
 * (#396's shape) makes no content request at all. The baseline is read at both refs when either
 * file changed, and the config's text as well when it did: a rule is declared there, and taken out
 * there (#489), so a PR that edits only the config is read too.
 * @param {{filename:string}[]} files
 */
export function ratchetReads(files) {
  const edited = (name) => files.some((entry) => entry.filename === name)
  return edited(RATCHET_BASELINE_FILE) || edited(RATCHET_CONFIG_FILE) ? { config: edited(RATCHET_CONFIG_FILE) } : null
}

/**
 * A greppable claim in the PR body that a named absorption is deliberate.
 *
 * **What it is for** (corrected #432): *not* a plain rename — that was the PR body's claim and it
 * was wrong twice over. A rename used to pass on a warn without any declaration, and now fails
 * like every other row added under an existing rule name. The case that genuinely needs the hatch
 * is a **move**: a file that enters `src/core` records new `engine-no-state` rows while its old
 * rows disappear, and no comparison of rows can tell that from a silent reset. That is a real case
 * while the foundation plan moves files between layers, which is why the hatch stays — `main-rules`
 * allows no bypass, so a rule with no way to argue with it gets deleted rather than obeyed.
 *
 * **What fences it**: the declaration has to *name the rows it covers*, in the same
 * `<rule>: <from> → <to>` form the failure message prints, so it cannot pre-authorise rows the
 * author never saw; one line per row, or several rows on one line. Any non-blank text used to be
 * enough — `Baseline-growth: .` cleared a measured reset. A line inside a fenced code block is an
 * example, not a claim, and does not count. `ratchet=absorbed` stays on the `HYGIENE:` line and in
 * the step summary even when the declaration holds, so the reset is on the record either way.
 */
export const RATCHET_DECLARATION_RE = /^[ \t]*Baseline-growth:[ \t]*(\S.*?)[ \t]*$/gim

/** How many added rows the message names before it says "+n more". */
export const RATCHET_MAX_NAMED_ROWS = 5

/** A PR body with fenced code blocks removed. An unclosed fence swallows the rest of the body. */
export function stripFencedCode(text) {
  let fence = null
  const mark = (line) => /^[ \t]*(`{3,}|~{3,})/.exec(line)?.[1]
  return (text ?? '')
    .split('\n')
    .filter((line) => {
      const here = mark(line)
      if (fence === null) {
        if (here) fence = here
        return !here
      }
      if (here && here[0] === fence[0] && here.length >= fence.length) fence = null
      return false
    })
    .join('\n')
}

/** `->` and `→` name the same edge, and whitespace in a PR body is not meaningful. */
const normaliseClaim = (text) => text.replace(/->/g, '→').replace(/\s+/g, ' ').trim()

/** Every `Baseline-growth:` claim in the body's prose. */
export function ratchetDeclarations(body) {
  return [...stripFencedCode(body).matchAll(RATCHET_DECLARATION_RE)].map((match) => match[1])
}

/** The absorbed rows no declaration names — a declaration covers only what it spells out. */
export function undeclaredRatchetRows(body, rows) {
  const claims = ratchetDeclarations(body).map(normaliseClaim)
  return rows.filter((row) => !claims.some((claim) => claim.includes(normaliseClaim(`${row.rule}: ${row.edge}`))))
}

/**
 * A file's bytes at one ref, or null when the path is genuinely absent there.
 *
 * The contents API answers **404 for both** an absent path and a ref it cannot resolve, and the two
 * are indistinguishable in the response. Reading the second as the first is the one fail-open
 * direction that matters here: an unresolvable base would parse as an empty ratchet and the whole
 * head baseline would read as a legitimate arming. So a 404 becomes `null` only once the ref
 * itself resolves; otherwise it throws, and a thrown error is a failed required check.
 * @param {{readPath:(ref:string,path:string)=>Promise<string|null>, refExists:(ref:string)=>Promise<boolean>}} io
 */
export async function readAtRef(io, ref, filePath) {
  const body = await io.readPath(ref, filePath)
  if (body !== null) return body
  if (await io.refExists(ref)) return null
  throw new Error(`cannot resolve \`${ref}\` — refusing to read a missing \`${filePath}\` as an empty baseline`)
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
 * Every rule name a dependency-cruiser config declares, read as **text**. This runs under
 * `pull_request_target`, so the PR's copy of the config is data here — never required, imported or
 * executed — exactly like the baseline beside it.
 *
 * Only a literal `name: '…'` is seen, and one inside a comment or a string literal counts too —
 * what that costs is stated with the residual on `compareRatchetBaseline`. A config written so the
 * scan sees none of its names is refused by `unscannedConfig`, not read as declaring nothing (#438).
 */
export function parseRuleNames(text) {
  return new Set([...(text ?? '').matchAll(/(?:^|[{,\s])name\s*:\s*(['"`])([^'"`\n]+)\1/g)].map((match) => match[2]))
}

/**
 * Why a config's scan cannot be trusted, or null. Text that scans to no rule names is a config the
 * scan cannot read — rules built by a helper, quoted or computed keys, identifier values — not one
 * with no rules, which is no state worth passing on (#438). Trusted, an unread *base* makes every
 * name in the head look newly declared, so a row absorbed under a long-armed rule read `PASS
 * armed` (measured on #432). An unread *head* declares nothing, so it could only read `absorbed`
 * — but it fails here too: once merged it is every later PR's base, and `absorbed` would tell its
 * author to declare a rule they may well have declared. An absent config (`null`) is not unread.
 */
function unscannedConfig(text, whose, cost) {
  if ((text ?? '').trim() === '' || parseRuleNames(text).size > 0) return null
  return (
    `${whose} \`${RATCHET_CONFIG_FILE}\` is not empty, yet the scan found no rule names in it — it reads only a ` +
    `literal \`name: '…'\`, so this is a config it cannot read, not one with no rules. ${cost}, so the ratchet ` +
    'fails closed: write each rule name literally, or teach `parseRuleNames` the new form in its own PR first'
  )
}

/**
 * A rule name with rows in the merge base's baseline was declared in the merge base's config:
 * dependency-cruiser records a row only under a rule it ran, and `lint:layers` fails a row under any
 * other name (#489). So a name that reads as newly declared here while it has base rows is one the
 * base scan missed, and trusting it reads a row absorbed under a long-armed rule as `armed` (#456).
 * A missed rule with no rows is invisible to this — the residual on `compareRatchetBaseline`.
 */
function missedByBaseScan(declaredHere, baseRows) {
  const missed = [...declaredHere]
    .map((rule) => ({ rule, rows: baseRows.filter((row) => row.rule === rule).length }))
    .filter(({ rows }) => rows > 0)
  if (missed.length === 0) return null
  const [it, reads] = missed.length === 1 ? ['it', 'reads'] : ['them', 'read']
  return (
    `${missed.map(({ rule, rows }) => `\`${rule}\` (${plural(rows, 'base row')})`).join(', ')} ${reads} as newly declared ` +
    `in this PR, yet the merge base's baseline already records rows under ${it} — so the merge base's ` +
    `\`${RATCHET_CONFIG_FILE}\` declares ${it} too, and the scan, which reads only a literal \`name: '…'\`, missed ${it}. ` +
    'Trusted, that reads a row absorbed under a long-armed rule as `armed`, so the ratchet fails closed: write the ' +
    'name literally at the merge base first, in its own PR'
  )
}

/**
 * The rules this PR takes out of the config (#489). A name the merge base's copy declares and this
 * PR's does not is a disarmed rule — every edge it checked goes unguarded, rows or none — unless
 * every one of its rows moved to a name this PR declares: a rename its rows vouch for, which reads
 * `swapped`. A name the scan can no longer see reads as taken out too, which fails closed.
 */
function disarmedRules(baseRules, headRules, declaredHere, baseRows, headRows) {
  const movedEdges = new Set(headRows.filter((row) => declaredHere.has(row.rule)).map((row) => row.edge))
  return [...baseRules]
    .filter((rule) => !headRules.has(rule))
    .map((rule) => {
      const rows = baseRows.filter((row) => row.rule === rule)
      const left = headRows.filter((row) => row.rule === rule).length
      return { rule, rows: rows.length, left, unmoved: rows.filter((row) => !movedEdges.has(row.edge)).length }
    })
    .filter(({ rows, left, unmoved }) => rows === 0 || left > 0 || unmoved > 0)
}

/**
 * The verdict on one baseline against the PR's merge base. A row may only appear under a rule name
 * this PR **declares in `.dependency-cruiser.cjs`** — that is what tells an armed rule from an
 * absorbed violation, and it is the one thing a reviewer cannot see in a `linguist-generated` diff.
 *
 * Every verdict is a **set** difference. The row count judges nothing (#432): it went on gating the
 * fail/warn split, so "fix one violation and absorb another" stayed flat and warned — and that is
 * not an adversarial case but the ordinary shape of a refactor moving files between layers.
 *
 * "New in this PR" is a claim about the **config**, not about the baseline rows (#432 round 3):
 * declared in the head config, absent from the base config, and `.dependency-cruiser.cjs` among
 * the PR's own changed files. Reading it off the rows instead made every rule with *zero* rows a
 * silent free pass, and every invented rule name one too — measured, with the numbers, in the
 * header of `.dependency-cruiser.cjs`.
 *
 * - `armed` — every added row belongs to a rule name this PR declares, and nothing was removed.
 *   #404's shape (34 → 77, arming `core-through-index`; it touched the config, as any arming must).
 * - `absorbed` — at least one added row belongs to a rule this PR did not declare, whatever the
 *   count did. Flat and falling counts included, and fabricated rule names with them.
 * - `swapped` — rows left *and* arrived, all of them under rule names this PR declares. A rule
 *   armed while violations were fixed looks like this; so does a rule **renamed** in the config to
 *   carry its old rows under a new name. The baseline cannot tell those apart — a genuinely new
 *   rule and a renamed one are the same shape in it — so this warns and points at the config diff,
 *   which the gate now guarantees exists, rather than reading `armed` and passing in silence.
 * - `disarmed` — a rule name the merge base's config declares is gone from this PR's (#489), read
 *   on every PR that edits the config, baseline or not: the edges it checked go unguarded. Only a
 *   rename whose rows all moved to the new name escapes it, as `swapped`; a rule with no rows cannot
 *   be renamed that way, because no row vouches for the new name.
 *
 * The residual, stated rather than left implicit: a rule **declared in the config in this PR** —
 * renamed, duplicated, or widened to cover the edge being hidden — reads `armed` or `swapped`. No
 * comparison of baseline rows can close that, and the fence on it is that the declaration is an
 * added line in a reviewed file, which is what the round-2 hole cost nobody. A rule name inside a
 * **comment** or a **string literal** in the head config reaches `armed` too (measured, #432 round
 * 3). That is not a false-pass path: dependency-cruiser's `knownViolations` matching is
 * rule-name-sensitive, so a row under a name no real rule emits suppresses nothing — a real
 * absorbed row renamed that way still printed `1 new`, exit 1. It leans on the base scan finding
 * every rule `main` declares: a base that scans to no names fails closed (#438), and so does a name
 * read as newly declared that has base rows, which only a missed rule can have (#456). What no name
 * scan sees is a rule that keeps its name while it stops checking — commented out, set to
 * `ignore`, narrowed — or one added in a form the scan cannot read: `lint:layers` fails the first
 * two while the rule has baseline rows (#489); a rule with none is fenced by review alone (#505).
 * @param {{base:string|null, head:string|null, baseConfig?:string|null, headConfig?:string|null, configTouched?:boolean}} contents
 */
export function compareRatchetBaseline({ base, head, baseConfig = null, headConfig = null, configTouched = false }) {
  const parsedBase = parseRatchetBaseline(base)
  const parsedHead = parseRatchetBaseline(head)
  const growth = ' — its growth cannot be checked'
  if (parsedHead.error) return { status: 'unreadable', detail: `\`${RATCHET_BASELINE_FILE}\` ${parsedHead.error}${growth}` }
  if (parsedBase.error) {
    return { status: 'unreadable', detail: `the base copy of \`${RATCHET_BASELINE_FILE}\` ${parsedBase.error}${growth}` }
  }
  const counts = { base: parsedBase.rows.length, head: parsedHead.rows.length }
  const baseKeys = new Set(parsedBase.rows.map(ratchetRowKey))
  const headKeys = new Set(parsedHead.rows.map(ratchetRowKey))
  const added = parsedHead.rows.filter((row) => !baseKeys.has(ratchetRowKey(row)))
  const removed = parsedBase.rows.filter((row) => !headKeys.has(ratchetRowKey(row)))
  // The scan decides a verdict only when rows arrived and the config was edited; then it has to
  // have read something on both sides (#438). A shrink never consults it, so it is never refused.
  const unscanned =
    configTouched && added.length > 0
      ? (unscannedConfig(baseConfig, "the merge base's", 'Trusted, it would read every name in this PR as newly declared and an absorbed row as `armed`') ??
        unscannedConfig(headConfig, "this PR's", "Merged, it would be every later PR's base, where every later arming would fail closed here"))
      : null
  if (unscanned) return { status: 'unreadable', detail: unscanned }
  // The rule names this PR brings into existence. Without a config edit there are none, so every
  // added row is an absorption — which is what a zero-row rule and an invented name both are.
  const baseConfigRules = parseRuleNames(baseConfig)
  const headConfigRules = parseRuleNames(headConfig)
  const declaredHere = configTouched
    ? new Set([...headConfigRules].filter((name) => !baseConfigRules.has(name)))
    : new Set()
  const missed = added.length > 0 ? missedByBaseScan(declaredHere, parsedBase.rows) : null
  if (missed) return { status: 'unreadable', detail: missed }
  // The rules themselves, read on every PR that edits the config — its rows do not have to move (#489).
  const disarmed = configTouched
    ? disarmedRules(baseConfigRules, headConfigRules, declaredHere, parsedBase.rows, parsedHead.rows)
    : []
  if (disarmed.length > 0) return { status: 'disarmed', counts, disarmed }
  const armedRules = [...new Set(added.filter((row) => declaredHere.has(row.rule)).map((row) => row.rule))]
  const absorbed = added.filter((row) => !declaredHere.has(row.rule))
  const status =
    added.length === 0
      ? removed.length > 0
        ? 'shrank'
        : 'unchanged'
      : absorbed.length > 0
        ? 'absorbed'
        : removed.length > 0
          ? 'swapped'
          : 'armed'
  const ruleNames = configTouched ? baseConfigRules.size : undefined
  return { status, counts, added, absorbed, removed, armedRules, ruleNames }
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
  const { status, counts, added, absorbed, removed, armedRules, detail, disarmed, ruleNames } = ratchet
  if (status === 'unreadable') return finding('fail', detail)
  if (status === 'disarmed') {
    const why = ({ rows, left, unmoved }) =>
      rows === 0
        ? 'no baseline rows'
        : left > 0
          ? `${plural(left, 'row')} left behind`
          : `${unmoved === rows ? `${plural(rows, 'row')}, none` : `${unmoved} of ${rows} rows not`} moved to a rule this PR declares`
    const [them, they] = disarmed.length === 1 ? ['it', 'it'] : ['them', 'they']
    return finding(
      'fail',
      `this PR takes ${disarmed.map((entry) => `\`${entry.rule}\` (${why(entry)})`).join(', ')} out of ` +
        `\`${RATCHET_CONFIG_FILE}\`, and its merge base declares ${them} — the edges ${they} checked go unguarded, and a row ` +
        `under a name no rule reports suppresses nothing. Restore ${them} — or, for a rename, move all its rows to the new ` +
        "name in the same PR, which warns as `swapped`. The scan reads only a literal `name: '…'`, so a name written any other way reads as taken out",
    )
  }
  if (status === 'unchanged') {
    const read = ruleNames === undefined ? '' : ` — \`${RATCHET_CONFIG_FILE}\` edited, still declaring all ${plural(ruleNames, 'rule name')} its merge base does`
    return finding('pass', `${counts.head} baseline rows, unchanged${read}`)
  }
  const rules = armedRules.map((rule) => `\`${rule}\``).join(', ')
  // Never "flat" once the rows have changed: the count is the one number this rule does not judge
  // on, and "71 baseline rows, flat" after 72 was a false statement in a required check's output.
  const moved =
    counts.head === counts.base
      ? `${counts.head} baseline rows, count flat`
      : `${counts.base} → ${counts.head} baseline rows`
  if (status === 'shrank') return finding('pass', `${moved} — the ratchet shrank`)
  if (status === 'armed') {
    return finding(
      'pass',
      `${moved}, arming ${rules} (${plural(added.length, 'row')}), declared in \`${RATCHET_CONFIG_FILE}\` by this PR ` +
        '— growth is legitimate when a rule is armed in the same commit',
    )
  }
  if (status === 'swapped') {
    return finding(
      'warn',
      `${moved} — ${plural(removed.length, 'row')} left and ${plural(added.length, 'row')} arrived, all under ${rules}, ` +
        `which this PR declares in \`${RATCHET_CONFIG_FILE}\`. A rule armed while violations were fixed looks like this, ` +
        'and so does a rule **renamed** there to carry its old rows under a new name — the baseline cannot tell them ' +
        'apart, so read those rules in the config diff',
    )
  }
  const what = `${moved} — no new rule armed, ${plural(absorbed.length, 'violation')} absorbed: ${nameRatchetRows(absorbed)}`
  const undeclared = undeclaredRatchetRows(body, absorbed)
  if (undeclared.length === 0) {
    return finding('warn', `${what} — declared: ${ratchetDeclarations(body).map((claim) => `"${claim}"`).join('; ')}`)
  }
  const unnamed = undeclared.length === absorbed.length ? '' : ` — ${nameRatchetRows(undeclared)} still undeclared`
  return finding(
    'fail',
    `${what}${unnamed}. Fix the import, declare a rule in \`${RATCHET_CONFIG_FILE}\` in the same commit, or name every row in the PR body as ` +
      `\`Baseline-growth: ${undeclared[0].rule}: ${undeclared[0].edge} — <why>\``,
  )
}

/**
 * The held-out oracle (#193). Flagged, not gated: a PR that edits it still passes this
 * check, and the finding names the files so the edit cannot be silent. #151 owns the
 * sticky comment and the rest of the protected-path list.
 */
function protectedPath({ files }) {
  const touched = files.map((entry) => entry.filename).filter((name) => isProtectedPath(name))
  if (touched.length === 0) return []
  const shown = touched.slice(0, 8)
  const more = touched.length > shown.length ? ` (+${touched.length - shown.length} more)` : ''
  return [
    {
      rule: 'protected-path',
      level: 'warn',
      message: `protected path touched: ${shown.join(', ')}${more}. conformance/vectors/** is the held-out oracle`,
    },
  ]
}

export const RULES = [sizeBudget, linkedIssue, ratchetGrowth, protectedPath]

/**
 * Run every rule over one PR.
 * @param {{body:string|null, author?:string, labels:string[], files:object[], gitattributes?:string}} input
 * @returns {{verdict:'PASS'|'WARN'|'FAIL', findings:object[], measures:object, linkedIssues:number[], closingIssues:number[], docsOnly:boolean, linkedIssueExemption:string|null}}
 */
export function evaluate({ body, author, labels = [], files, gitattributes, ratchet = null }, rules = RULES) {
  const measures = measure(files, parseGeneratedPatterns(gitattributes))
  // Whether the config was edited is the PR's own file list, never something a caller asserts: a
  // claim of arming has to cost a reviewable line in `.dependency-cruiser.cjs`.
  const configTouched = files.some((entry) => entry.filename === RATCHET_CONFIG_FILE)
  const verdict = ratchet ? compareRatchetBaseline({ ...ratchet, configTouched }) : null
  const findings = rules.flatMap((rule) => rule({ body, author, labels, files, measures, ratchet: verdict }))
  const worst = Math.max(0, ...findings.map((f) => LEVELS.indexOf(f.level)))
  const deletion = deletionWaiver(measures)
  return {
    verdict: LEVELS[worst].toUpperCase(),
    findings,
    measures,
    linkedIssues: findLinkedIssues(body),
    closingIssues: findClosingIssues(body),
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

/** What the links do on merge — `fixes` closes an issue, `part-of` closes none (#485) — or nothing when none is linked. */
function linkKind(result) {
  if (result.linkedIssueExemption || result.linkedIssues.length === 0) return ''
  return result.closingIssues.length > 0 ? ' linked=fixes' : ' linked=part-of'
}

/** One greppable `HYGIENE:` line, then a line per finding. */
export function formatConsole(result) {
  const { reviewable, test, excluded } = result.measures
  const head =
    `HYGIENE: ${result.verdict} reviewable=${reviewable.lines} test=${test.lines} ` +
    `excluded=${excluded.lines} files=${reviewable.files.length} issue=${issueLabel(result)}${linkKind(result)}` +
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
