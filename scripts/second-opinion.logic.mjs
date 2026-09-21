// Pure logic for the cursor-agent second opinion (#296). No I/O — unit tested in
// second-opinion.logic.test.mjs; the runner lives in second-opinion.mjs. Every constant here was
// verified on the owner's machine on 2026-09-19 and is recorded in docs/harness/cursor-lane.md.

export const DEFAULT_MODEL = 'composer-2.5'
export const TIMEOUT_MS = 900_000
export const KILL_GRACE_MS = 5_000
export const AUDIT_FILE = 'hacer-lane-runs/second-opinion.jsonl'

/** Distinct codes: a "could not look" path must never be mistaken for a clean review. */
export const EXIT = { ok: 0, failed: 1, usage: 2, refusedFlag: 3, timeout: 4, dirty: 5, unverified: 6 }

// ---------------------------------------------------------------- read-only (cursor-lane.md §1.2)

/**
 * Deny rules beat `unrestricted` (trial run 5), which is what the owner's own
 * ~/.cursor/cli-config.json is set to — so leaving `--force` off does *not* make a run read-only.
 */
export const DENY_RULES = ['Shell(*)', 'Write(**)', 'Write(/**)', 'WebFetch(*)', 'Mcp(*:*)']

/** Written to both CURSOR_CONFIG_DIR/cli-config.json and the checkout's .cursor/cli.json. */
export function reviewerConfig() {
  return {
    version: 1,
    editor: { vimMode: false },
    approvalMode: 'allowlist',
    permissions: { allow: [], deny: [...DENY_RULES] },
    autoAcceptWebSearch: false,
    attribution: { attributeCommitsToAgent: false, attributePRsToAgent: false },
  }
}

export const REFUSED_FLAGS = ['--force', '-f', '--yolo', '--approve-mcps']

/** Flags in `args` that would let the run write; the runner refuses to start when any is present. */
export function refusedFlags(args) {
  return (args ?? []).flatMap((arg) => {
    const name = String(arg).split('=')[0]
    return REFUSED_FLAGS.includes(name) ? [name] : []
  })
}

/** The headless invocation verified in §1.1. `-p` still has write tools; the config denies them. */
export function cursorArgs({ model = DEFAULT_MODEL, prompt }) {
  return ['-p', '--trust', '--output-format', 'stream-json', '--model', model, prompt]
}

// ---------------------------------------------------------------- the prompt

export const DIFF_TAG = 'untrusted-pr-diff'
const CLOSING_TAG = new RegExp(`<\\s*/\\s*${DIFF_TAG}\\s*>`, 'gi')

/**
 * The diff is data, not instructions, so a closing tag inside it would otherwise let the PR end the
 * fence and write its own orders. The rubric comes from origin/main — never from the PR under review.
 */
export function buildPrompt({ rubric, criteria, diff }) {
  return [
    String(rubric ?? '').trim(),
    '',
    'ACCEPTANCE CRITERIA (from the linked issue, not from the PR):',
    String(criteria ?? '').trim() || '(none linked)',
    '',
    `<${DIFF_TAG}>`,
    String(diff ?? '').replace(CLOSING_TAG, `[closing ${DIFF_TAG} tag removed]`),
    `</${DIFF_TAG}>`,
    '',
    'Answer in the shape above and nothing else.',
  ].join('\n')
}

// ---------------------------------------------------------------- the answer

const HEADER = /^(VERDICT|BLOCKERS|NITS)\b\s*(?:\([^)\n]*\))?\s*:\**\s*(.*)$/i
const NOTHING = /^(none|n\/a|nothing|-)\.?$/i

/**
 * The rubric asks for `VERDICT: PASS|BLOCK`, then `BLOCKERS:` and `NITS:` lists. Anything else is
 * UNPARSED — the coordinator sees that rather than a verdict this never read.
 * @returns {{verdict:'PASS'|'BLOCK'|'UNPARSED', blockers:string[], nits:string[]}}
 */
export function parseReview(text) {
  const out = { verdict: 'UNPARSED', blockers: [], nits: [] }
  let section = null
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.trim().replace(/^[*_#>\s]+/, '')
    const header = HEADER.exec(line)
    if (header) section = header[1].toUpperCase()
    const rest = header ? header[2].trim() : line
    if (section === 'VERDICT') {
      const found = /\b(BLOCK|PASS)\b/i.exec(rest)
      if (found && out.verdict === 'UNPARSED') out.verdict = found[1].toUpperCase()
      continue
    }
    const item = rest.replace(/^(?:[-*•]|\d+[.)])\s*/, '').trim()
    if (!section || !item || NOTHING.test(item)) continue
    ;(section === 'BLOCKERS' ? out.blockers : out.nits).push(item)
  }
  return out
}

/** The §1.5 rubric, taken from a cursor-lane.md read out of origin/main. Null when it moved. */
export function extractRubric(markdown) {
  const after = String(markdown ?? '').split(/^###\s+1\.5\b[^\n]*$/m)[1]
  const block = after && /```[a-z]*\n([\s\S]*?)\n```/.exec(after)
  return block ? block[1].trim() : null
}

// ---------------------------------------------------------------- the stream-json run

const num = (value) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0)

const normaliseUsage = (usage) => ({
  inputTokens: num(usage?.inputTokens),
  cacheReadTokens: num(usage?.cacheReadTokens),
  cacheWriteTokens: num(usage?.cacheWriteTokens),
  outputTokens: num(usage?.outputTokens),
})

export const totalTokens = (usage) => Object.values(normaliseUsage(usage)).reduce((a, b) => a + b, 0)

const assistantText = (frame) => {
  const content = frame?.message?.content ?? frame?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('')
  return typeof frame?.text === 'string' ? frame.text : ''
}

/** The CLI resolves `auto` and aliases, so the audit line records what actually ran, not what we asked for. */
const resolvedModel = (result) =>
  ['model', 'modelId', 'selectedModel'].map((key) => result?.[key]).find((v) => typeof v === 'string' && v) ?? null

/**
 * NDJSON from `--output-format stream-json`: `system`, `tool_call`, `assistant`, `result`. The
 * `result` frame also carries `usage`, which the documented schema omits (§1.1, verified).
 * @returns {{frames:object[], result:object|null, text:string, usage:object, model:string|null}}
 */
export function readStream(stdout) {
  const frames = String(stdout ?? '')
    .split('\n')
    .flatMap((line) => {
      try {
        const value = JSON.parse(line)
        return value && typeof value === 'object' ? [value] : []
      } catch {
        return []
      }
    })
  const result = frames.findLast((f) => f.type === 'result') ?? null
  const final = typeof result?.result === 'string' ? result.result : ''
  const text = final.trim() ? final : frames.filter((f) => f.type === 'assistant').map(assistantText).join('')
  return { frames, result, text, usage: normaliseUsage(result?.usage), model: resolvedModel(result) }
}

// ---------------------------------------------------------------- cost (list price, not a bill)

/** $ per million tokens, from §1.3. Cursor publishes no cache-write rate for its own pool, so
 * those are priced at the input rate — the audit line says "list price, not a bill" for this reason. */
export const MODEL_RATES = {
  'composer-2.5': { input: 0.5, cacheRead: 0.2, cacheWrite: 0.5, output: 2.5 },
  'cursor-grok-4.6-high': { input: 2, cacheRead: 0.5, cacheWrite: 2, output: 6 },
  'gpt-5.6-sol-high': { input: 4, cacheRead: 0.4, cacheWrite: 5, output: 20 },
}

/** Null for an unpriced model — better a visible gap than a run that looks free. */
export const ratesFor = (model) => MODEL_RATES[model] ?? null

/** The CLI resolves a model id to a variant name, so fall back to the card we asked for. */
export const ratesForRun = (resolved, requested) => ratesFor(resolved) ?? ratesFor(requested)

export function costOf(usage, rates) {
  if (!rates) return null
  const u = normaliseUsage(usage)
  const per = (tokens, rate) => (tokens / 1e6) * rate
  return (
    per(u.inputTokens, rates.input) +
    per(u.cacheReadTokens, rates.cacheRead) +
    per(u.cacheWriteTokens, rates.cacheWrite) +
    per(u.outputTokens, rates.output)
  )
}

// ---------------------------------------------------------------- delivery and reporting

const statusLines = (status) => status.split('\n').map((l) => l.trimEnd()).filter(Boolean)
const pathOf = (line) => line.slice(3).split(' -> ').at(-1)

/**
 * Did the run leave anything behind in the throwaway worktree? A clean exit is not evidence.
 * `unknown` — git status could not be read — is its own state and never reports success.
 * @returns {{state:'clean'|'dirty'|'unknown', changed:string[], reason:string|null}}
 */
export function assessDelivery({ before, after, error } = {}) {
  if (error || typeof before !== 'string' || typeof after !== 'string') {
    return { state: 'unknown', changed: [], reason: error ? String(error) : 'git status was not read both before and after the run' }
  }
  const baseline = new Set(statusLines(before))
  const changed = statusLines(after).filter((line) => !baseline.has(line)).map(pathOf)
  return { state: changed.length > 0 ? 'dirty' : 'clean', changed, reason: null }
}

/** One JSON line per run for .git/hacer-lane-runs/ — what the daily Cursor ration is measured from. */
export function auditLine({ at, pr, requestedModel, resolvedModel: resolved, usage, wallMs, exitCode, verdict }) {
  const cost = costOf(usage, ratesForRun(resolved, requestedModel))
  return (
    JSON.stringify({
      at: at ?? new Date().toISOString(),
      pr,
      requestedModel,
      resolvedModel: resolved ?? null,
      usage: normaliseUsage(usage),
      wallMs,
      exitCode,
      verdict,
      cost: { usd: cost === null ? null : Number(cost.toFixed(4)), currency: 'USD', note: 'list price, not a bill' },
    }) + '\n'
  )
}

/** The one greppable line the coordinator reads. */
export function formatSummaryLine({ pr, model, verdict, wallMs, tokens, cost }) {
  const dollars = typeof cost === 'number' ? `$${cost.toFixed(2)}` : '$?'
  return `SECOND-OPINION: pr=${pr} model=${model} verdict=${verdict} wall=${Math.round(wallMs / 1000)}s tokens=${tokens} cost≈${dollars}`
}
