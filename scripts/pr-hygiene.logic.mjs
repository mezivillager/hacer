// Pure logic for the pr-hygiene check (ADR-0013): linked issue + size budget.
// No I/O — fully unit tested in pr-hygiene.logic.test.mjs. The GitHub API and
// the runner environment live in scripts/pr-hygiene.mjs.

export const WARN_LINES = 200
export const FAIL_LINES = 400
export const WARN_FILES = 15
export const OVERRIDE_LABEL = 'size-override'

const notImplemented = () => {
  throw new Error('not implemented')
}

export const RULES = []

export const parseGeneratedPatterns = notImplemented
export const classifyFile = notImplemented
export const measure = notImplemented
export const findLinkedIssues = notImplemented
export const isDocsOnly = notImplemented
export const evaluate = notImplemented
export const nextPageUrl = notImplemented
export const formatConsole = notImplemented
export const formatSummary = notImplemented
