// Pure logic for the cursor-agent second opinion (#296, research in docs/harness/cursor-lane.md).
// No I/O — unit tested in second-opinion.logic.test.mjs. The runner lives in second-opinion.mjs.

const notImplemented = () => {
  throw new Error('not implemented')
}

export const DEFAULT_MODEL = ''
export const DENY_RULES = []
export const DIFF_TAG = 'untrusted-pr-diff'
export const EXIT = {}
export const MODEL_RATES = {}
export const AUDIT_FILE = ''
export const TIMEOUT_MS = 0
export const KILL_GRACE_MS = 0

export const reviewerConfig = notImplemented
export const buildPrompt = notImplemented
export const parseReview = notImplemented
export const costOf = notImplemented
export const ratesFor = notImplemented
export const totalTokens = notImplemented
export const refusedFlags = notImplemented
export const cursorArgs = notImplemented
export const extractRubric = notImplemented
export const readStream = notImplemented
export const assessDelivery = notImplemented
export const auditLine = notImplemented
export const formatSummaryLine = notImplemented
