// Pure logic for the daily Cursor ration (#302). No I/O — unit tested in lane-budget.logic.test.mjs;
// the report lives in lane-budget.mjs and the guarded call site in second-opinion.mjs.
//
// The ration is in TOKENS, not dollars. Read in a browser on 2026-09-21: cursor.com/dashboard/usage
// (Pro+) reports tokens per event, each row typed "Included in Pro Plus", and an on-demand total of
// zero. That page publishes no weekly quota meter and no dollar pool, so "% of weekly" has no
// denominator and nothing here invents one. Dollars are only the list-price comparison column
// costOf() already computes — never a bill, never a limit.
// The policy, and how to re-read the dashboard: docs/harness/usage-rationing.md.

import { totalTokens } from './second-opinion.logic.mjs'

/** 43.6M included tokens over Sep 15–21 ÷ 7 days. Measured, not assumed. */
export const DEFAULT_DAY_TOKENS = 6_000_000

/** No single day may take more than two rations, however the budget is configured: the 2026-09-21
 *  research burst spent ~17M tokens in 40 minutes — three days of even use — and is what this stops. */
export const BURST_CEILING_TOKENS = 12_000_000

/** The first live lane run (#305): 347,838 tokens, ≈$0.10 at list price, 170 s, 84% cache reads.
 *  The default estimate of "one more review", because it was measured. */
export const MEASURED_REVIEW_TOKENS = 347_838

/** How long a dashboard reading stays good. No supported API exposes those numbers, so the guard is
 *  only ever as fresh as the last read by hand or by a browser. */
export const OBSERVATION_MAX_AGE_DAYS = 7

/** The trailing window `spentThisWeek` reports — the seven days the ration was divided out of. It is
 *  a rate, not a limit: Cursor publishes no weekly denominator to compare it against. */
export const WEEK_DAYS = 7

/** Where the dashboard reading is kept: in the repo, so every re-read is a reviewable commit. */
export const OBSERVATION_FILE = 'docs/harness/cursor-usage.json'

const NUM = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const parseJson = (text) => {
  try {
    return JSON.parse(String(text ?? ''))
  } catch {
    return null
  }
}

/** Local midnight, shifted by whole days — `setDate`, not arithmetic on milliseconds, so a DST
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

/**
 * One row per line, in the shape `auditLine()` writes. A malformed line is skipped and counted,
 * never fatal: the file is append-only and a killed run can leave half a line behind.
 * @returns {{rows:object[], skipped:number}}
 */
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

/** Which model a row is keyed on. `resolvedModel` is null for this lane — verified on the first live
 *  run: the result frame carries no model id under any name — so spend is normally keyed on the
 *  *requested* id, and `source` records that rather than hiding it. */
export const modelOf = (row) =>
  row?.resolvedModel ? { model: row.resolvedModel, source: 'resolved' } : { model: row?.requestedModel ?? null, source: 'requested' }

/**
 * Tokens are the ration; dollars ride along for comparison. A row with no tokens is a run that never
 * reached a model (a rejected config costs nothing) and is counted apart — but the filter is the
 * measured *usage*, never the exit code, because EXIT.unverified also covers "could not read
 * git status after the run", which happens long after the model was paid.
 */
function summarise(rows, skipped) {
  const out = { tokens: 0, runs: 0, freeRuns: 0, skipped, unpriced: 0, usd: 0, models: {} }
  for (const row of rows) {
    const tokens = totalTokens(row.usage)
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

/**
 * May one more lane run start? Checked in this order, because a spill into on-demand billing matters
 * whatever the day has spent, and an unconfirmed reading is not a guard at all.
 * @returns {{allowed:boolean, code:string, reason:string, remaining:number}}
 */
export function mayRun({ dayBudget = DEFAULT_DAY_TOKENS, spent, estimate = MEASURED_REVIEW_TOKENS, observation = null, now = new Date() } = {}) {
  const used = spent?.tokens ?? 0
  const remaining = Math.max(0, dayBudget - used)
  const refuse = (code, reason) => ({ allowed: false, code, reason, remaining })

  if (!observation) return refuse('unconfirmed', `no Cursor dashboard reading on file (${OBSERVATION_FILE}) — included usage cannot be confirmed`)
  const age = ageInDays(observation, now)
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
  const keyed = (source) => (source === 'mixed' ? 'keyed on requested and resolved ids' : `keyed on the ${source} id`)
  const models = Object.entries(day.models).map(([model, m]) => `${model} ${NUM(m.tokens)} in ${m.runs} run(s), ${keyed(m.source)}`)
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
