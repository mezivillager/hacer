// Pure logic for the layer ratchet (#329). No I/O — unit tested in layer-ratchet.logic.test.mjs;
// the cruise and the exit code live in layer-ratchet.mjs.
//
// HACER's three layers — pure logic ← state ← rendering — were a convention until now. The rules
// are in .dependency-cruiser.cjs; today's violations are in the known-violations baseline, which is
// only ever rewritten in dependency-cruiser's native `shrink-only` mode, so a violation that has
// been fixed can never come back. This module turns one cruise result into the verdict and the one
// line the foundation plan tracks.

export const CONFIG_FILE = '.dependency-cruiser.cjs'
export const KNOWN_VIOLATIONS_FILE = '.dependency-cruiser-known-violations.json'
/** ESLint's native bulk suppressions carry the half dependency-cruiser cannot see: `console.*` and
 *  DOM globals are globals, not dependencies, so no import graph contains them. */
export const ESLINT_SUPPRESSIONS_FILE = 'eslint-suppressions.json'
export const EXIT = { ok: 0, newViolations: 1, usage: 2 }

const isTest = (file) => /\.(test|spec)\.[^/]+$/.test(file) || file.startsWith('src/test/')
const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`

/**
 * How many distinct cycles the cycle rows describe. dependency-cruiser reports one row per cyclic
 * edge, so the audit's 7-file `store`↔`core` cycle arrives as 8 rows; two rows that share a module
 * are the same strongly-connected component (components partition the graph, so this cannot merge
 * two real cycles). Counting components keeps the metric comparable with the audit's Tarjan count.
 */
function countCycles(cycleViolations) {
  const parent = new Map()
  const find = (node) => {
    let root = node
    while (parent.get(root) !== root) root = parent.get(root)
    return root
  }
  for (const violation of cycleViolations) {
    const names = [violation.from, ...(violation.cycle ?? []).map((step) => step?.name ?? step)]
    for (const name of names) if (!parent.has(name)) parent.set(name, name)
    for (const name of names.slice(1)) {
      const [a, b] = [find(names[0]), find(name)]
      if (a !== b) parent.set(a, b)
    }
  }
  return new Set([...parent.keys()].map(find)).size
}

/**
 * Fold a dependency-cruiser JSON result (cruised with `--ignore-known`, which re-labels baselined
 * violations `ignore`) into the ratchet's verdict.
 * @param {object} result the parsed `--output-type json` payload
 * @param {{suppressedGlobals?: number}} [options]
 */
export function summarise(result, { suppressedGlobals = 0 } = {}) {
  const violations = result?.summary?.violations ?? []
  const known = violations.filter((violation) => violation.rule.severity === 'ignore')
  const added = violations.filter((violation) => violation.rule.severity !== 'ignore')
  const edges = known.filter((violation) => violation.type !== 'cycle')
  const cycleRows = known.filter((violation) => violation.type === 'cycle')

  return {
    known: known.length,
    added: added.length,
    production: edges.filter((violation) => !isTest(violation.from)).length,
    testOnly: edges.filter((violation) => isTest(violation.from)).length,
    cycleEdges: cycleRows.length,
    cycles: countCycles(cycleRows),
    byRule: known.reduce((counts, violation) => {
      counts[violation.rule.name] = (counts[violation.rule.name] ?? 0) + 1
      return counts
    }, {}),
    addedViolations: added.map((violation) => ({
      rule: violation.rule.name,
      from: violation.from,
      to: violation.to,
    })),
    suppressedGlobals,
    ok: added.length === 0,
  }
}

/** Red stub (#489): the rules the baseline records rows under that the config does not declare. */
export function undeclaredRules() {
  return []
}

/** Sum the per-file, per-rule counts in an `eslint-suppressions.json`. Unreadable is zero, never a
 *  throw: the guard prefers a false negative to blocking on its own bookkeeping. */
export function countSuppressions(text) {
  let parsed
  try {
    parsed = JSON.parse(String(text ?? ''))
  } catch {
    return 0
  }
  if (!parsed || typeof parsed !== 'object') return 0
  return Object.values(parsed)
    .flatMap((rules) => Object.values(rules ?? {}))
    .reduce((total, entry) => total + (Number(entry?.count) || 0), 0)
}

/** The one line the foundation plan tracks, plus what to do about anything new. */
export function formatReport(summary) {
  const lines = [
    `LAYER-RATCHET: ${plural(summary.known, 'known violation')} ` +
      `(${plural(summary.production, 'production edge')} · ${summary.testOnly} test-only · ` +
      `${plural(summary.cycleEdges, 'cycle edge')} in ${plural(summary.cycles, 'cycle')}) · ` +
      `${summary.suppressedGlobals} engine globals suppressed · ${summary.added} new`,
  ]
  const byRule = Object.entries(summary.byRule).sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
  if (byRule.length > 0) {
    lines.push(`  by rule: ${byRule.map(([rule, count]) => `${rule} ${count}`).join(' · ')}`)
  }
  for (const violation of summary.addedViolations) {
    lines.push(`  NEW  ${violation.rule}: ${violation.from} -> ${violation.to}`)
  }
  if (summary.addedViolations.length > 0) {
    lines.push(
      '  Fix the import: move the shared code down a layer, invert the dependency, or pass the',
      '  value in. The baseline only ever shrinks — a new violation cannot be recorded as known.',
    )
  }
  return lines.join('\n')
}
