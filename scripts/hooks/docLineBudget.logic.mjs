// Pure logic for the "AGENTS.md stays a table of contents" guard.
// No I/O — file contents are injected, so docLineBudget.logic.test.mjs runs on fixtures.
//
// Why: AGENTS.md is one of the first docs an agent reads (S13,
// docs/harness/reviews/2026-09-26/SYNTHESIS.md), and prose accumulates there once nothing stops
// it (#152). A budget keeps it a table of contents that points to the file owning each rule's
// full detail, rather than restating that detail itself.

/**
 * Docs with a hard line-count ceiling, keyed by exact repo-relative path. A doc opts in by being
 * listed here — this is not a general prose-length linter, just the one guarantee #152 asked for.
 */
export const LINE_BUDGETS = {
  'AGENTS.md': 120,
}

/** The number of lines in `text` — matches `wc -l`, except one higher (the stricter direction) when `text` has no final newline. */
export function countLines(text) {
  if (!text) return 0
  const trimmed = text.endsWith('\n') ? text.slice(0, -1) : text
  return trimmed === '' ? 0 : trimmed.split('\n').length
}

/**
 * Which budgeted files, among `files`, are over their limit.
 * @param {{path: string, text: string}[]} files
 * @param {Record<string, number>} [budgets]
 * @returns {{path: string, lines: number, limit: number}[]}
 */
export function findLineBudgetViolations(files, budgets = LINE_BUDGETS) {
  return files
    .filter((f) => Object.prototype.hasOwnProperty.call(budgets, f.path))
    .map((f) => ({ path: f.path, lines: countLines(f.text), limit: budgets[f.path] }))
    .filter((v) => v.lines > v.limit)
}

/** Render one `OVER BUDGET path: N lines (limit M)` per hit, for grep. */
export function formatLineBudgetViolations(violations) {
  if (!violations || violations.length === 0) return ''
  return violations.map((v) => `OVER BUDGET ${v.path}: ${v.lines} lines (limit ${v.limit})`).join('\n')
}
