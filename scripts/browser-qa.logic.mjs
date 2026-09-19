// Pure logic for the browser-qa check (ADR-0016): is a PR critical, which Playwright suites
// it needs, and the verdict from a Playwright JSON report. No I/O — unit tested in
// browser-qa.logic.test.mjs. The GitHub API and the runner live in scripts/browser-qa.mjs.

// ---------------------------------------------------------------- what is critical

/**
 * Work that changes the UI (ADR-0016, amended 2026-09-19 by #282). A trailing slash is a directory
 * prefix; otherwise exact. `src/simulation/` and `src/core/` stay out — the conformance oracle
 * covers them. `src/surfaces/` is listed ahead of its first file, the 2D surface.
 */
export const CRITICAL_PATHS = [
  'src/components/',
  'src/App.tsx',
  'src/gates/',
  'src/nodes/',
  'src/store/',
  'src/utils/',
  'src/styles/',
  'index.html',
  'e2e/',
  'playwright.config.ts',
  'src/surfaces/',
]

export const CRITICAL_LABEL = 'critical'
export const SEVERITY_LABELS = ['sev:high', 'sev:critical']

const matchesAny = (filename, paths) => paths.some((p) => (p.endsWith('/') ? filename.startsWith(p) : filename === p))

export function isCriticalPath(filename) {
  return matchesAny(filename, CRITICAL_PATHS)
}

const criticalLabels = (labels) => labels.filter((l) => l === CRITICAL_LABEL || SEVERITY_LABELS.includes(l))

export function isCritical(filenames, labels, linkedIssues = []) {
  return decide(filenames, labels, linkedIssues).critical
}

/**
 * Always `['store']` — the caller gates on isCritical. `@ui` mounts the 3D canvas, and 3D browser
 * testing is far-future research (#284): it never runs automatically, only by hand via `e2e.yml`.
 * The file list stays the seam for a suite picked by path, such as a future 2D-surface suite.
 */
export function suitesFor(_filenames) {
  return ['store']
}

/** Playwright `--grep` pattern for the suites, e.g. `@store`; several join with `|`. */
export function grepFor(suites) {
  return suites.map((s) => `@${s}`).join('|')
}

/**
 * @param {string[]} filenames  the PR's files, renames by old and new path (GET …/pulls/{n}/files)
 * @param {string[]} labels     the PR's labels
 * @param {{number:number, labels:string[]}[]} linkedIssues  issues the body links, with their labels
 * @returns {{critical:boolean, reasons:string[], suites:string[]}}
 */
export function decide(filenames, labels, linkedIssues = []) {
  const reasons = [
    ...filenames.filter(isCriticalPath).map((f) => `path ${f}`),
    ...criticalLabels(labels).map((l) => `label ${l}`),
    ...linkedIssues.flatMap((issue) => criticalLabels(issue.labels).map((l) => `issue #${issue.number} ${l}`)),
  ]
  const critical = reasons.length > 0
  return { critical, reasons, suites: critical ? suitesFor(filenames) : [] }
}

// ---------------------------------------------------------------- the verdict

const count = (n) => (Number.isInteger(n) && n > 0 ? n : 0)

/**
 * Counts from a Playwright JSON report (`--reporter=json`). `flaky` passed on a retry.
 * @returns {{passed:number, failed:number, flaky:number, skipped:number, errors:number}}
 */
export function summarizeResults(report) {
  const stats = report && typeof report.stats === 'object' && report.stats !== null ? report.stats : {}
  return {
    passed: count(stats.expected),
    failed: count(stats.unexpected),
    flaky: count(stats.flaky),
    skipped: count(stats.skipped),
    errors: Array.isArray(report?.errors) ? report.errors.length : 0,
  }
}

/** PASS only when tests ran, none failed and the runner raised no error — a vacuous run is a FAIL. */
export function verdict(summary) {
  if (summary.failed > 0) return { verdict: 'FAIL', reason: `${summary.failed} failed` }
  if (summary.errors > 0) return { verdict: 'FAIL', reason: `${summary.errors} runner errors` }
  if (summary.passed + summary.flaky === 0) return { verdict: 'FAIL', reason: 'no tests ran' }
  return { verdict: 'PASS', reason: null }
}

// ---------------------------------------------------------------- output

/** One greppable `BROWSER-QA:` line for the decision step. */
export function formatDecision(decision) {
  if (!decision.critical) return 'BROWSER-QA: skipped (no critical paths)'
  return `BROWSER-QA: critical suites=${decision.suites.join(',')} — ${decision.reasons.join(', ')}`
}

/** One greppable `BROWSER-QA:` line for the verdict step. */
export function formatVerdict(suites, summary) {
  const { verdict: v, reason } = verdict(summary)
  const counts = `passed=${summary.passed} failed=${summary.failed} flaky=${summary.flaky} skipped=${summary.skipped}`
  return `BROWSER-QA: ${v} suites=${suites.join(',')} ${counts}${reason ? ` (${reason})` : ''}`
}

/** Markdown for $GITHUB_STEP_SUMMARY: the decision alone, or the decision plus the verdict. */
export function formatSummary(decision, summary) {
  if (!decision.critical) {
    return ['## browser-qa: skipped', '', 'Touches no critical paths (ADR-0016) and carries no `critical` / `sev:*` label.', ''].join('\n')
  }
  const suites = decision.suites.join(',')
  const why = `Why: ${decision.reasons.join(', ')}`
  if (!summary) return ['## browser-qa: critical', '', `Suites: ${suites}`, why, ''].join('\n')
  const { verdict: v, reason } = verdict(summary)
  return [
    `## browser-qa: ${v}`,
    '',
    why,
    '',
    '| Suites | Passed | Failed | Flaky | Skipped |',
    '|---|---|---|---|---|',
    `| ${suites} | ${summary.passed} | ${summary.failed} | ${summary.flaky} | ${summary.skipped} |`,
    '',
    ...(reason ? [`Reason: ${reason}`, ''] : []),
  ].join('\n')
}
