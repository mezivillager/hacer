// Pure logic for the daily Cursor ration (#302). No I/O — unit tested in lane-budget.logic.test.mjs;
// the reporter lives in lane-budget.mjs and the guarded call site in second-opinion.mjs.
//
// Stub: red commit. Every export returns a sentinel so the suite fails on its assertions.

export const DEFAULT_DAY_TOKENS = 0
export const BURST_CEILING_TOKENS = 0
export const MEASURED_REVIEW_TOKENS = 1
export const OBSERVATION_MAX_AGE_DAYS = 0
export const WEEK_DAYS = 7
export const OBSERVATION_FILE = 'docs/harness/cursor-usage.json'

const EMPTY = { tokens: 0, runs: 0, freeRuns: 0, skipped: 0, unpriced: 0, usd: 0, models: {} }

export const parseAudit = () => ({ rows: [], skipped: 0 })
export const modelOf = () => ({ model: null, source: 'requested' })
export const spentToday = () => ({ ...EMPTY })
export const spentThisWeek = () => ({ ...EMPTY })
export const resolveDayBudget = () => ({ tokens: 0, source: 'default', clamped: false })
export const parseObservation = () => null
export const mayRun = () => ({ allowed: false, code: 'unimplemented', reason: 'not implemented', remaining: 0 })
export const laneStatus = () => ({ day: { ...EMPTY }, week: { ...EMPTY }, budget: resolveDayBudget(), estimate: 0, ...mayRun() })
export const formatReport = () => 'not implemented'
