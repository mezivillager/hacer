import { describe, it, expect } from 'vitest'
import { EXIT } from './second-opinion.logic.mjs'
import {
  BURST_CEILING_TOKENS,
  DEFAULT_DAY_TOKENS,
  MEASURED_REVIEW_TOKENS,
  OBSERVATION_MAX_AGE_DAYS,
  formatReport,
  laneStatus,
  mayRun,
  modelOf,
  parseAudit,
  parseObservation,
  resolveDayBudget,
  spentThisWeek,
  spentToday,
} from './lane-budget.logic.mjs'

/** A local-time Date, so a test never depends on the machine's offset from UTC. */
const local = (y, m, d, h = 12, min = 0) => new Date(y, m - 1, d, h, min, 0, 0)

/** One audit row, in the shape `auditLine()` writes (second-opinion.logic.mjs). */
const row = ({ at, tokens = MEASURED_REVIEW_TOKENS, exitCode = 0, resolvedModel = null, usd = 0.1 }) =>
  JSON.stringify({
    at: at.toISOString(),
    pr: 305,
    requestedModel: 'composer-2.5',
    resolvedModel,
    usage: { inputTokens: tokens, cacheReadTokens: 0, cacheWriteTokens: 0, outputTokens: 0 },
    wallMs: 170_000,
    exitCode,
    verdict: 'PASS',
    cost: { usd, currency: 'USD', pricedAs: 'composer-2.5', note: 'list price, not a bill' },
  })

const NOW = local(2026, 9, 21, 14, 30)
const FRESH = JSON.stringify({ readAt: '2026-09-21', includedTokens: 43_600_000, onDemandUsd: 0 })

describe('parseAudit', () => {
  it('reads one row per line and ignores blank lines', () => {
    const { rows, skipped } = parseAudit(`${row({ at: NOW })}\n\n${row({ at: NOW })}\n`)
    expect(rows).toHaveLength(2)
    expect(skipped).toBe(0)
  })

  it('skips a malformed line and counts it instead of throwing — the file is append-only', () => {
    // A killed run can leave half a line behind; the day's ration must still be readable.
    const { rows, skipped } = parseAudit(`{"at":"nope`.concat('\n', row({ at: NOW }), '\n', 'not json\n', '"a string"\n'))
    expect(rows).toHaveLength(1)
    expect(skipped).toBe(3)
  })

  it('treats a row without a readable timestamp as malformed rather than as today', () => {
    expect(parseAudit('{"at":"whenever","usage":{"inputTokens":9}}\n')).toEqual({ rows: [], skipped: 1 })
    expect(parseAudit('')).toEqual({ rows: [], skipped: 0 })
    expect(parseAudit(null)).toEqual({ rows: [], skipped: 0 })
  })
})

describe('modelOf', () => {
  it('keys a row on the requested model when the CLI resolved none, and says which it used', () => {
    // Verified on the first live run (2026-09-21): the real result frame carries no model id under
    // `model`, `modelId` or `selectedModel`, so every row of this lane is keyed on the request.
    expect(modelOf({ requestedModel: 'composer-2.5', resolvedModel: null })).toEqual({ model: 'composer-2.5', source: 'requested' })
    expect(modelOf({ requestedModel: 'composer-2.5', resolvedModel: 'composer-2.5-fast' })).toEqual({
      model: 'composer-2.5-fast',
      source: 'resolved',
    })
  })
})

describe('spentToday', () => {
  it('sums the usage 4-tuple of every row that falls in the machine local day', () => {
    const spent = spentToday([row({ at: local(2026, 9, 21, 9) }), row({ at: local(2026, 9, 21, 13) })].join('\n'), NOW)
    expect(spent.tokens).toBe(2 * MEASURED_REVIEW_TOKENS)
    expect(spent.runs).toBe(2)
    expect(spent.usd).toBeCloseTo(0.2, 10)
  })

  it('starts the day at local midnight, so yesterday evening does not count against today', () => {
    const lines = [row({ at: local(2026, 9, 20, 23, 59) }), row({ at: local(2026, 9, 21, 0, 1) })].join('\n')
    expect(spentToday(lines, NOW).tokens).toBe(MEASURED_REVIEW_TOKENS)
    expect(spentToday(lines, local(2026, 9, 20, 23, 59)).tokens).toBe(MEASURED_REVIEW_TOKENS)
  })

  it('does not count a run that never reached a model, because its row carries no tokens', () => {
    // exit 6 with an empty usage 4-tuple: a rejected config costs nothing and must not eat the day.
    const spent = spentToday([row({ at: NOW, tokens: 0, exitCode: EXIT.unverified, usd: null })].join('\n'), NOW)
    expect(spent.tokens).toBe(0)
    expect(spent.freeRuns).toBe(1)
  })

  it('still counts an exit-6 run that did spend tokens — unverified delivery is not free', () => {
    // EXIT.unverified also means "could not read git status after the run", which happens *after*
    // the model was paid. Filtering on the exit code alone would under-count the day.
    const spent = spentToday(row({ at: NOW, exitCode: EXIT.unverified }), NOW)
    expect(spent.tokens).toBe(MEASURED_REVIEW_TOKENS)
    expect(spent.freeRuns).toBe(0)
  })

  it('reports the per-model split and records that the spend was keyed on the requested id', () => {
    const spent = spentToday([row({ at: NOW }), row({ at: NOW, resolvedModel: 'composer-2.5' })].join('\n'), NOW)
    expect(spent.models['composer-2.5']).toEqual({ tokens: 2 * MEASURED_REVIEW_TOKENS, runs: 2, source: 'mixed' })
    expect(spentToday(row({ at: NOW }), NOW).models['composer-2.5'].source).toBe('requested')
  })

  it('leaves an unpriced row out of the dollar column and counts it, rather than calling it free', () => {
    const spent = spentToday([row({ at: NOW }), row({ at: NOW, usd: null })].join('\n'), NOW)
    expect(spent.usd).toBeCloseTo(0.1, 10)
    expect(spent.unpriced).toBe(1)
  })
})

describe('spentThisWeek', () => {
  it('sums the trailing seven local days and leaves the eighth out', () => {
    const lines = [0, 1, 6, 7].map((back) => row({ at: local(2026, 9, 21 - back, 10) })).join('\n')
    expect(spentThisWeek(lines, NOW).runs).toBe(3)
    expect(spentThisWeek(lines, NOW).tokens).toBe(3 * MEASURED_REVIEW_TOKENS)
  })
})

describe('resolveDayBudget', () => {
  it('defaults to 6M tokens a day — the measured weekly rate divided by seven', () => {
    expect(DEFAULT_DAY_TOKENS).toBe(6_000_000)
    expect(resolveDayBudget()).toEqual({ tokens: DEFAULT_DAY_TOKENS, source: 'default', clamped: false })
    expect(Math.floor(DEFAULT_DAY_TOKENS / MEASURED_REVIEW_TOKENS)).toBe(17)
  })

  it('clamps any configured budget to the 12M burst ceiling, so one day cannot eat three', () => {
    // The 2026-09-21 research burst spent ~17M tokens in 40 minutes: about three days of even use.
    expect(resolveDayBudget(17_000_000)).toEqual({ tokens: BURST_CEILING_TOKENS, source: 'configured', clamped: true })
    expect(resolveDayBudget(9_000_000)).toEqual({ tokens: 9_000_000, source: 'configured', clamped: false })
  })

  it('falls back to the default for a value that is not a usable number', () => {
    for (const bad of ['', 'lots', -1, 0, Number.NaN]) expect(resolveDayBudget(bad).tokens).toBe(DEFAULT_DAY_TOKENS)
    expect(resolveDayBudget('9000000').tokens).toBe(9_000_000)
  })
})

describe('parseObservation', () => {
  it('reads the dashboard reading and rejects one that is not usable', () => {
    expect(parseObservation(FRESH)).toMatchObject({ readAt: '2026-09-21', onDemandUsd: 0 })
    expect(parseObservation('{oops')).toBeNull()
    expect(parseObservation(null)).toBeNull()
    expect(parseObservation('{"readAt":"2026-09-21"}')).toBeNull() // no on-demand figure is no reading
  })
})

describe('mayRun', () => {
  const base = { spent: spentToday(row({ at: NOW }), NOW), observation: parseObservation(FRESH), now: NOW }

  it('allows a run while the day ration still covers one more review', () => {
    const verdict = mayRun(base)
    expect(verdict.allowed).toBe(true)
    expect(verdict.remaining).toBe(DEFAULT_DAY_TOKENS - MEASURED_REVIEW_TOKENS)
  })

  it('refuses once one more review would take the day past its ration', () => {
    const spent = spentToday(row({ at: NOW, tokens: DEFAULT_DAY_TOKENS - 1_000 }), NOW)
    const verdict = mayRun({ ...base, spent })
    expect(verdict).toMatchObject({ allowed: false, code: 'spent' })
    expect(verdict.reason).toContain('ration')
  })

  it('refuses while the dashboard shows any on-demand usage, whatever the day has spent', () => {
    // The hard guard is the "Included" label, not an estimate: never spill into on-demand silently.
    const observation = parseObservation(JSON.stringify({ readAt: '2026-09-21', onDemandUsd: 0.4 }))
    expect(mayRun({ ...base, observation })).toMatchObject({ allowed: false, code: 'on-demand' })
  })

  it('refuses when no dashboard reading is on file, or the last one is older than a week', () => {
    expect(mayRun({ ...base, observation: null })).toMatchObject({ allowed: false, code: 'unconfirmed' })
    const stale = parseObservation(JSON.stringify({ readAt: '2026-09-21', onDemandUsd: 0 }))
    const later = local(2026, 9, 21 + OBSERVATION_MAX_AGE_DAYS + 1, 14)
    expect(mayRun({ ...base, observation: stale, now: later })).toMatchObject({ allowed: false, code: 'unconfirmed' })
  })

  it('does not roll unused ration over: an idle yesterday buys nothing today', () => {
    const lines = [row({ at: local(2026, 9, 20, 10) }), row({ at: NOW, tokens: DEFAULT_DAY_TOKENS })].join('\n')
    expect(mayRun({ ...base, spent: spentToday(lines, NOW) }).allowed).toBe(false)
  })
})

describe('laneStatus and formatReport', () => {
  it('reports today, the trailing week, the remaining ration and the verdict from the two raw files', () => {
    const audit = [row({ at: local(2026, 9, 19, 10) }), row({ at: NOW })].join('\n')
    const status = laneStatus({ audit, observation: FRESH, now: NOW })
    expect(status.day.tokens).toBe(MEASURED_REVIEW_TOKENS)
    expect(status.week.tokens).toBe(2 * MEASURED_REVIEW_TOKENS)
    expect(status.budget.tokens).toBe(DEFAULT_DAY_TOKENS)
    expect(status.allowed).toBe(true)

    const report = formatReport(status)
    expect(report.split('\n')[0]).toBe(
      `LANE-BUDGET: allowed=yes today=${MEASURED_REVIEW_TOKENS} budget=${DEFAULT_DAY_TOKENS} week=${2 * MEASURED_REVIEW_TOKENS} remaining=${DEFAULT_DAY_TOKENS - MEASURED_REVIEW_TOKENS} reviews=16`,
    )
    expect(report).toContain('list price, not a bill')
  })

  it('refuses with no reading on file, and never reports a negative remainder', () => {
    const status = laneStatus({ audit: row({ at: NOW, tokens: 9_000_000 }), observation: null, now: NOW })
    expect(status).toMatchObject({ allowed: false, code: 'unconfirmed', remaining: 0 })
    expect(formatReport(status)).toContain('allowed=no')
  })

  it('gives "ration spent" its own exit code, distinct from every other second-opinion code', () => {
    // The lane is skipped and the coordinator proceeds without it — never a fall-back that bills.
    expect(EXIT.rationSpent).toBe(7)
    expect(new Set(Object.values(EXIT)).size).toBe(Object.values(EXIT).length)
  })
})
