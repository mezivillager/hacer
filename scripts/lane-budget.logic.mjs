// Pure logic for the daily Cursor ration (#302). No I/O — unit tested in lane-budget.logic.test.mjs;
// the report lives in lane-budget.mjs and the guarded call site in second-opinion.mjs.
//
// The ration is in TOKENS, not dollars. Read in a browser on 2026-09-21: cursor.com/dashboard/usage
// (Pro+) reports tokens per event, each row typed "Included in Pro Plus", with a zero on-demand
// total, and publishes no weekly quota meter and no dollar pool — so "% of weekly" has no denominator
// and nothing here invents one. Policy and re-read instructions: docs/harness/usage-rationing.md.

import { MEASURED_REVIEW_TOKENS, totalTokens } from './second-opinion.logic.mjs'

/** One measured review, and what a killed run is charged. Defined with the lane that measured it, so
 *  the audit row and the ration can never drift apart. */
export { MEASURED_REVIEW_TOKENS }

/** 43.6M included tokens over Sep 15–21 ÷ 7 days ≈ 6.23M, rounded down. Measured, not assumed. */
export const DEFAULT_DAY_TOKENS = 6_000_000

/** No single day may take more than two rations, however the budget is configured: the 2026-09-21
 *  research burst spent ~17M tokens in 40 minutes — three days of even use — and is what this stops. */
export const BURST_CEILING_TOKENS = 12_000_000

/** How long a dashboard reading stays good (no supported API exposes those numbers, so the guard is
 *  only as fresh as the last read), and the window `spentThisWeek` reports — a rate, not a limit. */
export const OBSERVATION_MAX_AGE_DAYS = 7
export const WEEK_DAYS = 7

/** Where the dashboard reading is kept: in the repo, so every re-read is a reviewable commit. */
export const OBSERVATION_FILE = 'docs/harness/cursor-usage.json'

const NUM = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

// prettier-ignore
const parseJson = (text) => { try { return JSON.parse(String(text ?? '')) } catch { return null } }

/** Local midnight shifted by whole days — `setDate`, never arithmetic on milliseconds, so a DST
 *  change cannot move the window. Day boundaries are the machine's, never UTC's. */
const shiftDays = (value, days) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}

/** `YYYY-MM-DD` as a *local* date: `Date.parse` would make it UTC midnight, the day before in every
 *  negative offset. */
const readDate = (value) => {
  const bare = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''))
  return bare ? new Date(+bare[1], +bare[2] - 1, +bare[3]) : new Date(String(value ?? ''))
}

// ---------------------------------------------------------------- the audit file

/** One row per line, in the shape `auditLine()` writes. A malformed line is skipped and counted,
 *  never fatal: the file is append-only and a killed run can leave half a line behind.
 *  @returns {{rows:object[], skipped:number}} */
export function parseAudit(lines) {
  const text = Array.isArray(lines) ? lines.join('\n') : String(lines ?? '')
  const rows = []
  let skipped = 0
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    const row = parseJson(line)
    if (!row || typeof row !== 'object' || Number.isNaN(Date.parse(row.at))) skipped += 1
    else rows.push(row)
  }
  return { rows, skipped }
}

/** Which model a row is keyed on. `resolvedModel` is null for this lane (verified on the first live
 *  run: the result frame carries no model id), so spend is normally keyed on the *requested* id —
 *  which `source` records rather than hides. */
export const modelOf = (row) =>
  row?.resolvedModel ? { model: row.resolvedModel, source: 'resolved' } : { model: row?.requestedModel ?? null, source: 'requested' }

/** What the day is charged for a row: the figure the row recorded (`usageAccounting` — the CLI's
 *  meter, or the estimate a run killed before its usage frame is charged), falling back to the raw
 *  tuple for rows written before that field existed. Unknown is never zero. */
export const chargedTokens = (row) =>
  Number.isFinite(row?.chargedTokens) && row.chargedTokens > 0 ? row.chargedTokens : totalTokens(row?.usage)

/** Tokens are the ration; dollars ride along for comparison. A row charged nothing never reached a
 *  model (a rejected config is free) and is counted apart — but the filter is what the run was
 *  charged, never the exit code: EXIT.unverified also covers a git-status check that failed long
 *  after the model was paid. */
function summarise(rows, skipped) {
  const out = { tokens: 0, runs: 0, freeRuns: 0, skipped, unpriced: 0, usd: 0, models: {} }
  for (const row of rows) {
    const tokens = chargedTokens(row)
    const { model, source } = modelOf(row)
    out.tokens += tokens
    out.runs += 1
    if (tokens === 0) out.freeRuns += 1
    if (typeof row.cost?.usd === 'number') out.usd += row.cost.usd
    else out.unpriced += 1
    const seen = (out.models[model] ??= { tokens: 0, runs: 0, source })
    seen.tokens += tokens
    seen.runs += 1
    if (seen.source !== source) seen.source = 'mixed'
  }
  return out
}

const windowed = (lines, from, until) => {
  const { rows, skipped } = parseAudit(lines)
  const at = (row) => new Date(row.at).getTime()
  return summarise(rows.filter((row) => at(row) >= from.getTime() && at(row) < until.getTime()), skipped)
}

/** Local midnight to local midnight: the owner's day is the machine's day. */
export const spentToday = (lines, now = new Date()) => windowed(lines, shiftDays(now, 0), shiftDays(now, 1))

/** The trailing seven local days, today included. */
export const spentThisWeek = (lines, now = new Date()) => windowed(lines, shiftDays(now, 1 - WEEK_DAYS), shiftDays(now, 1))

// ---------------------------------------------------------------- the ration

/** The day's budget, from a configured value or the default, never above the burst ceiling. */
export function resolveDayBudget(raw) {
  const value = typeof raw === 'string' ? Number(raw.trim()) : raw
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return { tokens: DEFAULT_DAY_TOKENS, source: 'default', clamped: false }
  return { tokens: Math.min(value, BURST_CEILING_TOKENS), source: 'configured', clamped: value > BURST_CEILING_TOKENS }
}

/** The last dashboard reading. One without an on-demand figure is not a reading: the "Included"
 *  label is the guard, and a guard may not be assumed. */
export function parseObservation(text) {
  const value = parseJson(text)
  if (!value || typeof value !== 'object') return null
  if (typeof value.onDemandUsd !== 'number' || Number.isNaN(readDate(value.readAt).getTime())) return null
  return { ...value }
}

const ageInDays = (observation, now) => Math.round((shiftDays(now, 0) - shiftDays(readDate(observation.readAt), 0)) / 86_400_000)

/** May one more lane run start? Checked in this order, because a spill into on-demand billing matters
 *  whatever the day has spent, and an unconfirmed reading is not a guard at all.
 *  @returns {{allowed:boolean, code:string, reason:string, remaining:number}} */
export function mayRun({ dayBudget = DEFAULT_DAY_TOKENS, spent, estimate = MEASURED_REVIEW_TOKENS, observation = null, now = new Date() } = {}) {
  const used = spent?.tokens ?? 0
  const remaining = Math.max(0, dayBudget - used)
  const refuse = (code, reason) => ({ allowed: false, code, reason, remaining })

  if (!observation) return refuse('unconfirmed', `no Cursor dashboard reading on file (${OBSERVATION_FILE}) — included usage cannot be confirmed`)
  const age = ageInDays(observation, now)
  // A future date gives a negative age, which never exceeds the limit below, so one mistyped year in
  // a hand-entered reading would disable the staleness guard for good. A day of slack absorbs clock
  // and timezone differences.
  if (age < -1) return refuse('future', `the dashboard reading is dated ${observation.readAt}, in the future — re-read the dashboard and correct the date`)
  if (age > OBSERVATION_MAX_AGE_DAYS) return refuse('unconfirmed', `the dashboard reading is ${age} days old (limit ${OBSERVATION_MAX_AGE_DAYS}) — re-read it before the lane runs again`)
  if (observation.onDemandUsd > 0) {
    return refuse('on-demand', `the dashboard read on ${observation.readAt} shows $${observation.onDemandUsd} of on-demand usage — the lane stops until the owner clears it`)
  }
  if (used + estimate > dayBudget) {
    return refuse('spent', `today's ration is spent: ${NUM(used)} of ${NUM(dayBudget)} tokens used, and one more review needs about ${NUM(estimate)}`)
  }
  const reason = `${NUM(used)} of ${NUM(dayBudget)} tokens used today; about ${Math.floor(remaining / estimate)} more review(s) fit`
  return { allowed: true, code: 'ok', reason, remaining }
}

/** The whole picture from the two raw files. Both runners call this — the CLI to print it,
 *  second-opinion.mjs to decide whether to spawn at all. */
export function laneStatus({ audit, observation, now = new Date(), dayBudget, estimate = MEASURED_REVIEW_TOKENS } = {}) {
  const budget = resolveDayBudget(dayBudget)
  const day = spentToday(audit, now)
  const week = spentThisWeek(audit, now)
  return { day, week, budget, estimate, ...mayRun({ dayBudget: budget.tokens, spent: day, estimate, observation: parseObservation(observation), now }) }
}

/** One greppable line, then the detail. Dollars are always labelled; they are never the limit. */
export function formatReport(status) {
  const { day, week, budget, estimate, allowed, remaining, reason } = status
  const keyed = (s) => (s === 'mixed' ? 'requested and resolved ids' : `the ${s} id`)
  const models = Object.entries(day.models).map(([model, m]) => `${model} ${NUM(m.tokens)} in ${m.runs} run(s), keyed on ${keyed(m.source)}`)
  return [
    `LANE-BUDGET: allowed=${allowed ? 'yes' : 'no'} today=${day.tokens} budget=${budget.tokens} week=${week.tokens} remaining=${remaining} reviews=${Math.floor(remaining / estimate)}`,
    `today: ${day.runs} run(s), ${day.freeRuns} that never reached a model, ${day.skipped} malformed line(s) skipped${models.length ? ` · ${models.join(' · ')}` : ''}`,
    `week (trailing ${WEEK_DAYS} local days): ${NUM(week.tokens)} tokens ≈ $${week.usd.toFixed(2)} at list price, not a bill${week.unpriced ? ` (${week.unpriced} run(s) unpriced)` : ''}`,
    budget.clamped ? `budget: the configured value was clamped to the ${NUM(BURST_CEILING_TOKENS)}-token burst ceiling` : null,
    reason,
  ]
    .filter(Boolean)
    .join('\n')
}
