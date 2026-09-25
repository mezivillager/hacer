// The one-line summaries the three required checks print — `HYGIENE:`, `BROWSER-QA:`, `LAYER-RATCHET:` — published
// where a program can read them without Actions log access (MC-6, #477). No I/O of its own: each check's script
// publishes through publishLine, and scripts/mission-control/collect.logic.mjs reads the lines back with
// parseCheckLine. Why a notice, and what it needs: docs/harness/mission-control.md § Checks.

/** Each required check, by the name its check run carries, and the prefix of the line it publishes. */
export const CHECK_LINES = Object.freeze({ 'pr-hygiene': 'HYGIENE', 'browser-qa': 'BROWSER-QA', ci: 'LAYER-RATCHET' })

/** A workflow command's message, escaped as the runner decodes it (the Actions toolkit's escapeData). */
const escapeData = (text) => text.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')

/**
 * Publishes the first line of a check's report when it runs in GitHub Actions: a `::notice` titled by the line's
 * prefix, which the runner stores as an annotation on the job's own check run — readable through the Checks API and
 * GraphQL, and written with no token permission at all — and the line in the job summary. Elsewhere it writes
 * nothing. Returns whether it published.
 * @param {string} report
 * @param {{env: Record<string, string|undefined>, log: (text: string) => void, append: (file: string, text: string) => void}} io
 */
export function publishLine(report, { env, log, append }) {
  const [line] = report.split('\n')
  const title = /^([A-Z][A-Z-]*): /.exec(line)?.[1]
  if (env.GITHUB_ACTIONS !== 'true' || !title) return false
  log(`::notice title=${title}::${escapeData(line)}`)
  if (env.GITHUB_STEP_SUMMARY) append(env.GITHUB_STEP_SUMMARY, `\n\`${line}\`\n`)
  return true
}

const value = (text) => (/^\d+$/.test(text) ? Number(text) : text)

/**
 * A published line as data: its `verdict` (PASS, WARN, FAIL or SKIPPED) and `fields`, its `key=value` pairs with
 * numbers as numbers. LAYER-RATCHET's line has no verdict word and no pairs: its fields are the `known` and `new`
 * counts, and its verdict is FAIL on any new violation, as layer-ratchet.mjs exits 1 on one.
 * @param {string|null} line
 */
export function parseCheckLine(line) {
  const ratchet = /^LAYER-RATCHET: (\d+) known violations? .* · (\d+) new$/.exec(line ?? '')
  if (ratchet) return { verdict: ratchet[2] === '0' ? 'PASS' : 'FAIL', fields: { known: Number(ratchet[1]), new: Number(ratchet[2]) } }
  const verdict = /^(?:HYGIENE|BROWSER-QA): (PASS|WARN|FAIL|skipped)\b/.exec(line ?? '')?.[1].toUpperCase() ?? null
  if (verdict === null) return { verdict, fields: {} }
  return { verdict, fields: Object.fromEntries([...line.matchAll(/\b(\w+)=(\S+)/g)].map(([, key, text]) => [key, value(text)])) }
}

/** GitHub's conclusions that mean the check failed; any other that is not SUCCESS is reported as itself. */
const FAILED = ['FAILURE', 'TIMED_OUT', 'STARTUP_FAILURE']

/**
 * A check run read as data: the line it published, parsed, under a verdict in which the run's conclusion wins. A run
 * that did not succeed never reads PASS — FAIL for a failure, its conclusion otherwise (CANCELLED, SKIPPED, …) — and
 * one still running has no verdict yet. On a success the line refines it (PASS, WARN, SKIPPED). `disagrees` marks a
 * line whose own verdict says otherwise than the conclusion — as LAYER-RATCHET's `0 new` does when `lint:layers`
 * fails on an undeclared rule (#489) — and the line's numbers are kept either way.
 * @param {{conclusion: string|null, line: string|null}} run
 */
export function readCheckRun({ conclusion, line }) {
  const { verdict: said, fields } = parseCheckLine(line)
  const verdict = conclusion === null ? null : conclusion === 'SUCCESS' ? said : FAILED.includes(conclusion) ? 'FAIL' : conclusion
  return { verdict, fields, disagrees: conclusion !== null && said !== null && (conclusion === 'SUCCESS') === (said === 'FAIL') }
}
