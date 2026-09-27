// Pure logic for the "AGENTS.md stays a table of contents" guard.
// No I/O — file contents are injected, so docLineBudget.logic.test.mjs runs on fixtures.
//
// Why: AGENTS.md is one of the first docs an agent reads (S13,
// docs/harness/reviews/2026-09-26/SYNTHESIS.md), and prose accumulates there once nothing stops
// it (#152). A budget keeps it a table of contents that points to the file owning each rule's
// full detail, rather than restating that detail itself.
//
// Red stub (#152): compiles, not implemented yet.

/**
 * Docs with a hard line-count ceiling, keyed by exact repo-relative path. A doc opts in by being
 * listed here — this is not a general prose-length linter, just the one guarantee #152 asked for.
 */
export const LINE_BUDGETS = {
  'AGENTS.md': 120,
}

/** The number of lines in `text`, the same count `wc -l` reports for a file. */
export function countLines() {
  throw new Error('not implemented')
}

/**
 * Which budgeted files, among `files`, are over their limit.
 * @param {{path: string, text: string}[]} files
 * @param {Record<string, number>} [budgets]
 * @returns {{path: string, lines: number, limit: number}[]}
 */
export function findLineBudgetViolations() {
  throw new Error('not implemented')
}

/** Render one `OVER BUDGET path: N lines (limit M)` per hit, for grep. */
export function formatLineBudgetViolations() {
  throw new Error('not implemented')
}
