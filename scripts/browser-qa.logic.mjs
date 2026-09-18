// Pure logic for the browser-qa check (ADR-0016): is a PR critical, which Playwright suites
// it needs, and the verdict from a Playwright JSON report. No I/O — unit tested in
// browser-qa.logic.test.mjs. The GitHub API and the runner live in scripts/browser-qa.mjs.

export const CRITICAL_PATHS = []
export const UI_PATHS = []
export const CRITICAL_LABEL = ''
export const SEVERITY_LABELS = []

const notImplemented = () => {
  throw new Error('not implemented')
}

export const isCriticalPath = notImplemented
export const isCritical = notImplemented
export const suitesFor = notImplemented
export const grepFor = notImplemented
export const decide = notImplemented
export const formatDecision = notImplemented
export const summarizeResults = notImplemented
export const verdict = notImplemented
export const formatVerdict = notImplemented
export const formatSummary = notImplemented
