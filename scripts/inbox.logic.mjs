// The inboxes as data, and the review issues the inbox panel (#778) or, for JDG, the judge (#963) decides them through.

export const INBOXES = [
  { prefix: 'FID', file: 'docs/harness/fidelity-inbox.md' },
  { prefix: 'HRN', file: 'docs/harness/harness-inbox.md' },
  { prefix: 'PRD', file: 'docs/harness/product-inbox.md' },
  { prefix: 'JDG', file: 'docs/harness/judge-inbox.md' },
]
export const REVIEW_LABELS = ['inbox-review', 'agent-ready', 'risk:0', 'project:upkeep']
export const JUDGE_LABELS = ['judge-review', 'agent-ready', 'risk:0', 'project:harness']
/** `gh issue list --limit` for the dedupe read: a list this long may be cut short, so queue refuses it. */
export const REVIEW_LIST_LIMIT = 1000

export class InboxError extends Error {}

const STATUS_LINE = /^(- \*\*Status:\*\* )(.*?)(\r?)$/
const OPENING_FENCE = /^ {0,3}(`{3,}|~{3,})/
const CLOSING_FENCE = /^ {0,3}(`{3,}|~{3,})\s*$/
const keywordOf = (status) => /^[a-z]+/.exec(status)?.[0] ?? ''
const TEXT = '[^\\r\\n]*\\S[^\\r\\n]*'

/** A grammar form such as `declined (<reason>)` or `filed (#n)` as a whole-value pattern, then `tail`. */
function formPattern(form, tail = '') {
  const parts = form.split(/(<[^>]+>|#n)/).map((part) =>
    part.startsWith('<') ? TEXT : part === '#n' ? '#[1-9]\\d*' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`^${parts.join('')}${tail}$`)
}

// A filed, declined or deferred status may follow its form with `, <note>`, as in `filed (#378), closed by PR #740`;
// `set` writes the bare form.
const TAKES_A_NOTE = new Set(['filed', 'declined', 'deferred'])
const fitsGrammar = (status, grammar) =>
  grammar.some((form) => formPattern(form, TAKES_A_NOTE.has(keywordOf(form)) ? `(?:, ${TEXT})?` : '').test(status))

/** Each line, and whether it sits in a fenced block: the template quoted under "Entry format" is not an entry. */
function scanLines(text) {
  let fence = null
  return text.split('\n').map((raw, index) => {
    const inFence = fence !== null || OPENING_FENCE.test(raw)
    if (fence === null) fence = OPENING_FENCE.exec(raw)?.[1] ?? null
    else if (CLOSING_FENCE.exec(raw)?.[1].startsWith(fence)) fence = null
    return { raw, number: index + 1, inFence }
  })
}

/** The inbox's status grammar (its template's `**Status:**` forms) and its entries; a malformed entry throws. */
export function parseInbox(text, inbox) {
  const lines = scanLines(text)
  const formatAt = lines.findIndex((line) => !line.inFence && /^## Entry format\s*$/.test(line.raw))
  const template = formatAt === -1 ? undefined : lines.slice(formatAt).find((line) => line.inFence && STATUS_LINE.test(line.raw))
  if (!template) throw new InboxError(`${inbox.file}: no **Status:** line in the "Entry format" template`)
  const grammar = STATUS_LINE.exec(template.raw)[2].split(' | ').map((form) => form.trim())
  const heading = new RegExp(`^### (${inbox.prefix}-\\d+) · (.+?)\\r?$`)
  const entries = []
  let current = null
  for (const line of lines.filter((candidate) => !candidate.inFence)) {
    const match = heading.exec(line.raw)
    if (match) entries.push(current = { id: match[1], title: match[2], status: null, file: inbox.file, line: line.number, statusLine: null })
    else if (/^#{1,3} /.test(line.raw)) current = null
    else if (current?.status === null && STATUS_LINE.test(line.raw)) {
      Object.assign(current, { status: STATUS_LINE.exec(line.raw)[2], statusLine: line.number })
    }
  }
  entries.forEach((entry, i) => {
    if (entry.status === null) throw new InboxError(`${inbox.file}:${entry.line}: ${entry.id} has no **Status:** line`)
    if (entries.findIndex((other) => other.id === entry.id) !== i) throw new InboxError(`${inbox.file}:${entry.line}: ${entry.id} is used twice`)
  })
  return { ...inbox, grammar, entries }
}

/** The inboxes, or an InboxError naming every entry, in every inbox, whose status is outside its file's grammar. */
export function assertGrammar(inboxes) {
  const lines = inboxes.flatMap(({ file, grammar, entries }) => entries.filter((entry) => !fitsGrammar(entry.status, grammar))
    .map((entry) => `${file}:${entry.statusLine}: ${entry.id} has ${JSON.stringify(entry.status)}, outside ${grammar.join(' | ')}`))
  if (lines.length === 0) return inboxes
  throw new InboxError([`${lines.length} status line(s) outside their file's grammar; nothing done:`, ...lines].join('\n'))
}

/** Every entry, or those whose status starts with `status` (`proposed`, `deferred`, …). */
export function listEntries(inboxes, { status } = {}) {
  const entries = assertGrammar(inboxes).flatMap((inbox) => inbox.entries)
  if (status === undefined) return entries
  const known = [...new Set(inboxes.flatMap((inbox) => inbox.grammar.map(keywordOf)))]
  if (!known.includes(status)) throw new InboxError(`'${status}' is not a status any inbox names (${known.join(', ')})`)
  return entries.filter((entry) => keywordOf(entry.status) === status)
}

export const formatEntries = (entries) =>
  entries.map((entry) => [entry.id, entry.status, `${entry.file}:${entry.line}`, entry.title].join('\t')).join('\n')

/** The entry's status; with `not`, exit code 1 while the status still starts with it. */
export function entryStatus(inboxes, id, { not } = {}) {
  const inbox = assertGrammar(inboxes).find((candidate) => candidate.entries.some((entry) => entry.id === id))
  if (!inbox) throw new InboxError(`no inbox has an entry ${id}`)
  if (not !== undefined && !inbox.grammar.map(keywordOf).includes(not)) {
    throw new InboxError(`'${not}' is not a status in ${inbox.file}'s grammar: ${inbox.grammar.join(' | ')}`)
  }
  const { status } = inbox.entries.find((entry) => entry.id === id)
  return { exitCode: not !== undefined && keywordOf(status) === not ? 1 : 0, stdout: status }
}

/**
 * `text` with only `id`'s `**Status:**` line rewritten to `value`, which must fit the file's own grammar.
 * Refuses while another entry's status is outside it; setting an entry that is outside it repairs that entry.
 */
export function setStatus(text, inbox, id, value) {
  const parsed = parseInbox(text, inbox)
  const { grammar, entries } = parsed
  const entry = entries.find((candidate) => candidate.id === id)
  if (!entry) throw new InboxError(`${inbox.file} has no entry ${id}`)
  if (!grammar.some((form) => formPattern(form).test(value))) {
    throw new InboxError(`${JSON.stringify(value)} is outside ${inbox.file}'s status grammar: ${grammar.join(' | ')}`)
  }
  if (fitsGrammar(entry.status, grammar)) assertGrammar([parsed])
  const lines = text.split('\n')
  lines[entry.statusLine - 1] = lines[entry.statusLine - 1].replace(STATUS_LINE, (_line, prefix, _old, cr) => `${prefix}${value}${cr}`)
  return lines.join('\n')
}

/** The entry ids that issues already review: each body line `Inbox-entry: <id>`. */
export const reviewedIds = (issues) =>
  new Set(issues.flatMap((issue) => [...String(issue.body ?? '').matchAll(/^Inbox-entry: *(\S+?)\s*$/gm)].map((match) => match[1])))

const PANEL = {
  title: 'Inbox review',
  labels: REVIEW_LABELS,
  decides: 'The inbox panel decides',
  method: 'approved, declined or deferred, by the method in `docs/harness/inbox-panel-brief.md`',
  verdict: 'One panel verdict comment on this issue, headed `## Inbox panel: APPROVED | DECLINED | DEFERRED`: one line per reviewer\'s position',
  statuses: '`filed (#n)` once approved and filed',
  scope: 'In: the review, the verdict and the status line. Out: building what the entry proposes, which an approval files as its own issue.',
}
const JUDGE = {
  title: 'Judge review',
  labels: JUDGE_LABELS,
  decides: 'The judge decides',
  method: 'on the owner\'s behalf, by the method in `docs/harness/judge-brief.md`',
  verdict: 'One judge comment on this issue, headed `## Judge: DECIDED <option> | DEFERRED (<checkable condition>)`: both reviewers\' positions',
  statuses: '`filed (#n)` for the issue that carries the decision out, `decided (<decision>), owner action: <what>` when only the owner\'s hand can',
  scope: 'In: the reviews, the decision, the status line, and the issues or labels the decision needs. Out: building what it decides, which is filed as its own issue.',
}
const reviewerOf = (prefix) => (prefix === 'JDG' ? JUDGE : PANEL)

/** The review issue for one entry, in the agent-ready issue form (docs/harness/issue-form.md). */
export function reviewIssue({ id, title, file }) {
  const reviewer = reviewerOf(id.split('-')[0])
  const body = `## Goal
${reviewer.decides} ${id} in \`${file}\`: ${reviewer.method}. Nothing waits for the owner, who may override the status at any time.

## Acceptance criteria
- ${reviewer.verdict}, the reason, the findings it accepted, and \`Verified on:\`.
- The status is set with \`node scripts/inbox.mjs set ${id} <status>\`: ${reviewer.statuses}, otherwise the reason and this issue.

## Verification command
\`node scripts/inbox.mjs status ${id} --not proposed\`

## Scope
${reviewer.scope}

## Files likely touched
\`${file}\`

## Risk
\`risk:0\`: one status line in an inbox.

## Blocked by
—

Inbox-entry: ${id}`
  return { id, title: `${reviewer.title}: ${id} · ${title}`, labels: [...reviewer.labels], body }
}

/**
 * Files a review issue for each proposed entry no issue reviews yet, open or closed; one line per issue.
 * `listReviewIssues(label)` is read once per review label the inboxes use, and an entry is reviewed if any list holds it.
 */
export function queueReviews(inboxes, { listReviewIssues, fileIssue, dryRun = false }) {
  const proposed = listEntries(inboxes, { status: 'proposed' })
  const labels = [...new Set(inboxes.map((inbox) => reviewerOf(inbox.prefix).labels[0]))]
  const issues = labels.flatMap((label) => {
    const listed = listReviewIssues(label)
    if (listed.length < REVIEW_LIST_LIMIT) return listed
    throw new InboxError(`gh listed ${listed.length} ${label} issues, its limit, so some may be missing; nothing filed`)
  })
  const reviewed = reviewedIds(issues)
  const lines = []
  for (const draft of proposed.filter((entry) => !reviewed.has(entry.id)).map(reviewIssue)) {
    try {
      lines.push(dryRun ? `would file: ${draft.title}` : `filed ${fileIssue(draft)}: ${draft.title}`)
    } catch (error) {
      throw new InboxError([...lines, `gh failed filing the review of ${draft.id}: ${error.message}`].join('\n'))
    }
  }
  return lines
}
