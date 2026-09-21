// Pure logic for the cursor-agent second opinion (#296). No I/O — unit tested in
// second-opinion.logic.test.mjs; the runner lives in second-opinion.mjs. Every constant here was
// verified on the owner's machine on 2026-09-19 and is recorded in docs/harness/cursor-lane.md.

export const DEFAULT_MODEL = 'composer-2.5'
export const TIMEOUT_MS = 900_000
export const KILL_GRACE_MS = 5_000
export const AUDIT_FILE = 'hacer-lane-runs/second-opinion.jsonl'

/** Distinct codes: a "could not look" path must never be mistaken for a clean review, and a run the
 *  daily ration refused (7, #302) must never be mistaken for either — it is a skip, not a failure. */
export const EXIT = { ok: 0, failed: 1, usage: 2, refusedFlag: 3, timeout: 4, dirty: 5, unverified: 6, rationSpent: 7 }

// ---------------------------------------------------------------- read-only (cursor-lane.md §1.2)

/** Deny rules beat `unrestricted` (trial run 5) — which is what the owner's own
 * ~/.cursor/cli-config.json is set to, so leaving `--force` off does *not* make a run read-only. */
export const DENY_RULES = ['Shell(*)', 'Write(**)', 'Write(/**)', 'WebFetch(*)', 'Mcp(*:*)']

/** The checkout's `.cursor/cli.json` — layer 2, the one a PR could otherwise supply itself. Takes the
 * permissions block *only*: given the whole reviewerConfig() the CLI dies with "Unrecognized key(s)
 * in object: 'version', 'editor', 'approvalMode', …" before it ever calls a model. */
export const checkoutConfig = () => ({ permissions: { allow: [], deny: [...DENY_RULES] } })

/** Layer 1 — written to CURSOR_CONFIG_DIR/cli-config.json, the shape of ~/.cursor/cli-config.json. */
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

/** The diff is data, not instructions: a closing tag inside it would otherwise let the PR end the
 * fence and write its own orders. The rubric comes from origin/main, never from the PR. */
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
 * UNPARSED, so the coordinator sees that rather than a verdict that was never actually read.
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

/** One lane review, measured on #305 (2026-09-21): 347,838 tokens, ≈$0.10 at list price, 170 s, 84%
 *  cache reads. Also what a killed run is charged, because unknown is never zero. */
export const MEASURED_REVIEW_TOKENS = 347_838

/** How a row's tokens were arrived at. `measured` is the CLI's own meter; `estimated` is a run killed
 *  before the `result` frame that carries usage — the TIMEOUT_MS / KILL_GRACE_MS / SIGKILL path — so
 *  it generated, was paid for, and nothing measured it, and reading that as {0,0,0,0} would let every
 *  timeout escape the ration while the included pool drained; `none` never reached a model at all (a
 *  rejected config), which is genuinely free.
 *  @returns {{source:'measured'|'estimated'|'none', charged:number, note:string|null}} */
export function usageAccounting({ usage, reachedModel } = {}) {
  const measured = totalTokens(usage)
  if (measured > 0) return { source: 'measured', charged: measured, note: null }
  if (!reachedModel) return { source: 'none', charged: 0, note: null }
  return { source: 'estimated', charged: MEASURED_REVIEW_TOKENS, note: 'killed before the result frame that carries usage; charged at the measured per-review estimate' }
}

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
  const parse = (line) => {
    try {
      const value = JSON.parse(line)
      return value && typeof value === 'object' ? [value] : []
    } catch {
      return [] // progress noise and the half line a killed run leaves behind
    }
  }
  const frames = String(stdout ?? '').split('\n').flatMap(parse)
  const result = frames.findLast((f) => f.type === 'result') ?? null
  const final = typeof result?.result === 'string' ? result.result : ''
  const text = final.trim() ? final : frames.filter((f) => f.type === 'assistant').map(assistantText).join('')
  // An assistant frame means the model generated — and was paid — whatever happened next; a killed
  // run leaves those and no `result`, the only frame that reports usage.
  const reachedModel = frames.some((f) => f.type === 'assistant') || Boolean(final.trim())
  return { frames, result, text, usage: normaliseUsage(result?.usage), model: resolvedModel(result), reachedModel }
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

/** Which card priced a run: the resolved model's, else the requested one's, else none. The CLI
 * resolves an id to a variant, so without the fallback every line is unpriced — but a *Fast* variant
 * costs up to 4.8× the standard card, hence `cost.pricedAs` saying which card was used. */
export const pricingModel = (resolved, requested) => [resolved, requested].find((m) => ratesFor(m)) ?? null
export const ratesForRun = (resolved, requested) => ratesFor(pricingModel(resolved, requested))

export function costOf(usage, rates) {
  if (!rates) return null
  const u = normaliseUsage(usage)
  const per = (tokens, rate) => (tokens / 1e6) * rate
  return per(u.inputTokens, rates.input) + per(u.cacheReadTokens, rates.cacheRead) + per(u.cacheWriteTokens, rates.cacheWrite) + per(u.outputTokens, rates.output)
}

// ---------------------------------------------------------------- delivery and reporting

const statusLines = (status) => status.split('\n').map((l) => l.trimEnd()).filter(Boolean)
const pathOf = (line) => line.slice(3).split(' -> ').at(-1)

/**
 * Did the run change the throwaway worktree at all? A clean exit is not evidence. Both directions
 * count: a *vanished* line means the run deleted an untracked file or restored a tracked one — a
 * stub that only ran `rm -f .cursor/cli.json` used to pass. `unknown` never reports success.
 * @returns {{state:'clean'|'dirty'|'unknown', changed:string[], reason:string|null}}
 */
export function assessDelivery({ before, after, error } = {}) {
  if (error || typeof before !== 'string' || typeof after !== 'string') {
    return { state: 'unknown', changed: [], reason: error ? String(error) : 'git status was not read both before and after the run' }
  }
  const was = new Set(statusLines(before))
  const now = new Set(statusLines(after))
  const added = [...now].filter((line) => !was.has(line))
  const gone = [...was].filter((line) => !now.has(line))
  const changed = [...new Set([...added, ...gone].map(pathOf))]
  return { state: changed.length > 0 ? 'dirty' : 'clean', changed, reason: null }
}

/** One JSON line per run for .git/hacer-lane-runs/ — what the daily Cursor ration is measured from. */
export function auditLine({ at, pr, requestedModel, resolvedModel: resolved, usage, reachedModel, wallMs, exitCode, verdict }) {
  const cost = costOf(usage, ratesForRun(resolved, requestedModel))
  const { source, charged, note } = usageAccounting({ usage, reachedModel })
  const record = {
    at: at ?? new Date().toISOString(),
    pr,
    requestedModel,
    resolvedModel: resolved ?? null,
    usage: normaliseUsage(usage),
    usageSource: source,
    chargedTokens: charged,
    ...(note ? { usageNote: note } : {}),
    wallMs,
    exitCode,
    verdict,
    // Unknown cost stays unknown (README, Measurement rules): an estimated run has no measured split.
    cost: { usd: source === 'estimated' || cost === null ? null : Number(cost.toFixed(4)), currency: 'USD', pricedAs: pricingModel(resolved, requestedModel), note: 'list price, not a bill' },
  }
  return JSON.stringify(record) + '\n'
}

/** The one greppable line the coordinator reads. A token count that was not measured says so. */
export function formatSummaryLine({ pr, model, verdict, wallMs, tokens, cost, usageSource }) {
  const dollars = typeof cost === 'number' ? `$${cost.toFixed(2)}` : '$?'
  const counted = usageSource && usageSource !== 'measured' ? `tokens≈${tokens} (${usageSource})` : `tokens=${tokens}`
  return `SECOND-OPINION: pr=${pr} model=${model} verdict=${verdict} wall=${Math.round(wallMs / 1000)}s ${counted} cost≈${dollars}`
}
